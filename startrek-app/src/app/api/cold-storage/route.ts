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
      }
    });

    return NextResponse.json({ receipts });
  } catch (error) {
    console.error("GET /api/cold-storage error:", error);
    return NextResponse.json({ error: "Failed to fetch cold storage receipts" }, { status: 500 });
  }
}
