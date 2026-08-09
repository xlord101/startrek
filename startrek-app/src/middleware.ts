import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "startrek_enterprise_super_secret_jwt_key_2026"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public static assets & auth endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Extract auth_token cookie
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    // Redirect unauthenticated users to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const userRole = verified.payload.role as string;

    // RBAC Route Enforcement
    // 1. User Management (/admin/users) -> MAIN_ADMIN ONLY
    if (pathname.startsWith("/admin/users") && userRole !== "MAIN_ADMIN") {
      return NextResponse.redirect(new URL("/admin/procurement", request.url));
    }

    // 2. Inventory Admin (/admin/inventory) -> INVENTORY_ADMIN, MAIN_ADMIN, OFFICE_ADMIN
    if (
      pathname.startsWith("/admin/inventory") &&
      !["INVENTORY_ADMIN", "MAIN_ADMIN", "OFFICE_ADMIN"].includes(userRole)
    ) {
      return NextResponse.redirect(new URL("/supervisor", request.url));
    }

    // 3. Cold Storage Admin (/admin/cold-storage) -> COLD_STORAGE_ADMIN, MAIN_ADMIN, OFFICE_ADMIN
    if (
      pathname.startsWith("/admin/cold-storage") &&
      !["COLD_STORAGE_ADMIN", "MAIN_ADMIN", "OFFICE_ADMIN"].includes(userRole)
    ) {
      return NextResponse.redirect(new URL("/supervisor", request.url));
    }

    // Pass authenticated request
    const response = NextResponse.next();
    response.headers.set("x-user-role", userRole);
    response.headers.set("x-user-id", verified.payload.userId as string);
    return response;
  } catch (err) {
    // Invalid/expired token -> clear cookie & redirect to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/supervisor/:path*",
    "/harvesting/:path*",
    "/api/users/:path*",
    "/api/procurement/:path*",
  ],
};
