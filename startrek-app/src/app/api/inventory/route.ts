import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// GET /api/inventory — Return current inventory levels
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await prisma.inventoryStock.findMany({
      orderBy: { boxType: "asc" },
    });

    const consumableItems = await prisma.consumableInventoryStock.findMany({
      orderBy: { itemType: "asc" },
    });

    const returns = await prisma.inventoryReturnRequest.findMany({
      orderBy: { submittedAt: "desc" },
    });

    const pendingRequests = await prisma.harvestTask.findMany({
      where: {
        status: "HARVEST_ASSIGNED",
        materialsIssued: false,
      },
      include: {
        farmer: true,
        supervisor: true,
      },
      orderBy: {
        assignedAt: "desc"
      }
    });

    const dispatchedLogs = await prisma.harvestTask.findMany({
      where: {
        materialsIssued: true,
      },
      include: {
        farmer: true,
        supervisor: true,
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 30,
    });

    return NextResponse.json({ items, consumableItems, returns, pendingRequests, dispatchedLogs });
  } catch (error) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory stock" }, { status: 500 });
  }
}

// PATCH /api/inventory — Update inventory return requests and restock
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN" && payload.role !== "INVENTORY_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, returnId, actualReturnedBoxes } = body;

    if (action === "VERIFY_RETURN" && returnId) {
      // 1. Get the return request
      const returnReq = await prisma.inventoryReturnRequest.findUnique({
        where: { id: returnId },
      });

      if (!returnReq) {
        return NextResponse.json({ error: "Return request not found" }, { status: 404 });
      }

      const wastage = returnReq.expectedReturnBoxes - actualReturnedBoxes;

      // 2. Update the return request
      const updatedReturn = await prisma.inventoryReturnRequest.update({
        where: { id: returnId },
        data: {
          status: "VERIFIED_RESTOCKED",
          actualReturnedBoxes,
          wastageBoxes: wastage > 0 ? wastage : 0,
          verifiedAt: new Date(),
        },
      });

      // 3. Update inventory stock (add back good boxes)
      if (actualReturnedBoxes > 0) {
        await prisma.inventoryStock.update({
          where: { boxType: returnReq.boxType },
          data: {
            availableStock: { increment: actualReturnedBoxes },
            issuedStock: { decrement: actualReturnedBoxes },
          },
        });
      }

      if (wastage > 0) {
        // Just decrement issued stock for damaged/wasted boxes
        await prisma.inventoryStock.update({
          where: { boxType: returnReq.boxType },
          data: {
            issuedStock: { decrement: wastage > 0 ? wastage : 0 },
          },
        });
      }

      return NextResponse.json({ success: true, returnRequest: updatedReturn });
    }

    if (action === "DISPATCH_MATERIALS" && body.taskId) {
      const task = await prisma.harvestTask.findUnique({
        where: { id: body.taskId }
      });

      if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      if (task.materialsIssued) return NextResponse.json({ error: "Already issued" }, { status: 400 });

      // Update stock based on dispatchedCounts if provided, else fallback
      const countsToDispatch = body.dispatchedCounts || task.requiredBoxCounts || {};
      
      if (typeof countsToDispatch === 'object') {
        for (const [boxType, qtyStr] of Object.entries(countsToDispatch as Record<string, any>)) {
          const qty = Number(qtyStr);
          if (qty > 0 && !isNaN(qty)) {
            const prismaBoxType = boxType.startsWith("BOX_") ? boxType : `BOX_${boxType}`;
            await prisma.inventoryStock.updateMany({
              where: { boxType: prismaBoxType as any },
              data: {
                availableStock: { decrement: qty },
                issuedStock: { increment: qty },
              }
            });
          }
        }
      }

      // Also deduct any consumable items dispatched
      const consumablesToDispatch = body.dispatchedConsumables || {};
      if (typeof consumablesToDispatch === 'object') {
        for (const [itemType, qtyStr] of Object.entries(consumablesToDispatch as Record<string, any>)) {
          const qty = Number(qtyStr);
          if (qty > 0 && !isNaN(qty)) {
            await prisma.consumableInventoryStock.updateMany({
              where: { itemType },
              data: {
                availableStock: { decrement: qty },
                issuedStock: { increment: qty },
              }
            });
          }
        }
      }

      const updatedTask = await prisma.harvestTask.update({
        where: { id: body.taskId },
        data: { 
          materialsIssued: true,
          requiredBoxCounts: countsToDispatch
        }
      });

      return NextResponse.json({ success: true, task: updatedTask });
    }

    if (action === "ADD_STOCK" && body.boxType && body.quantity) {
      if (body.boxType.startsWith("CONSUMABLE_")) {
        const itemType = body.boxType.replace("CONSUMABLE_", "");
        const unit = body.unit || "units";
        const updatedStock = await prisma.consumableInventoryStock.upsert({
          where: { itemType },
          update: { availableStock: { increment: Number(body.quantity) } },
          create: {
            itemType,
            availableStock: Number(body.quantity),
            issuedStock: 0,
            unit,
          },
        });
        return NextResponse.json({ success: true, consumableStock: updatedStock });
      } else {
        const prismaBoxType = body.boxType.startsWith("BOX_") ? body.boxType : `BOX_${body.boxType}`;
        const updatedStock = await prisma.inventoryStock.upsert({
          where: { boxType: prismaBoxType as any },
          update: { availableStock: { increment: Number(body.quantity) } },
          create: {
            boxType: prismaBoxType as any,
            availableStock: Number(body.quantity),
            issuedStock: 0,
          },
        });
        return NextResponse.json({ success: true, stock: updatedStock });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/inventory error:", error);
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}
