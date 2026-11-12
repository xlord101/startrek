import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logAuditEvent } from "@/lib/audit";
import type { UserRole } from "@/types";

const VALID_USER_ROLES = new Set<UserRole>([
  "MAIN_ADMIN",
  "OFFICE_ADMIN",
  "PROCUREMENT_SUPERVISOR",
  "FIELD_SUPERVISOR",
  "INVENTORY_ADMIN",
  "COLD_STORAGE_ADMIN",
]);

// PATCH /api/users/[id] — Update user name, role, or active status (Main Admin only)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "MAIN_ADMIN") {
      return NextResponse.json({ error: "Forbidden — Main Admin privilege required" }, { status: 403 });
    }

    const rawParams = await context.params;
    const id = rawParams?.id;
    if (!id) {
      return NextResponse.json({ error: "User ID parameter required" }, { status: 400 });
    }

    const body = await request.json();
    const { name, role, isActive, password } = body;

    const dataToUpdate: Record<string, unknown> = {};
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      dataToUpdate.name = trimmedName;
    }
    if (role !== undefined) {
      const requestedRole = String(role) as UserRole;
      if (!VALID_USER_ROLES.has(requestedRole)) {
        return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
      }
      dataToUpdate.role = requestedRole;
    }
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);
    if (password !== undefined && String(password).trim() !== "") {
      const trimmedPassword = String(password).trim();
      if (trimmedPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      dataToUpdate.passwordHash = await hashPassword(trimmedPassword);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Revoke active sessions if user was deactivated, role changed, or password reset
    if (
      (isActive !== undefined && !updatedUser.isActive) ||
      role !== undefined ||
      Boolean(dataToUpdate.passwordHash)
    ) {
      await prisma.session.deleteMany({ where: { userId: updatedUser.id } });
    }

    const changeSummary = [
      name !== undefined ? `renamed to "${updatedUser.name}"` : null,
      role !== undefined ? `role changed to ${updatedUser.role}` : null,
      isActive !== undefined ? `${updatedUser.isActive ? "activated" : "deactivated"} account` : null,
      dataToUpdate.passwordHash ? "reset password" : null,
    ]
      .filter(Boolean)
      .join(", ");

    await logAuditEvent({
      userId: payload.userId,
      userRole: payload.role,
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: updatedUser.id,
      details: `Updated user ${updatedUser.name} — ${changeSummary}`,
    });

    const response = NextResponse.json({ user: updatedUser });

    // If logged in user updated their own name/role, update auth_token cookie
    if (payload.userId === updatedUser.id) {
      const freshToken = await signToken({
        userId: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role as UserRole,
      });

      response.cookies.set("auth_token", freshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/users/[id] — Permanently remove user account
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "MAIN_ADMIN") {
      return NextResponse.json({ error: "Forbidden — Main Admin privilege required" }, { status: 403 });
    }

    const rawParams = await context.params;
    const id = rawParams?.id;
    if (!id) {
      return NextResponse.json({ error: "User ID parameter required" }, { status: 400 });
    }

    if (payload.userId === id) {
      return NextResponse.json({ error: "You cannot delete your own active account" }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    // Delete sessions and notifications related to this user
    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.notification.deleteMany({ where: { userId: id } });

    // Permanently delete user
    await prisma.user.delete({ where: { id } });

    await logAuditEvent({
      userId: payload.userId,
      userRole: payload.role,
      action: "USER_DELETED",
      entityType: "USER",
      entityId: id,
      details: `Permanently deleted staff account ${userToDelete.name} (${userToDelete.email}) - Role: ${userToDelete.role}`,
    });

    return NextResponse.json({ success: true, message: `User ${userToDelete.name} deleted successfully` });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete user account" }, { status: 500 });
  }
}
