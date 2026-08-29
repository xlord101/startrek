"use client";

import { useState, useEffect } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
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

export function SidebarContent({
  userRole,
  userName,
  isCollapsed = false,
  onToggleCollapse,
  onItemClick,
}: SidebarProps & {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onItemClick?: () => void;
}) {
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
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className={cn(
        "flex items-center py-4 transition-all duration-200",
        isCollapsed ? "justify-center px-2" : "justify-between px-5"
      )}>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 shadow-2xs flex-shrink-0">
            <Image
              src="/images/kd-export-icon.png"
              alt="KD EXPORT Logo"
              width={38}
              height={38}
              className="object-contain"
            />
          </div>
          {!isCollapsed && (
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 font-heading block leading-none">
                KD EXPORT
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ERP Suite</span>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleCollapse}
            className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg hidden lg:flex"
            title={isCollapsed ? "Expand Sidebar (☰)" : "Collapse Sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
        )}
      </div>

      <div className="px-4 py-1">
        <div className="h-px bg-slate-100 w-full" />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-thin">
        <div>
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Menu
            </p>
          )}
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
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "group flex items-center rounded-xl text-sm font-bold transition-all duration-150 relative",
                    isCollapsed ? "justify-center p-3" : "gap-3 px-3.5 py-2.5",
                    isActive
                      ? "bg-emerald-50 text-emerald-800 shadow-2xs border border-emerald-200/60"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-600 rounded-r-full" />
                  )}
                  <Icon
                    className={cn(
                      "w-4.5 h-4.5 flex-shrink-0 transition-colors",
                      isActive
                        ? "text-emerald-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 font-heading text-xs">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User profile footer */}
      <div className={cn(
        "m-2 rounded-2xl bg-slate-50 border border-slate-200/80 transition-all",
        isCollapsed ? "p-2 text-center" : "p-3.5 space-y-3"
      )}>
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "gap-3"
        )}>
          <Avatar className="w-8 h-8 border border-emerald-200 flex-shrink-0" title={userName}>
            <AvatarFallback className="bg-emerald-600 text-white text-xs font-black">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {userName}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span className="truncate">{ROLE_LABELS[userRole]}</span>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          title="Sign Out"
          className={cn(
            "w-full flex items-center justify-center bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-bold rounded-xl text-xs transition-all shadow-2xs",
            isCollapsed ? "py-2 px-1 mt-2" : "py-2 px-3 gap-2"
          )}
        >
          <LogOut className="w-3.5 h-3.5" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load persistence from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("kd_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("kd_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <>
      {/* Desktop Persistent Sidebar with Toggle Support */}
      <aside
        className={cn(
          "hidden lg:flex flex-col min-h-screen bg-white border-r border-slate-200 shadow-2xs sticky top-0 h-screen z-20 transition-all duration-200",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent
          {...props}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
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
          <span className="text-base font-black text-slate-900 tracking-tight font-heading">
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
            <SidebarContent {...props} isCollapsed={false} onItemClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
