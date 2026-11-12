import { Sidebar } from "@/components/layout/Sidebar";
import { PageTransition } from "@/components/layout/PageTransition";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);
  if (!payload) {
    redirect("/login");
  }

  let sessionUser = {
    userName: payload.name,
    userEmail: payload.email,
    userRole: payload.role as UserRole,
  };

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { name: true, email: true, role: true, isActive: true },
    });
    if (!dbUser || !dbUser.isActive) {
      redirect("/login");
    }
    sessionUser = {
      userName: dbUser.name,
      userEmail: dbUser.email,
      userRole: dbUser.role as UserRole,
    };
  } catch (error) {
    // Allow NEXT_REDIRECT to propagate; ignore only transient DB lookup errors
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      <Sidebar
        userRole={sessionUser.userRole}
        userName={sessionUser.userName}
        userEmail={sessionUser.userEmail}
      />
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
