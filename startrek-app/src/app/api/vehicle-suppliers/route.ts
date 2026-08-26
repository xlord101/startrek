import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// GET /api/vehicle-suppliers — List vehicle suppliers (persisted in Supabase)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const suppliers = await prisma.vehicleSupplier.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        supplierName: true,
        vehicleNumber: true,
        driverName: true,
        driverPhone: true,
      },
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error("GET /api/vehicle-suppliers error:", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { supplierName, vehicleNumber, driverName, driverPhone } = body;

    if (!supplierName || !vehicleNumber) {
      return NextResponse.json({ error: "Supplier name and vehicle number required" }, { status: 400 });
    }

    const supplier = await prisma.vehicleSupplier.create({
      data: {
        supplierName: String(supplierName).trim(),
        vehicleNumber: String(vehicleNumber).trim(),
        driverName: driverName ? String(driverName).trim() : null,
        driverPhone: driverPhone ? String(driverPhone).trim() : null,
      },
      select: {
        id: true,
        supplierName: true,
        vehicleNumber: true,
        driverName: true,
        driverPhone: true,
      },
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    console.error("POST /api/vehicle-suppliers error:", error);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Detach any harvest tasks referencing this supplier before deletion
    await prisma.harvestTask.updateMany({
      where: { vehicleSupplierId: id },
      data: { vehicleSupplierId: null },
    });

    await prisma.vehicleSupplier.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/vehicle-suppliers error:", error);
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}

