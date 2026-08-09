import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/health — Lightweight keep-alive query for Supabase & Vercel Cron
export async function GET() {
  try {
    // Quick count query to keep PostgreSQL active
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      userCount,
    });
  } catch (error) {
    return NextResponse.json({ status: "error", message: "Database connection failed" }, { status: 500 });
  }
}
