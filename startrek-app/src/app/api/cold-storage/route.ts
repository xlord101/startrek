import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { allocateRooms, AllocationError, parseAllocationRows } from "@/lib/cold-room-allocation";

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
    if (
      !payload ||
      (payload.role !== "MAIN_ADMIN" &&
        payload.role !== "OFFICE_ADMIN" &&
        payload.role !== "COLD_STORAGE_ADMIN")
    ) {
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
          verifiedBoxCount: Number(verifiedBoxCount),
          receivedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, receipt: updated });
    }
    
    if (action === "QUALITY_REPORT" || action === "VERIFY_AND_QUALITY") {
      const qrData = {
        date: qualityReport.date || new Date().toLocaleDateString("en-IN"),
        vehicleNo: qualityReport.vehicleNo || "",
        lineName: qualityReport.lineName || "",
        supervisorName: qualityReport.supervisorName || "",
        vendorName: qualityReport.vendorName || "",
        outerBoxQuality: qualityReport.outerBoxQuality || "GOOD",
        packingQuality: qualityReport.packingQuality || "EXPORT",
        numberOfHands: String(qualityReport.numberOfHands || "5-7 hands"),
        fingerLengthDiameter: String(qualityReport.fingerLengthDiameter || "18cm / 39mm"),
        boxWeightKg: Number(qualityReport.boxWeightKg || 13.5),
        damageOnHand: qualityReport.damageOnHand || "NONE",
        latexSpots: Boolean(qualityReport.latexSpots),
        redRustPercentage:
          qualityReport.redRustPercentage !== undefined && qualityReport.redRustPercentage !== null
            ? Number(qualityReport.redRustPercentage)
            : null,
        // Boolean kept in sync for older reports / simple "any rust?" views
        redRust:
          qualityReport.redRustPercentage !== undefined && qualityReport.redRustPercentage !== null
            ? Number(qualityReport.redRustPercentage) > 0
            : Boolean(qualityReport.redRust),
        flowerRemoved: qualityReport.flowerRemoved !== undefined ? Boolean(qualityReport.flowerRemoved) : true,
        overallQuality: qualityReport.overallQuality || "A_GRADE_EXPORT",
        box3H: Number(qualityReport.box3H || 0),
        box4H: Number(qualityReport.box4H || 0),
        box5H: Number(qualityReport.box5H || 0),
        box6H: Number(qualityReport.box6H || 0),
        box7H: Number(qualityReport.box7H || 0),
        box8H: Number(qualityReport.box8H || 0),
        totalBox: Number(qualityReport.totalBox || verifiedBoxCount || 0),
        damageBox: Number(qualityReport.damageBox || 0),
        boxBrand: qualityReport.boxBrand || "StarPremium",
      };

      const qr = await prisma.kDColdStorageQualityReport.upsert({
        where: { receiptId },
        update: qrData,
        create: {
          receiptId,
          ...qrData,
        },
      });

      const updatedReceipt = await prisma.coldStorageReceipt.update({
        where: { id: receiptId },
        data: {
          status: "VERIFIED_RECEIVED",
          verifiedBoxCount: Number(qualityReport.totalBox || verifiedBoxCount || 0),
          receivedAt: new Date(),
        },
        include: { qualityReport: true, allocations: true }
      });

      return NextResponse.json({ success: true, qualityReport: qr, receipt: updatedReceipt });
    }

    if (action === "ALLOCATE") {
      const rows = parseAllocationRows(allocations);
      const updated = await prisma.$transaction(
        tx => allocateRooms(tx, receiptId, rows),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      return NextResponse.json({ success: true, receipt: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof AllocationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Stock changed during allocation. Refresh and retry; nothing was saved." }, { status: 409 });
    }
    console.error("PATCH /api/cold-storage error:", error);
    return NextResponse.json({ error: "Failed to update cold storage" }, { status: 500 });
  }
}
