import { BOX_TYPE_LABELS, COLD_ROOM_CAPACITY, COLD_STORAGE_ROOMS } from "@/types";
import type { ColdStorageReceipt } from "@/types";

export interface AllocationDraft {
  roomNumber: string;
  brandName: string;
  boxType: string;
  boxCount: number;
}

export function acceptedBoxes(receipt: ColdStorageReceipt): number {
  return Math.max(0, (receipt.verifiedBoxCount ?? receipt.dispatchedTotalBoxes ?? 0)
    - (receipt.qualityReport?.damageBox ?? 0));
}

export function validateAllocationDrafts(rows: AllocationDraft[], expectedTotal: number): void {
  if (!rows.length) throw new Error("Add at least one room allocation.");
  for (const row of rows) {
    if (!COLD_STORAGE_ROOMS.includes(row.roomNumber) || !row.brandName.trim() ||
        !Object.prototype.hasOwnProperty.call(BOX_TYPE_LABELS, row.boxType) ||
        !Number.isSafeInteger(row.boxCount) || row.boxCount <= 0) {
      throw new Error("Each row needs a room, brand, box size and positive whole box count.");
    }
  }
  const total = rows.reduce((sum, row) => sum + row.boxCount, 0);
  if (!Number.isSafeInteger(total) || total !== expectedTotal) {
    throw new Error(`Allocate exactly ${expectedTotal} accepted boxes (received minus damaged).`);
  }
}

/** Split the supplied brand/size lines without changing their quantities. */
export function distributeAllocationRows(
  rows: AllocationDraft[],
  occupied: Record<string, number>,
): AllocationDraft[] {
  const free = new Map(COLD_STORAGE_ROOMS.map(room => [room,
    Math.max(0, COLD_ROOM_CAPACITY - (occupied[room] ?? 0))]));
  const result: AllocationDraft[] = [];
  for (const row of rows) {
    if (!Number.isSafeInteger(row.boxCount) || row.boxCount <= 0) {
      throw new Error("Enter a positive whole box count for every row.");
    }
    let remaining = row.boxCount;
    for (const roomNumber of COLD_STORAGE_ROOMS) {
      const available = free.get(roomNumber) ?? 0;
      const count = Math.min(remaining, available);
      if (count > 0) result.push({ ...row, roomNumber, boxCount: count });
      free.set(roomNumber, available - count);
      remaining -= count;
      if (remaining === 0) break;
    }
    if (remaining > 0) throw new Error("Not enough room capacity. Free space in another room before allocating; no rows were changed.");
  }
  return result;
}
