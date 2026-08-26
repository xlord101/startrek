import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import type { User } from "@/types";
import HarvestingClient from "./harvesting-client";

export const dynamic = "force-dynamic";

/**
 * Server component — queries Supabase via Prisma directly and streams all
 * harvest tasks + reference data with the initial HTML. No API waterfall.
 */
export default async function AdminHarvestingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) redirect("/login");

  let initialTasks: any[] = [];
  let supervisors: User[] = [];
  const vehicleSuppliers: Array<{
    id: string;
    supplierName: string;
    vehicleNumber: string;
    driverName: string;
    driverPhone: string;
  }> = [];

  try {
    const [tasks, users, suppliers] = await Promise.all([
      prisma.harvestTask.findMany({
        include: {
          farmer: true,
          supervisor: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { isActive: true, role: "SUPERVISOR" },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.vehicleSupplier.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          supplierName: true,
          vehicleNumber: true,
          driverName: true,
          driverPhone: true,
        },
      }),
    ]);

    initialTasks = JSON.parse(
      JSON.stringify(
        tasks.map((t) => ({
          ...t,
          selectedBoxTypes: t.selectedBoxTypes.map((b) => b.replace("BOX_", "")),
        }))
      )
    );

    supervisors = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: "SUPERVISOR" as const,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));

    suppliers.forEach((s) => {
      vehicleSuppliers.push({
        id: s.id,
        supplierName: s.supplierName,
        vehicleNumber: s.vehicleNumber,
        driverName: s.driverName ?? "",
        driverPhone: s.driverPhone ?? "",
      });
    });
  } catch (error) {
    console.error("Harvesting page SSR query failed:", error);
    // Fail soft — client falls back to fetching via the API routes
  }

  return (
    <HarvestingClient
      supervisors={supervisors}
      vehicleSuppliers={vehicleSuppliers}
      initialTasks={initialTasks}
    />
  );
}