import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// GET /api/procurement — Return all procurement tasks
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tasks = await prisma.procurementTask.findMany({
      include: {
        farmer: true,
        supervisor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("GET /api/procurement error:", error);
    return NextResponse.json({ error: "Failed to fetch procurement tasks" }, { status: 500 });
  }
}

// POST /api/procurement — Create a new procurement task
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { farmerId, location, estTonnage, plannedDate, remarks } = body;

    if (!farmerId || !estTonnage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const task = await prisma.procurementTask.create({
      data: {
        farmerId,
        approxTonnage: Number(estTonnage),
        status: "PENDING_ASSIGNMENT",
      },
      include: {
        farmer: true,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("POST /api/procurement error:", error);
    return NextResponse.json({ error: "Failed to create procurement task" }, { status: 500 });
  }
}

// PATCH /api/procurement — Assign supervisor or update procurement task status
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { taskId, supervisorId, status, finalRatePerKg } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (supervisorId) {
      updateData.supervisorId = supervisorId;
      updateData.assignedAt = new Date();
      updateData.status = "ASSIGNED";
    }
    if (status) {
      updateData.status = status;
      if (status === "APPROVED_PROCUREMENT") {
        updateData.approvedAt = new Date();
      }
    }
    if (finalRatePerKg !== undefined) updateData.finalRate = Number(finalRatePerKg);

    const updatedTask = await prisma.procurementTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        farmer: true,
        supervisor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (status === "APPROVED_PROCUREMENT") {
      const existingHarvest = await prisma.harvestTask.findUnique({
        where: { procurementTaskId: taskId },
      });
      if (!existingHarvest) {
        await prisma.harvestTask.create({
          data: {
            procurementTaskId: taskId,
            farmerId: updatedTask.farmerId,
            tonnage: updatedTask.actualTonnage || updatedTask.approxTonnage,
            quality: updatedTask.quality || "GOOD",
            finalRate: updatedTask.finalRate || 0,
            status: "READY_FOR_HARVEST",
            supervisorId: updatedTask.supervisorId,
          }
        });
      }
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error("PATCH /api/procurement error:", error);
    return NextResponse.json({ error: "Failed to update procurement task" }, { status: 500 });
  }
}
