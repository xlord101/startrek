import { db } from "@/lib/db";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: "INFO" | "ASSIGNMENT" | "FIELD_SUBMISSION" | "APPROVAL";
  link?: string;
}

/**
 * Create a live in-app notification for a staff user.
 */
export async function createNotification({
  userId,
  title,
  message,
  type = "INFO",
  link,
}: CreateNotificationParams) {
  try {
    return await db.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link: link || null,
      },
    });
  } catch (error) {
    console.error("⚠️ Failed to create notification:", error);
  }
}
