import { Prisma } from "@prisma/client";
import { COLD_ROOM_CAPACITY, COLD_STORAGE_ROOMS } from "@/types";
import { parseBoxType } from "@/lib/box-type";

export class AllocationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function parseAllocationRows(input: unknown) {
  if (!Array.isArray(input) || input.length === 0) {
    throw new AllocationError("Add at least one room allocation.");
  }
  return input.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new AllocationError("Invalid allocation row.");
    const row = value as Record<string, unknown>;
    const boxType = parseBoxType(row.boxType);
    if (typeof row.roomNumber !== "string" || !COLD_STORAGE_ROOMS.includes(row.roomNumber) ||
        typeof row.brandName !== "string" || !row.brandName.trim() || !boxType ||
        typeof row.boxCount !== "number" || !Number.isSafeInteger(row.boxCount) || row.boxCount <= 0) {
      throw new AllocationError("Each row needs a valid room, brand, box size and positive whole box count.");
    }
    return { roomNumber: row.roomNumber, brandName: row.brandName.trim(), boxType, boxCount: row.boxCount };
  });
}

/** Caller must use Serializable isolation: occupancy reads and writes form one unit. */
export async function allocateRooms(tx: Prisma.TransactionClient, receiptId: string, rows: ReturnType<typeof parseAllocationRows>) {
  const receipt = await tx.coldStorageReceipt.findUnique({
    where: { id: receiptId }, include: { allocations: true, qualityReport: true },
  });
  if (!receipt) throw new AllocationError("Receipt not found.", 404);
  if (receipt.status === "DISPATCHED" || receipt.verifiedBoxCount === null) {
    throw new AllocationError("Verify receipt before allocating rooms.");
  }
  if (receipt.allocations.some(a => a.shippedBoxes > 0)) {
    throw new AllocationError("Stock has already shipped from this receipt. Reallocation is blocked to prevent recreating shipped boxes.", 409);
  }
  const accepted = receipt.verifiedBoxCount - (receipt.qualityReport?.damageBox ?? 0);
  const total = rows.reduce((sum, row) => sum + row.boxCount, 0);
  if (!Number.isSafeInteger(total) || total !== accepted) {
    throw new AllocationError(`Allocate exactly ${accepted} accepted boxes (received minus damaged).`);
  }
  const otherStock = await tx.coldRoomAllocation.groupBy({
    by: ["roomNumber"], where: { receiptId: { not: receiptId } }, _sum: { boxCount: true },
  });
  const requested = new Map<string, number>();
  for (const row of rows) requested.set(row.roomNumber, (requested.get(row.roomNumber) ?? 0) + row.boxCount);
  for (const [room, count] of requested) {
    const used = otherStock.find(r => r.roomNumber === room)?._sum.boxCount ?? 0;
    const free = Math.max(0, COLD_ROOM_CAPACITY - used);
    if (count > free) throw new AllocationError(`${room} has ${free} boxes free; ${count} requested. Allocate the balance to another room.`, 409);
  }
  await tx.coldRoomAllocation.deleteMany({ where: { receiptId } });
  return tx.coldStorageReceipt.update({
    where: { id: receiptId },
    data: { status: "ALLOCATED_TO_ROOMS", allocatedAt: new Date(), allocations: { create: rows } },
    include: { allocations: true, qualityReport: true },
  });
}
