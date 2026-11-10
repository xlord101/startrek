import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { createNotification } from "@/lib/notifications";
import { parseBoxType } from "@/lib/box-type";
import type { BoxType, ExportOrderStatus } from "@prisma/client";

type OrderItemInput = { boxType: BoxType; brandName: string; quantity: number };

function parseOrderItems(raw: unknown): OrderItemInput[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const items: OrderItemInput[] = [];
  for (const value of raw) {
    if (!value || typeof value !== "object") return [];
    const rec = value as Record<string, unknown>;
    const boxType = parseBoxType(rec.boxType);
    if (
      !boxType ||
      typeof rec.brandName !== "string" ||
      !rec.brandName.trim() ||
      typeof rec.quantity !== "number" ||
      !Number.isSafeInteger(rec.quantity) ||
      rec.quantity <= 0
    ) {
      return [];
    }
    items.push({ boxType, brandName: rec.brandName.trim(), quantity: rec.quantity });
  }
  return items;
}

// GET /api/orders — List all commercial export orders with items and linked dispatches
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.exportOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        dispatches: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
      },
      take: 100,
    });

    // Auto-update order status if all ordered boxes have been dispatched
    for (const order of orders) {
      if (order.status === "IN_PROGRESS" && order.dispatches.length > 0) {
        const totalOrdered = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalDispatched = order.dispatches
          .filter((d) => d.status === "DISPATCHED" || d.status === "READY_TO_DISPATCH")
          .reduce(
            (sum, d) => sum + d.items.reduce((s, it) => s + it.quantity, 0),
            0
          );

        if (totalDispatched >= totalOrdered && totalOrdered > 0) {
          await prisma.exportOrder.update({
            where: { id: order.id },
            data: { status: "COMPLETED" },
          });
          order.status = "COMPLETED";
        }
      }
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: "Failed to fetch export orders" }, { status: 500 });
  }
}

// POST /api/orders — Create a new commercial export order
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = String(payload.role || "").toUpperCase();
    const allowedRoles: string[] = ["MAIN_ADMIN", "OFFICE_ADMIN", "COLD_STORAGE_ADMIN", "ADMIN"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Forbidden: Account does not have permission to manage export orders" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { buyerName, destination, targetDate, remarks, containerCapacity } = body as {
      buyerName?: string;
      destination?: string;
      targetDate?: string;
      remarks?: string;
      containerCapacity?: number;
    };

    if (!buyerName?.trim()) {
      return NextResponse.json({ error: "Buyer / Customer name is required." }, { status: 400 });
    }

    const items = parseOrderItems(body.items);
    if (items.length === 0) {
      return NextResponse.json(
        { error: "Add at least one produce line with brand, box size, and quantity." },
        { status: 400 }
      );
    }

    // Auto-generate order number (e.g. ORD-2026-001)
    const count = await prisma.exportOrder.count();
    const year = new Date().getFullYear();
    const orderNumber = `ORD-${year}-${String(count + 1).padStart(3, "0")}`;

    const parsedTargetDate = targetDate ? new Date(targetDate) : null;

    const order = await prisma.exportOrder.create({
      data: {
        orderNumber,
        buyerName: buyerName.trim(),
        destination: destination?.trim() || null,
        targetDate: parsedTargetDate && !isNaN(parsedTargetDate.getTime()) ? parsedTargetDate : null,
        remarks: remarks?.trim() || null,
        containerCapacity: containerCapacity && containerCapacity > 0 ? containerCapacity : 1500,
        status: "IN_PROGRESS",
        createdById: payload.userId || null,
        items: {
          create: items.map((i) => ({
            boxType: i.boxType as never,
            brandName: i.brandName,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        items: true,
        dispatches: {
          include: { items: true },
        },
      },
    });

    const totalBoxes = items.reduce((s, i) => s + i.quantity, 0);

    // Notify admins about the new order
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["MAIN_ADMIN", "OFFICE_ADMIN", "COLD_STORAGE_ADMIN"] } },
        select: { id: true },
      });
      for (const a of admins) {
        if (a.id !== payload.userId) {
          await createNotification({
            userId: a.id,
            title: `New Export Order: ${order.orderNumber}`,
            message: `Order for ${order.buyerName} registered (${totalBoxes} boxes). Check cold room stock fulfillment.`,
            type: "INFO",
            link: "/admin/orders",
          });
        }
      }
    } catch (e) {
      console.error("Failed to notify admins of new export order:", e);
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: "Failed to create export order" }, { status: 500 });
  }
}

// PATCH /api/orders — Update order status, destination, target date, or remarks
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { orderId, status, destination, targetDate, remarks, containerCapacity } = body as {
      orderId: string;
      status?: ExportOrderStatus;
      destination?: string;
      targetDate?: string;
      remarks?: string;
      containerCapacity?: number;
    };

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const existing = await prisma.exportOrder.findUnique({
      where: { id: orderId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updated = await prisma.exportOrder.update({
      where: { id: orderId },
      data: {
        ...(status ? { status } : {}),
        ...(destination !== undefined ? { destination: destination?.trim() || null } : {}),
        ...(targetDate !== undefined
          ? { targetDate: targetDate ? new Date(targetDate) : null }
          : {}),
        ...(remarks !== undefined ? { remarks: remarks?.trim() || null } : {}),
        ...(containerCapacity ? { containerCapacity } : {}),
      },
      include: {
        items: true,
        dispatches: { include: { items: true } },
      },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error("PATCH /api/orders error:", error);
    return NextResponse.json({ error: "Failed to update export order" }, { status: 500 });
  }
}

// DELETE /api/orders — Remove an order
export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Only admins can delete orders" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Order ID is required" }, { status: 400 });

    await prisma.exportOrder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/orders error:", error);
    return NextResponse.json({ error: "Failed to delete export order" }, { status: 500 });
  }
}

