import { NextResponse } from "next/server";
import { signToken, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LOGIN_WINDOW_MS = 5 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
const MAX_RATE_ENTRIES = 1000;
const failedLoginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim().slice(0, 64) || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim().slice(0, 64) || "unknown";
}

function getRateLimitRetrySeconds(key: string): number {
  const now = Date.now();
  const entry = failedLoginAttempts.get(key);
  if (!entry) return 0;
  if (now >= entry.resetAt) {
    failedLoginAttempts.delete(key);
    return 0;
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  }
  return 0;
}

function recordFailedLoginAttempt(key: string) {
  const now = Date.now();
  if (failedLoginAttempts.size >= MAX_RATE_ENTRIES) {
    for (const [k, v] of failedLoginAttempts) {
      if (now >= v.resetAt) failedLoginAttempts.delete(k);
    }
    if (failedLoginAttempts.size >= MAX_RATE_ENTRIES) {
      const oldestKey = failedLoginAttempts.keys().next().value;
      if (oldestKey) failedLoginAttempts.delete(oldestKey);
    }
  }
  const existing = failedLoginAttempts.get(key);
  if (!existing || now >= existing.resetAt) {
    failedLoginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    existing.count += 1;
  }
}

export async function POST(request: Request) {
  try {
    let email = "";
    let password = "";

    try {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await request.json();
        email = body.email;
        password = body.password;
      } else if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        const formData = await request.formData();
        email = (formData.get("email") as string) || "";
        password = (formData.get("password") as string) || "";
      } else {
        const raw = await request.text();
        if (raw) {
          const parsed = JSON.parse(raw);
          email = parsed.email;
          password = parsed.password;
        }
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid login request payload." },
        { status: 400 }
      );
    }

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
    const clientIp = getClientIp(request);
    const rateLimitKey = `${clientIp}:${targetQuery}`;
    const retryAfterSeconds = getRateLimitRetrySeconds(rateLimitKey);
    if (retryAfterSeconds > 0) {
      return NextResponse.json(
        { error: "Too many failed login attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    // 1. Fetch matching active account directly (no full table scan)
    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          { email: { equals: targetQuery, mode: "insensitive" as const } },
          { name: { equals: targetQuery, mode: "insensitive" as const } },
          ...(targetQuery !== query
            ? [
                { email: { equals: query, mode: "insensitive" as const } },
                { name: { equals: query, mode: "insensitive" as const } },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user) {
      recordFailedLoginAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    // 2. Verify password against bcrypt hash
    const isValid = await verifyPassword(String(password), user.passwordHash);
    if (!isValid) {
      recordFailedLoginAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    failedLoginAttempts.delete(rateLimitKey);

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

    // Clean up expired sessions for this user (supports seamless multi-device usage)
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    });

    // Create the new session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: token,
        expiresAt: new Date(Date.now() + 60 * 60 * 24 * 1000), // 24 hours
        ipAddress: clientIp,
        userAgent: (request.headers.get("user-agent") || "unknown").slice(0, 256),
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
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
