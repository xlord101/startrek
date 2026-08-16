import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { UserRole } from "@/types";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "startrek_enterprise_super_secret_jwt_key_2026"
);

export interface JWTPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

// 1. Password Hashing & Verification
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 2. JWT Token Signing & Verification (Edge Middleware Compatible)
export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload as unknown as JWTPayload;

    // Single Session Enforcement: Check if this token is the active one in the DB
    const session = await prisma.session.findFirst({
      where: { userId: payload.userId, token: token }
    });

    if (!session) {
      return null; // Token is cryptographically valid but superseded by another login
    }

    return payload;
  } catch (error) {
    return null;
  }
}

// 3. Role Access Hierarchy Check
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  MAIN_ADMIN: 5,
  OFFICE_ADMIN: 4,
  SUPERVISOR: 3,
  INVENTORY_ADMIN: 3,
  COLD_STORAGE_ADMIN: 3,
};

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  if (userRole === "MAIN_ADMIN") return true;
  if (userRole === requiredRole) return true;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
