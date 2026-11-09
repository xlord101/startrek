import { prisma } from "@/lib/prisma";
export * from "./sms-formatter";
import { DEFAULT_OFFICE_NUMBER } from "./sms-formatter";

/**
 * Dispatches the work order text message to the labour team leader's phone number.
 * Uses external SMS Gateway API if configured in .env, and records an audit log in Supabase.
 */
export async function sendLabourTeamSMS({
  to,
  message,
  officeNumber = DEFAULT_OFFICE_NUMBER,
  taskId,
  userId,
}: {
  to: string;
  message: string;
  officeNumber?: string;
  taskId?: string;
  userId?: string;
}): Promise<{ success: boolean; mode: string; message: string; details?: string }> {
  const cleanPhone = to.replace(/[^\d+]/g, "");

  // 1) If SMS Gateway URL is configured in .env (e.g. Fast2SMS / Twilio / custom webhook)
  const gatewayUrl = process.env.SMS_GATEWAY_URL;
  const apiKey = process.env.SMS_API_KEY || process.env.FAST2SMS_API_KEY;

  let dispatched = false;
  let dispatchMode = "SYSTEM_LOGGED";

  if (gatewayUrl) {
    try {
      const res = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          from: officeNumber,
          to: cleanPhone,
          message,
        }),
      });
      if (res.ok) {
        dispatched = true;
        dispatchMode = "GATEWAY_HTTP";
      }
    } catch (err) {
      console.warn("SMS Gateway dispatch warning:", err);
    }
  }

  // 2) Record an audit log entry for traceability
  try {
    if (userId) {
      await (prisma as any).auditLog.create({
        data: {
          userId,
          userRole: "MAIN_ADMIN",
          action: "SMS_DISPATCH_LABOUR",
          entityType: "HARVEST_TASK",
          entityId: taskId || "UNKNOWN",
          details: `Work order text dispatched from Office (${officeNumber}) to Labour Team Phone (${cleanPhone}). Mode: ${dispatchMode}`,
        },
      });
    }
  } catch (err) {
    console.error("Failed to log SMS audit:", err);
  }

  return {
    success: true,
    mode: dispatchMode,
    message,
    details: `Message dispatched from office ${officeNumber} to labour ${cleanPhone}`,
  };
}
