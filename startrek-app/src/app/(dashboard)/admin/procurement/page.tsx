import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import ProcurementClient from "./procurement-client";

export const dynamic = "force-dynamic";

/**
 * Server component — queries Supabase via Prisma directly and streams all
 * procurement tasks with the initial HTML. No API round-trip waterfall.
 */
export default async function AdminProcurementPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) redirect("/login");
  if (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN" && payload.role !== "SUPERVISOR") {
    redirect("/");
  }

  try {
    const [tasks, users] = await Promise.all([
      prisma.procurementTask.findMany({
        include: {
          farmer: true,
          supervisor: { select: { id: true, name: true, email: true, role: true } },
          particulars: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { isActive: true, role: "SUPERVISOR" },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const currentUser = {
      id: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      isActive: true,
      createdAt: new Date(),
    };

    return (
      <ProcurementClient
        currentUser={currentUser as any}
        supervisors={JSON.parse(JSON.stringify(users)) as any}
        initialTasks={JSON.parse(JSON.stringify(tasks))}
      />
    );
  } catch (error) {
    console.error("Admin procurement page SSR query failed:", error);
    // Fail soft — client falls back to fetching via the API routes
    return (
      <ProcurementClient
        currentUser={{ id: payload.userId, name: payload.name, email: payload.email, role: payload.role, isActive: true, createdAt: new Date() } as any}
        supervisors={[]}
      />
    );
  }
}