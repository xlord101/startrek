import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyToken } from "@/lib/auth";
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

// GET /api/users — List all staff (admin only)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users — Create new staff account (Main Admin only)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "MAIN_ADMIN") {
      return NextResponse.json({ error: "Forbidden — Main Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedPassword = String(password).trim();
    const requestedRole = String(role) as UserRole;

    if (!trimmedName || !normalizedEmail) {
      return NextResponse.json({ error: "Valid name and email are required" }, { status: 400 });
    }
    if (trimmedPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    if (!VALID_USER_ROLES.has(requestedRole)) {
      return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(trimmedPassword);
    const user = await prisma.user.create({
      data: { name: trimmedName, email: normalizedEmail, passwordHash, role: requestedRole, isActive: true },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    await logAuditEvent({
      userId: payload.userId,
      userRole: payload.role,
      action: "USER_CREATED",
      entityType: "USER",
      entityId: user.id,
      details: `Created staff account ${user.name} (${user.email}) with role ${user.role}`,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
