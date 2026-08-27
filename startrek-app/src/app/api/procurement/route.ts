import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

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
        particulars: true,
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
    const { 
      taskId, 
      supervisorId, 
      status, 
      finalRatePerKg,
      actualTonnage,
      ratioPercentage,
      quality,
      rejectionReason,
      particulars,
      supervisorRatePerKg
    } = body;

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
      if (status === "FIELD_SUBMITTED") {
        updateData.supervisorSubmittedAt = new Date();
      }
    }
    if (finalRatePerKg !== undefined) updateData.finalRate = Number(finalRatePerKg);
    if (actualTonnage !== undefined) updateData.actualTonnage = Number(actualTonnage);
    if (ratioPercentage !== undefined) updateData.ratioPercentage = Number(ratioPercentage);
    if (quality !== undefined) updateData.quality = quality;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (supervisorRatePerKg !== undefined) updateData.supervisorRatePerKg = Number(supervisorRatePerKg);

    if (particulars && Array.isArray(particulars)) {
      updateData.particulars = {
        deleteMany: {},
        create: particulars.map((p: any) => ({ boxType: `BOX_${p.boxType}` })),
      };
    }

    const updatedTask = await prisma.procurementTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        farmer: true,
        supervisor: {
          select: { id: true, name: true, email: true, role: true },
        },
        particulars: true,
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
            // supervisorId is intentionally left null so admins can assign a Procurement Supervisor
          }
        });
      }
    }

    // Audit trail + notifications (persisted to Supabase)
    if (supervisorId) {
      await createNotification({
        userId: supervisorId,
        title: "New Farm Visit Assigned",
        message: `You have been assigned a procurement visit for ${updatedTask.farmer.name}.`,
        type: "ASSIGNMENT",
        link: `/supervisor/task/${taskId}`,
      });
      await logAuditEvent({
        userId: payload.userId,
        userRole: payload.role,
        action: "TASK_ASSIGNED",
        entityType: "PROCUREMENT_TASK",
        entityId: taskId,
        details: `Assigned supervisor ${updatedTask.supervisor?.name || supervisorId} to procurement task for farmer ${updatedTask.farmer.name}`,
      });
    }
    if (status === "FIELD_SUBMITTED") {
      const admins = await prisma.user.findMany({
        where: { role: { in: ["MAIN_ADMIN", "OFFICE_ADMIN"] }, isActive: true },
        select: { id: true },
      });
      await Promise.all(
        admins.map((a) =>
          createNotification({
            userId: a.id,
            title: "Field Inspection Report Submitted",
            message: `Field report for ${updatedTask.farmer.name} was submitted and is ready for review.`,
            type: "FIELD_SUBMISSION",
            link: "/admin/procurement",
          })
        )
      );
    }
    if (status === "APPROVED_PROCUREMENT") {
      await logAuditEvent({
        userId: payload.userId,
        userRole: payload.role,
        action: "RATE_LOCKED",
        entityType: "PROCUREMENT_TASK",
        entityId: taskId,
        details: `Approved procurement & locked final rate at ₹${updatedTask.finalRate ?? updatedTask.supervisorRatePerKg ?? "-"} /kg for farmer ${updatedTask.farmer.name}`,
      });
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error("PATCH /api/procurement error:", error);
    return NextResponse.json({ error: "Failed to update procurement task" }, { status: 500 });
  }
}

// DELETE /api/procurement — Delete a procurement task
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Delete related harvest tasks first to avoid foreign key constraints
    await prisma.harvestTask.deleteMany({
      where: { procurementTaskId: taskId }
    });

    await prisma.procurementTask.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/procurement error:", error);
    return NextResponse.json({ error: "Failed to delete procurement task" }, { status: 500 });
  }
}
