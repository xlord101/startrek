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

    const returns = await prisma.inventoryReturnRequest.findMany({
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ items, returns });
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
    if (!payload || (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN")) {
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/inventory error:", error);
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}
