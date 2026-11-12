import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

const VALID_PROCUREMENT_STATUSES = new Set([
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "FIELD_SUBMITTED",
  "APPROVED_PROCUREMENT",
]);

const VALID_BOX_TYPES = new Set([
  "BOX_5KG",
  "BOX_7KG",
  "BOX_13KG",
  "BOX_13_5KG",
  "BOX_16KG",
]);

// GET /api/procurement — Return recent procurement tasks
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = payload.role === "MAIN_ADMIN" || payload.role === "OFFICE_ADMIN";
    const tasks = await prisma.procurementTask.findMany({
      where: isAdmin ? undefined : { supervisorId: payload.userId },
      include: {
        farmer: true,
        supervisor: {
          select: { id: true, name: true, email: true, role: true },
        },
        particulars: true,
      },
      orderBy: { createdAt: "desc" },
      take: 250,
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

    if (!farmerId || estTonnage === undefined || !Number.isFinite(Number(estTonnage)) || Number(estTonnage) <= 0) {
      return NextResponse.json({ error: "Farmer and positive estimated tonnage are required" }, { status: 400 });
    }

    if (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN" && payload.role !== "PROCUREMENT_SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let finalSupervisorId = null;
    let initialStatus = "PENDING_ASSIGNMENT";
    let assignedAt = null;

    if (payload.role === "PROCUREMENT_SUPERVISOR") {
      finalSupervisorId = payload.userId;
      initialStatus = "ASSIGNED";
      assignedAt = new Date();
    }

    // Generate readable intake ID: e.g. kd261100001
    // Format: "kd" + YY (2 digits) + MM (2 digits) + 5-digit sequence counter (reset per year)
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yearPrefix = `kd${yy}`;

    const existingTasks = await prisma.procurementTask.findMany({
      where: {
        id: {
          startsWith: yearPrefix,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    let maxSeq = 0;
    for (const t of existingTasks) {
      const match = t.id.match(/\d{5}$/);
      if (match) {
        const seq = parseInt(match[0], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    let nextSeq = maxSeq + 1;
    let candidateId = `kd${yy}${mm}${String(nextSeq).padStart(5, "0")}`;

    while (await prisma.procurementTask.findUnique({ where: { id: candidateId } })) {
      nextSeq++;
      candidateId = `kd${yy}${mm}${String(nextSeq).padStart(5, "0")}`;
    }

    const task = await prisma.procurementTask.create({
      data: {
        id: candidateId,
        batchNumber: candidateId,
        farmerId,
        approxTonnage: Number(estTonnage),
        status: initialStatus as any,
        supervisorId: finalSupervisorId,
        assignedAt: assignedAt,
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
      supervisorRatePerKg,
      chilling,
      pulpPercentage,
      redRustPercentage,
      skinCosmeticsQuality,
      skinCosmeticsPercentage,
      fingerLengthInch,
      caliberNumber
    } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const existingTask = await prisma.procurementTask.findUnique({
      where: { id: taskId },
      select: { id: true, supervisorId: true, batchNumber: true }
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN") {
      if (existingTask.supervisorId !== payload.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (
        supervisorId !== undefined ||
        finalRatePerKg !== undefined ||
        (status !== undefined && status !== "FIELD_SUBMITTED")
      ) {
        return NextResponse.json(
          { error: "Forbidden — Only admins may assign supervisors or approve rates" },
          { status: 403 }
        );
      }
    }

    if (status !== undefined && !VALID_PROCUREMENT_STATUSES.has(String(status))) {
      return NextResponse.json({ error: "Invalid procurement status" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (supervisorId) {
      updateData.supervisorId = supervisorId;
      updateData.assignedAt = new Date();
      updateData.status = "ASSIGNED";
    }
    if (status) {
      updateData.status = status;
      if (status === "APPROVED_PROCUREMENT") {
        updateData.approvedAt = new Date();
        updateData.approvedById = payload.userId;
        if (!existingTask.batchNumber) {
          updateData.batchNumber = existingTask.id;
        }
      }
      if (status === "FIELD_SUBMITTED") {
        updateData.supervisorSubmittedAt = new Date();
      }
    }
    if (finalRatePerKg !== undefined && Number.isFinite(Number(finalRatePerKg))) {
      updateData.finalRate = Number(finalRatePerKg);
    }
    if (actualTonnage !== undefined && Number.isFinite(Number(actualTonnage))) {
      updateData.actualTonnage = Number(actualTonnage);
    }
    if (ratioPercentage !== undefined && Number.isFinite(Number(ratioPercentage))) {
      updateData.ratioPercentage = Number(ratioPercentage);
    }
    if (quality !== undefined) updateData.quality = quality;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (supervisorRatePerKg !== undefined && Number.isFinite(Number(supervisorRatePerKg))) {
      updateData.supervisorRatePerKg = Number(supervisorRatePerKg);
    }

    // Field inspection quality metrics (optional — rate is no longer mandatory)
    if (chilling !== undefined) updateData.chilling = Boolean(chilling);
    if (pulpPercentage !== undefined && Number.isFinite(Number(pulpPercentage))) {
      updateData.pulpPercentage = Number(pulpPercentage);
    }
    if (redRustPercentage !== undefined && Number.isFinite(Number(redRustPercentage))) {
      updateData.redRustPercentage = Number(redRustPercentage);
    }
    if (skinCosmeticsQuality !== undefined) updateData.skinCosmeticsQuality = skinCosmeticsQuality;
    if (skinCosmeticsPercentage !== undefined && Number.isFinite(Number(skinCosmeticsPercentage))) {
      updateData.skinCosmeticsPercentage = Number(skinCosmeticsPercentage);
    }
    if (fingerLengthInch !== undefined && Number.isFinite(Number(fingerLengthInch))) {
      updateData.fingerLengthInch = Number(fingerLengthInch);
    }
    if (caliberNumber !== undefined && Number.isFinite(Number(caliberNumber))) {
      updateData.caliberNumber = Number(caliberNumber);
    }

    if (particulars && Array.isArray(particulars)) {
      const normalizedParticulars = particulars
        .map((p: { boxType?: string }) => {
          const raw = String(p?.boxType || "");
          return raw.startsWith("BOX_") ? raw : `BOX_${raw}`;
        })
        .filter((bt) => VALID_BOX_TYPES.has(bt));

      updateData.particulars = {
        deleteMany: {},
        create: normalizedParticulars.map((boxType) => ({ boxType })),
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
      return NextResponse.json({ error: "Forbidden — Admin access required" }, { status: 403 });
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
