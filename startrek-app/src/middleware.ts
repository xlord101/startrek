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
    pathname.startsWith("/manifest.json")
  ) {
    return NextResponse.next();
  }

  // Extract auth_token cookie
  const token = request.cookies.get("auth_token")?.value;

  // Handle /login page explicitly
  if (pathname === "/login") {
    if (token) {
      try {
        const verified = await jwtVerify(token, JWT_SECRET);
        const userRole = verified.payload.role as string;
        
        // If already authenticated, redirect away from /login to role landing page
        if (userRole === "FIELD_SUPERVISOR" || userRole === "PROCUREMENT_SUPERVISOR") {
          return NextResponse.redirect(new URL("/supervisor", request.url));
        } else if (userRole === "INVENTORY_ADMIN") {
          return NextResponse.redirect(new URL("/admin/inventory", request.url));
        } else if (userRole === "COLD_STORAGE_ADMIN") {
          return NextResponse.redirect(new URL("/admin/cold-storage", request.url));
        } else {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      } catch {
        // Invalid token on /login -> proceed to render login form
        const response = NextResponse.next();
        response.cookies.delete("auth_token");
        return response;
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    // Redirect unauthenticated users cleanly to /login without query string clutter
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const userRole = verified.payload.role as string;

    // RBAC Route Enforcement
    if (pathname.startsWith("/admin/users") && userRole !== "MAIN_ADMIN" && userRole !== "OFFICE_ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (
      pathname.startsWith("/admin/inventory") &&
      !["INVENTORY_ADMIN", "MAIN_ADMIN", "OFFICE_ADMIN"].includes(userRole)
    ) {
      return NextResponse.redirect(new URL("/supervisor", request.url));
    }

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
    // Invalid/expired token -> clear cookie & redirect cleanly to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: [
    "/login",
    "/admin/:path*",
    "/supervisor/:path*",
    "/harvesting/:path*",
    "/api/users/:path*",
    "/api/procurement/:path*",
  ],
};
