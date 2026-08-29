import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { logAuditEvent } from "@/lib/audit";

// PATCH /api/users/[id] — Update user name, role, or active status
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawParams = await context.params;
    const id = rawParams?.id;
    if (!id) {
      return NextResponse.json({ error: "User ID parameter required" }, { status: 400 });
    }

    const body = await request.json();
    const { name, role, isActive, password } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = String(name).trim();
    if (role !== undefined) dataToUpdate.role = role;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);
    if (password) {
      dataToUpdate.passwordHash = await bcrypt.hash(String(password).trim(), 12);
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

    const changeSummary = [
      name !== undefined ? `renamed to "${updatedUser.name}"` : null,
      role !== undefined ? `role changed to ${updatedUser.role}` : null,
      isActive !== undefined ? `${updatedUser.isActive ? "activated" : "deactivated"} account` : null,
      password ? "reset password" : null,
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
      const freshToken = await (await import("@/lib/auth")).signToken({
        userId: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role as import("@/types").UserRole,
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
  } catch (error: any) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update user" },
      { status: 500 }
    );
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
    if (!payload || (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN")) {
      return NextResponse.json({ error: "Forbidden — Admin privilege required" }, { status: 403 });
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
  } catch (error: any) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete user account" },
      { status: 500 }
    );
  }
}
