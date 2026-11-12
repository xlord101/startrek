import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (token) {
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    }
  } catch {
    // Always clear cookie even if session cleanup fails
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully." });
  response.cookies.delete("auth_token");
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
