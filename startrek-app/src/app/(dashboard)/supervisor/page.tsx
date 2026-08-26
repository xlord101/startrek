import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import SupervisorDashboardClient from "./supervisor-client";

export const dynamic = "force-dynamic";

/**
 * Server component — queries Supabase via Prisma directly and streams the
 * supervisor's tasks with the initial HTML. No API round-trip waterfall.
 */
export default async function SupervisorPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) redirect("/login");

  const currentUser = {
    id: payload.userId,
    name: payload.name,
    role: payload.role as string,
  };

  try {
    const [procurementTasks, harvestTasks] = await Promise.all([
      prisma.procurementTask.findMany({
        where: {
          supervisorId: payload.userId,
          status: { in: ["ASSIGNED", "FIELD_SUBMITTED", "APPROVED_PROCUREMENT"] },
        },
        include: {
          farmer: true,
          supervisor: { select: { id: true, name: true, email: true, role: true } },
          particulars: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.harvestTask.findMany({
        where: { supervisorId: payload.userId },
        include: {
          farmer: true,
          supervisor: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Normalize to the same JSON shape the API routes return
    const plainProcurement = JSON.parse(JSON.stringify(procurementTasks));
    const plainHarvest = JSON.parse(
      JSON.stringify(
        harvestTasks.map((t) => ({
          ...t,
          selectedBoxTypes: t.selectedBoxTypes.map((b) => b.replace("BOX_", "")),
        }))
      )
    );

    return (
      <SupervisorDashboardClient
        currentUser={currentUser}
        initialProcurementTasks={plainProcurement}
        initialHarvestTasks={plainHarvest}
      />
    );
  } catch (error) {
    console.error("Supervisor page SSR query failed:", error);
    // Fail soft — client will fall back to fetching via the API routes
    return <SupervisorDashboardClient currentUser={currentUser} />;
  }
}