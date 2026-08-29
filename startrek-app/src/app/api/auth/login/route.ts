import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email/Username and password are required." },
        { status: 400 }
      );
    }

    const query = String(email).trim().toLowerCase();

    // Map legacy or shorthand email aliases to active enterprise accounts
    const aliasMap: Record<string, string> = {
      "ankush@startrek.com": "ankush.shinde@kdexport.com",
      "dinesh@startrek.com": "dinesh.magar@kdexport.com",
      "soyal@startrek.com": "soyal.mujavar@kdexport.com",
      "vishal@startrek.com": "vishal.naykudae@kdexport.com",
      "srirang@startrek.com": "srirang.engale@kdexport.com",
      "ajit@startrek.com": "ajit.landge@kdexport.com",
      "kd@startrek.com": "kdoffice@kdexport.com",
      "admin@startrek.com": "admin@kdexport.com",
      "coldstorage@startrek.com": "coldstorage@kdexport.com",
      "anis@startrek.com": "anis.momin@kdexport.com",
    };

    const targetQuery = aliasMap[query] || query;

    // 1. Fetch users safely (robust against PostgreSQL collations)
    const users = await prisma.user.findMany({
      where: { isActive: true },
    });

    const user = users.find(
      (u) =>
        u.email.toLowerCase() === targetQuery ||
        u.name.toLowerCase() === targetQuery ||
        u.email.toLowerCase() === query ||
        u.name.toLowerCase() === query
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    // 2. Verify password against bcrypt hash
    const isValid = await bcrypt.compare(String(password), user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role as import("@/types").UserRole,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Enforce single session: Delete any existing sessions for this user
    await prisma.session.deleteMany({
      where: { userId: user.id }
    });

    // Create the new session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: token,
        expiresAt: new Date(Date.now() + 60 * 60 * 24 * 1000), // 24 hours
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      }
    });

    // Set HTTP-Only Secure Cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error?.message || "Authentication failed." },
      { status: 500 }
    );
  }
}
