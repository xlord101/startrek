import { Sidebar } from "@/components/layout/Sidebar";
import { UserRole } from "@/types";

// Mock session — will be replaced with NextAuth session later
const mockSession = {
  userName: "Rajesh Kumar",
  userEmail: "rajesh@startrek.com",
  userRole: "MAIN_ADMIN" as UserRole,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      <Sidebar
        userRole={mockSession.userRole}
        userName={mockSession.userName}
        userEmail={mockSession.userEmail}
      />
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
