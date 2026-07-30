import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export interface AuditLogParams {
  userId: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Log an immutable audit event to the database.
 */
export async function logAuditEvent({
  userId,
  userRole,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
}: AuditLogParams) {
  try {
    return await db.auditLog.create({
      data: {
        userId,
        userRole,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error("⚠️ Audit log failed to write:", error);
  }
}
