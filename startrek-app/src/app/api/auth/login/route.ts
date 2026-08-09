import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { mockUsers } from "@/lib/mock-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    // Fast demo login: find matching mock user by email or role
    const user = mockUsers.find(
      (u) => (email && u.email.toLowerCase() === email.toLowerCase()) || (role && u.role === role)
    ) || mockUsers[0];

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid credentials or account deactivated." },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
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
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
