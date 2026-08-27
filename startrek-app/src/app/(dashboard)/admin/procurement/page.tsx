import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import type { User } from "@/types";
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
  if (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN" && payload.role !== "PROCUREMENT_SUPERVISOR") {
    redirect("/");
  }

  const currentUser: User = {
    id: payload.userId,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    isActive: true,
    createdAt: new Date(),
  };

  let initialTasks: any[] = [];
  let supervisors: User[] = [];

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
        where: { isActive: true, role: "FIELD_SUPERVISOR" },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    initialTasks = JSON.parse(JSON.stringify(tasks));

    supervisors = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as any,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
  } catch (error) {
    console.error("Admin procurement page SSR query failed:", error);
    // Fail soft — client falls back to fetching via the API routes
  }

  return (
    <ProcurementClient
      currentUser={currentUser}
      supervisors={supervisors}
      initialTasks={initialTasks}
    />
  );
}