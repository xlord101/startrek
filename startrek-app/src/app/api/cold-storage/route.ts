import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// GET /api/cold-storage — Return current cold storage receipts
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const receipts = await prisma.coldStorageReceipt.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        allocations: true,
        qualityReport: true,
        harvestTask: {
          select: { billData: true }
        }
      }
    });

    const mappedReceipts = receipts.map(r => ({
      ...r,
      billData: r.harvestTask?.billData || {}
    }));

    return NextResponse.json({ receipts: mappedReceipts });
  } catch (error) {
    console.error("GET /api/cold-storage error:", error);
    return NextResponse.json({ error: "Failed to fetch cold storage receipts" }, { status: 500 });
  }
}

// PATCH /api/cold-storage — Update cold storage receipt
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
    const { action, receiptId, verifiedBoxCount, qualityReport, allocations } = body;

    if (!receiptId) return NextResponse.json({ error: "Receipt ID required" }, { status: 400 });

    if (action === "VERIFY") {
      const updated = await prisma.coldStorageReceipt.update({
        where: { id: receiptId },
        data: {
          status: "VERIFIED_RECEIVED",
          verifiedBoxCount,
          receivedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, receipt: updated });
    }
    
    if (action === "QUALITY_REPORT") {
      // Create quality report
      const qr = await prisma.kDColdStorageQualityReport.create({
        data: {
          receiptId: receiptId,
          date: qualityReport.date,
          vehicleNo: qualityReport.vehicleNo,
          lineName: qualityReport.lineName,
          supervisorName: qualityReport.supervisorName,
          vendorName: qualityReport.vendorName,
          outerBoxQuality: qualityReport.outerBoxQuality,
          packingQuality: qualityReport.packingQuality,
          numberOfHands: qualityReport.numberOfHands,
          fingerLengthDiameter: qualityReport.fingerLengthDiameter,
          boxWeightKg: qualityReport.boxWeightKg,
          damageOnHand: qualityReport.damageOnHand,
          latexSpots: qualityReport.latexSpots,
          redRust: qualityReport.redRust,
          flowerRemoved: qualityReport.flowerRemoved,
          overallQuality: qualityReport.overallQuality,
          damageBox: qualityReport.damageBox,
          boxBrand: qualityReport.boxBrand,
          totalBox: 0,
        },
      });
      return NextResponse.json({ success: true, qualityReport: qr });
    }

    if (action === "ALLOCATE") {
      const updated = await prisma.coldStorageReceipt.update({
        where: { id: receiptId },
        data: {
          status: "ALLOCATED_TO_ROOMS",
          allocatedAt: new Date(),
          allocations: {
            create: allocations.map((a: { roomNumber: string; brandName: string; boxCount: number }) => ({
              roomNumber: a.roomNumber,
              brandName: a.brandName,
              boxCount: a.boxCount,
              allocatedAt: new Date(),
            }))
          }
        },
        include: { allocations: true }
      });
      return NextResponse.json({ success: true, receipt: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/cold-storage error:", error);
    return NextResponse.json({ error: "Failed to update cold storage" }, { status: 500 });
  }
}
