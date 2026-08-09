import { UserRole } from "@/types";

export interface AuditEvent {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string; // e.g. "INTAKE_CREATED", "RATE_LOCKED", "BOXES_DEDUCTED", "QUALITY_REPORT_SAVED", "USER_ROLE_UPDATED"
  entityType: string; // e.g. "PROCUREMENT_TASK", "HARVEST_TASK", "INVENTORY_STOCK", "QUALITY_REPORT", "USER"
  entityId: string;
  details: string; // Human readable summary or JSON diff
  timestamp: Date;
}

// Initial In-Memory Audit Trail Log Store
export const mockAuditLogs: AuditEvent[] = [
  {
    id: "aud_101",
    userId: "u_1",
    userName: "Rajesh Kumar",
    userRole: "MAIN_ADMIN",
    action: "USER_ROLE_UPDATED",
    entityType: "USER",
    entityId: "u_3",
    details: "Updated user Arjun Nair role to FIELD_SUPERVISOR",
    timestamp: new Date("2026-07-28T10:15:00Z"),
  },
  {
    id: "aud_102",
    userId: "u_2",
    userName: "Priya Menon",
    userRole: "OFFICE_ADMIN",
    action: "RATE_LOCKED",
    entityType: "PROCUREMENT_TASK",
    entityId: "P_101",
    details: "Locked rate at ₹23.50/Kg for farmer Naresh Bhai Sankar Bhai",
    timestamp: new Date("2026-07-28T11:30:00Z"),
  },
  {
    id: "aud_103",
    userId: "u_3",
    userName: "Arjun Nair",
    userRole: "SUPERVISOR",
    action: "INVENTORY_DEDUCTED",
    entityType: "INVENTORY_STOCK",
    entityId: "ht_201",
    details: "Deducted 750 boxes (7KG & 13KG) from Main Inventory Stock for farm pickup",
    timestamp: new Date("2026-07-28T14:00:00Z"),
  },
  {
    id: "aud_104",
    userId: "u_5",
    userName: "Sunil Doke",
    userRole: "COLD_STORAGE_ADMIN",
    action: "QUALITY_REPORT_SAVED",
    entityType: "QUALITY_REPORT",
    entityId: "csr_301",
    details: "Saved official KD Cold Storage Quality Report for Truck GJ.22.U.2117 (Grade: A_GRADE_EXPORT)",
    timestamp: new Date("2026-07-28T16:45:00Z"),
  },
];

export function logAuditEvent(event: Omit<AuditEvent, "id" | "timestamp" | "userName"> & { userName?: string }) {
  const newLog: AuditEvent = {
    ...event,
    userName: event.userName || "System User",
    id: `aud_${Date.now()}`,
    timestamp: new Date(),
  };
  mockAuditLogs.unshift(newLog);
  return newLog;
}
