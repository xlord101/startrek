"use server";

import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { ProcurementStatus, QualityType, BoxType, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

/* ─── 1. Create Inbound Intake (Step 1.1) ────────────────────────────────── */

export interface CreateIntakeInput {
  name: string;
  mobileNumber: string;
  address: string;
  approxTonnage: number;
  createdById?: string;
}

export async function createIntakeTask(input: CreateIntakeInput) {
  try {
    // Upsert farmer record by mobile number
    const farmer = await db.farmer.upsert({
      where: { mobileNumber: input.mobileNumber },
      update: {
        name: input.name,
        address: input.address,
      },
      create: {
        name: input.name,
        mobileNumber: input.mobileNumber,
        address: input.address,
      },
    });

    // Create procurement task
    const task = await db.procurementTask.create({
      data: {
        farmerId: farmer.id,
        approxTonnage: input.approxTonnage,
        status: ProcurementStatus.PENDING_ASSIGNMENT,
      },
      include: {
        farmer: true,
      },
    });

    // Log audit event
    if (input.createdById) {
      await logAuditEvent({
        userId: input.createdById,
        userRole: UserRole.OFFICE_ADMIN,
        action: "INTAKE_CREATED",
        entityType: "PROCUREMENT_TASK",
        entityId: task.id,
        details: {
          farmerName: farmer.name,
          approxTonnage: input.approxTonnage,
        },
      });
    }

    revalidatePath("/admin/procurement");
    return { success: true, task };
  } catch (error) {
    console.error("Error creating intake task:", error);
    return { success: false, error: "Failed to record intake task." };
  }
}

/* ─── 2. Assign Field Supervisor (Step 1.2) ────────────────────────────── */

export interface AssignSupervisorInput {
  taskId: string;
  supervisorId: string;
  assignedById: string;
  assignedByRole: UserRole;
}

export async function assignSupervisor(input: AssignSupervisorInput) {
  try {
    const supervisor = await db.user.findUnique({
      where: { id: input.supervisorId },
    });

    if (!supervisor) {
      return { success: false, error: "Supervisor not found." };
    }

    const task = await db.procurementTask.update({
      where: { id: input.taskId },
      data: {
        supervisorId: input.supervisorId,
        assignedAt: new Date(),
        status: ProcurementStatus.ASSIGNED,
      },
      include: {
        farmer: true,
      },
    });

    // Audit log
    await logAuditEvent({
      userId: input.assignedById,
      userRole: input.assignedByRole,
      action: "SUPERVISOR_ASSIGNED",
      entityType: "PROCUREMENT_TASK",
      entityId: task.id,
      details: {
        supervisorId: supervisor.id,
        supervisorName: supervisor.name,
        farmerName: task.farmer.name,
      },
    });

    // In-app notification for supervisor
    await createNotification({
      userId: supervisor.id,
      title: "New Farm Visit Assigned",
      message: `You have been allocated to inspect ${task.farmer.name}'s farm (${task.approxTonnage} T).`,
      type: "ASSIGNMENT",
      link: `/supervisor/task/${task.id}`,
    });

    revalidatePath("/admin/procurement");
    return { success: true, task };
  } catch (error) {
    console.error("Error assigning supervisor:", error);
    return { success: false, error: "Failed to assign supervisor." };
  }
}

/* ─── 3. Submit Field Inspection (Step 1.3) ────────────────────────────── */

export interface FieldInspectionInput {
  taskId: string;
  supervisorId: string;
  actualTonnage: number;
  ratioPercentage: number;
  quality: QualityType;
  rejectionReason?: string;
  altMobileNumber?: string;
  rate?: number;
  boxTypes: BoxType[];
}

export async function submitFieldInspection(input: FieldInspectionInput) {
  try {
    // Delete existing particulars and create new
    await db.taskParticular.deleteMany({
      where: { taskId: input.taskId },
    });

    const task = await db.procurementTask.update({
      where: { id: input.taskId },
      data: {
        actualTonnage: input.actualTonnage,
        ratioPercentage: input.ratioPercentage,
        quality: input.quality,
        rejectionReason: input.rejectionReason || null,
        altMobileNumber: input.altMobileNumber || null,
        rate: input.rate || null,
        supervisorSubmittedAt: new Date(),
        status: ProcurementStatus.FIELD_SUBMITTED,
        particulars: {
          create: input.boxTypes.map((boxType) => ({ boxType })),
        },
      },
      include: {
        farmer: true,
      },
    });

    // Audit log
    await logAuditEvent({
      userId: input.supervisorId,
      userRole: UserRole.SUPERVISOR,
      action: "FIELD_SUBMITTED",
      entityType: "PROCUREMENT_TASK",
      entityId: task.id,
      details: {
        actualTonnage: input.actualTonnage,
        quality: input.quality,
        boxTypes: input.boxTypes,
      },
    });

    // Notify office admins
    const officeAdmins = await db.user.findMany({
      where: {
        role: { in: [UserRole.OFFICE_ADMIN, UserRole.MAIN_ADMIN] },
        isActive: true,
      },
    });

    for (const admin of officeAdmins) {
      await createNotification({
        userId: admin.id,
        title: "Field Inspection Report Submitted",
        message: `Field report for ${task.farmer.name} (${input.actualTonnage} T, ${input.quality}) submitted.`,
        type: "FIELD_SUBMISSION",
        link: `/admin/procurement`,
      });
    }

    revalidatePath("/admin/procurement");
    revalidatePath("/supervisor");
    return { success: true, task };
  } catch (error) {
    console.error("Error submitting field inspection:", error);
    return { success: false, error: "Failed to submit field inspection report." };
  }
}

/* ─── 4. Final Rate Approval & Lockdown (Step 1.4) ─────────────────────── */

export interface ApproveProcurementInput {
  taskId: string;
  finalRate: number;
  approvedById: string;
  approvedByRole: UserRole;
}

export async function approveProcurement(input: ApproveProcurementInput) {
  try {
    const task = await db.procurementTask.update({
      where: { id: input.taskId },
      data: {
        finalRate: input.finalRate,
        approvedById: input.approvedById,
        approvedAt: new Date(),
        status: ProcurementStatus.APPROVED_PROCUREMENT,
      },
      include: {
        farmer: true,
      },
    });

    // Audit log
    await logAuditEvent({
      userId: input.approvedById,
      userRole: input.approvedByRole,
      action: "PROCUREMENT_APPROVED",
      entityType: "PROCUREMENT_TASK",
      entityId: task.id,
      details: {
        finalRate: input.finalRate,
        farmerName: task.farmer.name,
      },
    });

    revalidatePath("/admin/procurement");
    return { success: true, task };
  } catch (error) {
    console.error("Error approving procurement:", error);
    return { success: false, error: "Failed to approve and lock procurement." };
  }
}
