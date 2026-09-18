import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

/* ────────────────────────────────────────────────────────────────
 * Container Dispatch (Out-flow)
 *
 *   PENDING_LOADING   Cold storage receives the load list on its dashboard
 *   LOADED            Cold storage confirms "Loading Complete"
 *   PLUGIN_COOLING    Admin chose "Plug In" for N hours — DISPATCH is
 *                     hard-blocked until pluginReadyAt passes
 *   READY_TO_DISPATCH Cooling window elapsed (auto-promoted on read)
 *   DISPATCHED        Cold storage dispatched sealed, with papers
 * ──────────────────────────────────────────────────────────────── */

import { parseBoxType } from "@/lib/box-type";
import type { BoxType } from "@prisma/client";

type ItemInput = { boxType: BoxType; brandName: string; quantity: number };

function parseItems(raw: unknown): ItemInput[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const items: ItemInput[] = [];
  for (const value of raw) {
    if (!value || typeof value !== "object") return [];
    const rec = value as Record<string, unknown>;
    const boxType = parseBoxType(rec.boxType);
    if (!boxType || typeof rec.brandName !== "string" || !rec.brandName.trim() ||
        typeof rec.quantity !== "number" || !Number.isSafeInteger(rec.quantity) || rec.quantity <= 0) return [];
    items.push({ boxType, brandName: rec.brandName.trim(), quantity: rec.quantity });
  }
  return items;
}

// GET /api/container-dispatch — List containers, auto-promoting elapsed plug-ins
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.containerDispatch.updateMany({
      where: { status: "PLUGIN_COOLING", pluginReadyAt: { lte: new Date() } },
      data: { status: "READY_TO_DISPATCH" },
    });

    const dispatches = await prisma.containerDispatch.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take: 200,
    });

    return NextResponse.json({ dispatches });
  } catch (error) {
    console.error("GET /api/container-dispatch error:", error);
    return NextResponse.json({ error: "Failed to fetch container dispatches" }, { status: 500 });
  }
}

