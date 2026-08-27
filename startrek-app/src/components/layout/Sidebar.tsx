"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  Users,
  PackageSearch,
  Snowflake,
  ChevronRight,
  Sprout,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { UserRole, ROLE_LABELS } from "@/types";

import Image from "next/image";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["MAIN_ADMIN", "OFFICE_ADMIN"],
  },
  {
    label: "Procurement",
    href: "/admin/procurement",
    icon: ClipboardList,
    roles: ["MAIN_ADMIN", "OFFICE_ADMIN"],
  },
  {
    label: "Harvesting & Field",
    href: "/admin/harvesting",
    icon: Sprout,
    roles: ["MAIN_ADMIN", "OFFICE_ADMIN"],
  },
  {
    label: "Supervisors",
    href: "/admin/supervisors",
    icon: UserCheck,
    roles: ["MAIN_ADMIN", "OFFICE_ADMIN"],
  },
  {
    label: "My Field Tasks",
    href: "/supervisor",
    icon: ClipboardList,
    roles: ["FIELD_SUPERVISOR", "PROCUREMENT_SUPERVISOR"],
  },
  {
    label: "Inventory",
    href: "/admin/inventory",
    icon: PackageSearch,
    roles: ["INVENTORY_ADMIN", "MAIN_ADMIN", "OFFICE_ADMIN"],
  },
  {
    label: "Cold Storage",
    href: "/admin/cold-storage",
    icon: Snowflake,
    roles: ["COLD_STORAGE_ADMIN", "MAIN_ADMIN", "OFFICE_ADMIN"],
  },
  {
    label: "User Management",
    href: "/admin/users",
    icon: Users,
    roles: ["MAIN_ADMIN", "OFFICE_ADMIN"],
  },
  {
    label: "Audit Trail",
    href: "/admin/audit-logs",
    icon: ShieldCheck,
    roles: ["MAIN_ADMIN", "OFFICE_ADMIN"],
  },
];

interface SidebarProps {
  userRole: UserRole;
  userName: string;
  userEmail: string;
}

export function SidebarContent({ userRole, userName, onItemClick }: SidebarProps & { onItemClick?: () => void }) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 shadow-2xs">
            <Image
              src="/images/kd-export-icon.png"
              alt="KD EXPORT Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 font-heading block leading-none">
              KD EXPORT
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-1">
        <div className="h-px bg-slate-100 w-full" />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-4 space-y-6 overflow-y-auto scrollbar-thin">
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Navigation Menu
          </p>
          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onItemClick}
                  className={cn(
                    "group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 relative",
                    isActive
                      ? "bg-emerald-50 text-emerald-800 shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-600 rounded-r-full" />
                  )}
                  <Icon
                    className={cn(
                      "w-4 h-4 flex-shrink-0 transition-colors",
                      isActive
                        ? "text-emerald-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User profile footer */}
      <div className="p-4 m-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 border border-emerald-200">
            <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {userName}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>{ROLE_LABELS[userRole]}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-bold rounded-xl text-xs transition-all shadow-2xs"
        >
          Sign Out / Logout
        </button>
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-slate-200 shadow-2xs sticky top-0 h-screen z-20">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile Top App Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs w-full">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 shadow-2xs">
            <Image
              src="/images/kd-export-icon.png"
              alt="KD EXPORT Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <span className="text-base font-bold text-slate-900 tracking-tight font-heading">
            KD EXPORT
          </span>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="h-9 w-9 text-slate-700 rounded-xl hover:bg-slate-100 inline-flex items-center justify-center border border-slate-200">
            <Menu className="w-5 h-5" />
            <span className="sr-only">Toggle menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-white border-r border-slate-200">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent {...props} onItemClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
