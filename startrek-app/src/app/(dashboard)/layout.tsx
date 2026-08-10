import { Sidebar } from "@/components/layout/Sidebar";
import { cookies } from "next/headers";
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

  let sessionUser = {
    userName: "Main Admin",
    userEmail: "admin@kdexport.com",
    userRole: "MAIN_ADMIN" as UserRole,
  };

  if (token) {
    const payload = await verifyToken(token);
    if (payload?.userId) {
      // Fetch latest profile state from database
      const liveUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { name: true, email: true, role: true },
      });

      if (liveUser) {
        sessionUser = {
          userName: liveUser.name,
          userEmail: liveUser.email,
          userRole: liveUser.role as UserRole,
        };
      } else {
        sessionUser = {
          userName: payload.name,
          userEmail: payload.email,
          userRole: payload.role as UserRole,
        };
      }
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
        {children}
      </main>
    </div>
  );
}