// POST /api/container-dispatch — Admin raises a new container load request
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { containerNo, sealNumber, vehicleNo, mobMobile } = body as Record<string, string>;

    if (!containerNo?.trim() || !sealNumber?.trim() || !vehicleNo?.trim() || !mobMobile?.trim()) {
      return NextResponse.json(
        { error: "Container No, Seal, Vehicle No and Mobile are all required" },
        { status: 400 }
      );
    }

    const items = parseItems(body.items);
    if (items.length === 0) {
      return NextResponse.json(
        { error: "Add at least one box type with a brand and quantity to load" },
        { status: 400 }
      );
    }

    const created = await prisma.containerDispatch.create({
      data: {
        containerNo: containerNo.trim(),
        sealNumber: sealNumber.trim(),
        vehicleNo: vehicleNo.trim(),
        mobMobile: mobMobile.trim(),
        status: "PENDING_LOADING",
        createdById: payload.userId || null,
        items: {
          create: items.map((i) => ({
            boxType: i.boxType as never,
            brandName: i.brandName,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, dispatch: created });
  } catch (error) {
    console.error("POST /api/container-dispatch error:", error);
    return NextResponse.json({ error: "Failed to create container dispatch" }, { status: 500 });
  }
}

// PATCH /api/container-dispatch — LOADING_COMPLETE / PLUG_IN / DISPATCH
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (
      !payload ||
      (payload.role !== "MAIN_ADMIN" &&
        payload.role !== "OFFICE_ADMIN" &&
        payload.role !== "COLD_STORAGE_ADMIN")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, dispatchId, pluginHours } = body as {
      action: string;
      dispatchId: string;
      pluginHours?: number;
    };

    if ((action === "PLUG_IN" || action === "ALLOW_DISPATCH") &&
        payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN") {
      return NextResponse.json({ error: "Only Main or Office Admin can approve dispatch or cooling" }, { status: 403 });
    }

    if (!dispatchId) return NextResponse.json({ error: "dispatchId is required" }, { status: 400 });

    const existing = await prisma.containerDispatch.findUnique({
      where: { id: dispatchId },
      include: { items: true },
    });
    if (!existing) return NextResponse.json({ error: "Container not found" }, { status: 404 });

    /* Cold storage confirms the physical loading is finished */
    if (action === "LOADING_COMPLETE") {
      if (existing.status !== "PENDING_LOADING") {
        return NextResponse.json(
          { error: `Loading already confirmed (status: ${existing.status})` },
          { status: 400 }
        );
      }
      const updated = await prisma.containerDispatch.update({
        where: { id: dispatchId },
        data: { status: "LOADED", loadedAt: new Date() },
        include: { items: true },
      });
      return NextResponse.json({ success: true, dispatch: updated });
    }

    /* Admin chooses "Plug In" — start the hard-blocked cooling timer */
    if (action === "PLUG_IN") {
      const hours = Number(pluginHours);
      if (!hours || hours <= 0) {
        return NextResponse.json({ error: "Enter the plug-in duration in hours" }, { status: 400 });
      }
      if (existing.status !== "LOADED") {
        return NextResponse.json(
          { error: "Plug-in can only be applied after loading is confirmed" },
          { status: 400 }
        );
      }
      const now = new Date();
      const updated = await prisma.containerDispatch.update({
        where: { id: dispatchId },
        data: {
          status: "PLUGIN_COOLING",
          pluginHours: Math.round(hours),
          pluginStartedAt: now,
          pluginReadyAt: new Date(now.getTime() + hours * 3_600_000),
        },
        include: { items: true },
      });
      return NextResponse.json({ success: true, dispatch: updated });
    }

    /* Admin / Office grants immediate dispatch permission (no plug-in cooling) */
    if (action === "ALLOW_DISPATCH") {
      if (existing.status !== "LOADED") {
        return NextResponse.json(
          { error: "Dispatch permission can only be granted after loading is confirmed" },
          { status: 400 }
        );
      }
      const updated = await prisma.containerDispatch.update({
        where: { id: dispatchId },
        data: { status: "READY_TO_DISPATCH" },
        include: { items: true },
      });
      return NextResponse.json({ success: true, dispatch: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/container-dispatch error:", error);
    return NextResponse.json({ error: "Failed to update container dispatch" }, { status: 500 });
  }
}

// PUT /api/container-dispatch — Cold storage dispatches the sealed container
export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (
      !payload ||
      (payload.role !== "MAIN_ADMIN" &&
        payload.role !== "OFFICE_ADMIN" &&
        payload.role !== "COLD_STORAGE_ADMIN")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { dispatchId } = body as { dispatchId: string };
    if (!dispatchId) return NextResponse.json({ error: "dispatchId is required" }, { status: 400 });

    const existing = await prisma.containerDispatch.findUnique({
      where: { id: dispatchId },
      include: { items: true },
    });
    if (!existing) return NextResponse.json({ error: "Container not found" }, { status: 404 });

    /* HARD BLOCK: while plug-in cooling is running, dispatch is locked. */
    if (existing.status === "PLUGIN_COOLING") {
      const ready = existing.pluginReadyAt ? existing.pluginReadyAt.getTime() <= Date.now() : false;
      if (!ready) {
        return NextResponse.json(
          {
            error: `Plug-in cooling not complete. Dispatch unlocks at ${existing.pluginReadyAt?.toLocaleString(
              "en-IN"
            )}.`,
          },
          { status: 400 }
        );
      }
      existing.status = "READY_TO_DISPATCH";
    }

    if (existing.status !== "READY_TO_DISPATCH") {
      return NextResponse.json(
        { error: `Cannot dispatch a container in status ${existing.status}` },
        { status: 400 }
      );
    }

    // Deduct the loaded boxes from cold-storage room stock (oldest first).
    const updated = await prisma.$transaction(async (tx) => {
      // Claim the transition in the same transaction as stock movement. A second
      // request must not deduct stock for a container already dispatched.
      const claimed = await tx.containerDispatch.updateMany({
        where: {
          id: dispatchId,
          OR: [
            { status: "READY_TO_DISPATCH" },
            { status: "PLUGIN_COOLING", pluginReadyAt: { lte: new Date(Date.now()) } },
          ],
        },
        data: { status: "DISPATCHED", dispatchedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("DISPATCH_CONFLICT");

      for (const item of existing.items) {
        let remaining = item.quantity;
        const allocations = await tx.coldRoomAllocation.findMany({
          where: { brandName: item.brandName, boxType: item.boxType, boxCount: { gt: 0 } },
          orderBy: { allocatedAt: "asc" },
        });
        for (const alloc of allocations) {
          if (remaining <= 0) break;
          const take = Math.min(alloc.boxCount, remaining);
          // Keep the row and shipped total for reconciliation. Conditional
          // decrement prevents another container from consuming the same stock.
          const deducted = await tx.coldRoomAllocation.updateMany({
            where: { id: alloc.id, boxCount: { gte: take } },
            data: { boxCount: { decrement: take }, shippedBoxes: { increment: take } },
          });
          if (deducted.count !== 1) throw new Error("DISPATCH_CONFLICT");
          remaining -= take;
        }
        if (remaining > 0) {
          throw new Error(`INSUFFICIENT_STOCK: ${item.brandName} / ${item.boxType}: short by ${remaining} boxes`);
        }
      }

      return tx.containerDispatch.update({
        where: { id: dispatchId },
        data: { status: "DISPATCHED", dispatchedAt: new Date() },
        include: { items: true },
      });
    });

    return NextResponse.json({ success: true, dispatch: updated });
  } catch (error) {
    if (error instanceof Error && (error.message === "DISPATCH_CONFLICT" || error.message.startsWith("INSUFFICIENT_STOCK:"))) {
      return NextResponse.json({ error: error.message === "DISPATCH_CONFLICT"
        ? "Stock or dispatch state changed. Refresh and retry; no stock was deducted."
        : error.message }, { status: 409 });
    }
    console.error("PUT /api/container-dispatch error:", error);
    return NextResponse.json({ error: "Failed to dispatch container" }, { status: 500 });
  }
}