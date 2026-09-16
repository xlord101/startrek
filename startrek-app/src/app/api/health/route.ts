import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Always execute on each hit — a cached health response would register no
// database activity and defeat the purpose of this endpoint.
export const dynamic = "force-dynamic";

/**
 * Touch the database with a real query.
 *
 * Supabase (free tier) flags a project for pausing when there has been no API
 * request or database connection for ~7 days. A cron run that *fails* to reach
 * the database registers no activity at all, so we retry once — a cold-started
 * serverless function can fail its first pooled connection attempt.
 */
async function touchDatabase(): Promise<number> {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.user.count();
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      console.warn(`Health check DB attempt ${attempt} failed, retrying…`, error);

      // Clear a possibly poisoned connection pool before retrying so the
      // second attempt opens a fresh connection.
      try {
        await prisma.$disconnect();
      } catch {
        /* ignore — the retry below decides success */
      }

      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }

  throw new Error("Health check failed after retries");
}

// GET /api/health — Keep-alive + readiness probe for Supabase & Vercel Cron
export async function GET() {
  try {
    const userCount = await touchDatabase();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      userCount,
    });
  } catch (error) {
    console.error("GET /api/health error:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
