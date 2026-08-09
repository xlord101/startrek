import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// GET /api/farmers — List all farmers
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const farmers = await prisma.farmer.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ farmers });
  } catch (error) {
    console.error("GET /api/farmers error:", error);
    return NextResponse.json({ error: "Failed to fetch farmers" }, { status: 500 });
  }
}

// POST /api/farmers — Add a new farmer
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, mobileNumber, address } = body;

    if (!name || !mobileNumber) {
      return NextResponse.json({ error: "Name and mobile number required" }, { status: 400 });
    }

    const farmer = await prisma.farmer.create({
      data: {
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address?.trim() || "",
      },
    });

    return NextResponse.json({ farmer }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Mobile number already registered" }, { status: 409 });
    }
    console.error("POST /api/farmers error:", error);
    return NextResponse.json({ error: "Failed to create farmer" }, { status: 500 });
  }
}

// DELETE /api/farmers?id=xxx
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

    await prisma.farmer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete farmer" }, { status: 500 });
  }
}
