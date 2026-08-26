import { prisma } from "@/lib/prisma";
import { UserRole } from "@/types";

export interface LogAuditEventParams {
  userId: string;
  userRole: UserRole | string;
  action: string; // e.g. "INTAKE_CREATED", "RATE_LOCKED", "QUALITY_REPORT_SAVED", "USER_ROLE_UPDATED"
  entityType: string; // e.g. "PROCUREMENT_TASK", "HARVEST_TASK", "USER"
  entityId: string;
  details?: string; // Human readable summary
}

/**
 * Persist an audit trail event to the AuditLog table in Supabase.
 * Fire-and-forget safe: failures are logged but never break the main request.
 */
export async function logAuditEvent(event: LogAuditEventParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: event.userId,
        userRole: event.userRole as UserRole,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        details: event.details ?? null,
      },
    });
  } catch (error) {
    // Audit logging must never block or fail a business operation
    console.error("logAuditEvent failed:", error);
    return null;
  }
}

