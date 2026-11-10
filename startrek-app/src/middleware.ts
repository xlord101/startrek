import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is missing. Refusing to start.");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

function clearAuthCookie(response: NextResponse) {
  response.cookies.delete("auth_token");
  response.cookies.set("auth_token", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

function redirectWithSameProtocol(request: NextRequest, targetPath: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public static assets & auth endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/images")
  ) {
    return NextResponse.next();
  }

  // Extract auth_token cookie
  const token = request.cookies.get("auth_token")?.value;

  // Handle root and /login explicitly
  if (pathname === "/" || pathname === "/login") {
    if (token) {
      try {
        const verified = await jwtVerify(token, JWT_SECRET);
        const userRole = verified.payload.role as string;

        // If authenticated and on /login or root, navigate to proper role landing page
        if (userRole === "FIELD_SUPERVISOR" || userRole === "PROCUREMENT_SUPERVISOR") {
          return redirectWithSameProtocol(request, "/supervisor");
        } else if (userRole === "INVENTORY_ADMIN") {
          return redirectWithSameProtocol(request, "/admin/inventory");
        } else if (userRole === "COLD_STORAGE_ADMIN") {
          return redirectWithSameProtocol(request, "/admin/cold-storage");
        } else {
          return redirectWithSameProtocol(request, "/admin");
        }
      } catch {
        // Invalid or expired token -> wipe cookie immediately
        if (pathname === "/login") {
          const response = NextResponse.next();
          clearAuthCookie(response);
          return response;
        } else {
          const response = redirectWithSameProtocol(request, "/login");
          clearAuthCookie(response);
          return response;
        }
      }
    }
    // No token
    if (pathname === "/login") {
      return NextResponse.next();
    }
    return redirectWithSameProtocol(request, "/login");
  }

  if (!token) {
    // Redirect unauthenticated users cleanly to /login
    return redirectWithSameProtocol(request, "/login");
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const userRole = verified.payload.role as string;

    // Strict RBAC Route Enforcement
    if (pathname.startsWith("/admin")) {
      if (userRole === "MAIN_ADMIN" || userRole === "OFFICE_ADMIN") {
        if (pathname.startsWith("/admin/users") && userRole !== "MAIN_ADMIN") {
          return redirectWithSameProtocol(request, "/admin");
        }
      } else if (userRole === "COLD_STORAGE_ADMIN") {
        if (!pathname.startsWith("/admin/cold-storage")) {
          return redirectWithSameProtocol(request, "/admin/cold-storage");
        }
      } else if (userRole === "INVENTORY_ADMIN") {
        if (!pathname.startsWith("/admin/inventory")) {
          return redirectWithSameProtocol(request, "/admin/inventory");
        }
      } else {
        // Field & Procurement Supervisors have ZERO access to any /admin section
        return redirectWithSameProtocol(request, "/supervisor");
      }
    }

    if (pathname.startsWith("/supervisor")) {
      if (userRole === "COLD_STORAGE_ADMIN") {
        return redirectWithSameProtocol(request, "/admin/cold-storage");
      }
      if (userRole === "INVENTORY_ADMIN") {
        return redirectWithSameProtocol(request, "/admin/inventory");
      }
    }

    // Pass authenticated request
    const response = NextResponse.next();
    response.headers.set("x-user-role", userRole);
    response.headers.set("x-user-id", verified.payload.userId as string);
    return response;
  } catch {
    // Invalid/expired token -> clear cookie & redirect cleanly to login
    const response = redirectWithSameProtocol(request, "/login");
    clearAuthCookie(response);
    return response;
  }
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin",
    "/admin/:path*",
    "/supervisor",
    "/supervisor/:path*",
    "/harvesting/:path*",
    "/api/users/:path*",
    "/api/procurement/:path*",
  ],
};
