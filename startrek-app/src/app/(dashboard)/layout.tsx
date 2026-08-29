import { Sidebar } from "@/components/layout/Sidebar";
import { PageTransition } from "@/components/layout/PageTransition";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
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
    if (payload) {
      sessionUser = {
        userName: payload.name || "Main Admin",
        userEmail: payload.email || "admin@kdexport.com",
        userRole: (payload.role as UserRole) || "MAIN_ADMIN",
      };
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
