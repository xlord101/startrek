import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// In-memory supplier cache (vehicle supplier registry)
let tempSuppliers: any[] = [
  { id: "vs-1", supplierName: "Gajanan Transport", vehicleNumber: "MH 19 CX 4589", driverName: "Ramesh Patil", driverPhone: "9822011223" },
  { id: "vs-2", supplierName: "Khandesh Logistics", vehicleNumber: "MH 19 BJ 1212", driverName: "Sanjay Chaudhari", driverPhone: "9422788990" },
];

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return NextResponse.json({ suppliers: tempSuppliers });
  } catch (error) {
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
    const newSupplier = {
      id: `vs-${Date.now()}`,
      supplierName: body.supplierName,
      vehicleNumber: body.vehicleNumber,
      driverName: body.driverName || "",
      driverPhone: body.driverPhone || "",
    };

    tempSuppliers.unshift(newSupplier);
    return NextResponse.json({ supplier: newSupplier }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    tempSuppliers = tempSuppliers.filter((s) => s.id !== id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}

