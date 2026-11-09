import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { HARVEST_TEAMS } from "@/types";

const DEFAULT_LABOUR_TEAMS = [
  { teamName: HARVEST_TEAMS[0] || "Harvest Team 1 (North Kanyakumari)", leaderName: "Ramesh Pawar", contactNumber: "+91 98221 12345", memberCount: 12 },
  { teamName: HARVEST_TEAMS[1] || "Harvest Team 2 (Agastheeswaram)", leaderName: "Sanjay Shinde", contactNumber: "+91 97654 23456", memberCount: 15 },
  { teamName: HARVEST_TEAMS[2] || "Harvest Team 3 (Thovalai)", leaderName: "Anand Jadhav", contactNumber: "+91 94220 34567", memberCount: 10 },
  { teamName: HARVEST_TEAMS[3] || "Harvest Team 4 (Marthandam)", leaderName: "Ganesh Kadam", contactNumber: "+91 91588 45678", memberCount: 14 },
  { teamName: HARVEST_TEAMS[4] || "Harvest Team 5 (Colachel)", leaderName: "Sunil Mane", contactNumber: "+91 98901 56789", memberCount: 12 },
];

// GET /api/labour-teams — List labour teams (persisted in Supabase)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let teams = await (prisma as any).labourTeam.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Auto-seed default teams if empty so user has starter options with numbers
    if (teams.length === 0) {
      for (const d of DEFAULT_LABOUR_TEAMS) {
        await (prisma as any).labourTeam.create({ data: d });
      }
      teams = await (prisma as any).labourTeam.findMany({
        orderBy: { createdAt: "asc" },
      });
    }

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("GET /api/labour-teams error:", error);
    return NextResponse.json({ error: "Failed to fetch labour teams" }, { status: 500 });
  }
}

// POST /api/labour-teams — Register a new labour team
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { teamName, leaderName, contactNumber, memberCount } = body;

    if (!teamName || !contactNumber) {
      return NextResponse.json({ error: "Team name and contact number required" }, { status: 400 });
    }

    const team = await (prisma as any).labourTeam.create({
      data: {
        teamName: String(teamName).trim(),
        leaderName: leaderName ? String(leaderName).trim() : null,
        contactNumber: String(contactNumber).trim(),
        memberCount: parseInt(memberCount, 10) || 10,
        isActive: true,
      },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error("POST /api/labour-teams error:", error);
    return NextResponse.json({ error: "Failed to create labour team" }, { status: 500 });
  }
}

// PUT /api/labour-teams — Update an existing labour team
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, teamName, leaderName, contactNumber, memberCount, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Labour team ID required" }, { status: 400 });
    }

    const updated = await (prisma as any).labourTeam.update({
      where: { id },
      data: {
        ...(teamName ? { teamName: String(teamName).trim() } : {}),
        ...(leaderName !== undefined ? { leaderName: leaderName ? String(leaderName).trim() : null } : {}),
        ...(contactNumber ? { contactNumber: String(contactNumber).trim() } : {}),
        ...(memberCount ? { memberCount: parseInt(memberCount, 10) || 10 } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    return NextResponse.json({ team: updated });
  } catch (error) {
    console.error("PUT /api/labour-teams error:", error);
    return NextResponse.json({ error: "Failed to update labour team" }, { status: 500 });
  }
}

// DELETE /api/labour-teams — Remove a labour team
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    await (prisma as any).labourTeam.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Labour team deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/labour-teams error:", error);
    return NextResponse.json({ error: "Failed to delete labour team" }, { status: 500 });
  }
}

