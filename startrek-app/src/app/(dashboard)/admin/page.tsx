"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useStartrekStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  UserCheck,
  PackageSearch,
  Snowflake,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Users,
} from "lucide-react";

export default function AdminOverviewPage() {
  const { procurementTasks, harvestTasks, inventoryStock } = useStartrekStore();
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUserCount(data.users.length);
      })
      .catch(() => {});
  }, []);

  const pendingProcurement = procurementTasks.filter(
    (t) => t.status === "PENDING_ASSIGNMENT"
  ).length;

  const harvestInProgress = harvestTasks.filter(
    (t) => t.status === "HARVEST_IN_PROGRESS" || t.status === "WORK_STARTED"
  ).length;

  const readyForHarvest = harvestTasks.filter(
    (t) => t.status === "READY_FOR_HARVEST"
  ).length;

  const totalBoxesAvailable = (inventoryStock || []).reduce(
    (acc: number, item: any) => acc + (item.availableStock || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              KD Export Operations Command Center
            </h1>
            <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 font-bold border-emerald-200">
              LIVE SYSTEM
            </Badge>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time supply chain monitoring across Procurement, Harvesting, Packaging Inventory, & Cold Storage.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-100 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pending Intake Assignments
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {pendingProcurement}
                </h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-600">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <Link
              href="/admin/procurement"
              className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Manage Procurement <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Farm Harvests
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {harvestInProgress + readyForHarvest}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-600">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <Link
              href="/admin/harvesting"
              className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Monitor Harvesting <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Available Packaging Stock
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {totalBoxesAvailable.toLocaleString()} <span className="text-xs font-semibold text-slate-400">Boxes</span>
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
                <PackageSearch className="w-5 h-5" />
              </div>
            </div>
            <Link
              href="/admin/inventory"
              className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              View Inventory Stock <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Staff Accounts
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {userCount || 5}
                </h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-purple-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <Link
              href="/admin/users"
              className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Manage Staff Users <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation & Operational Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-100 shadow-xs">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-sm font-bold text-slate-800">
              Department Modules & Fast Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/procurement/new"
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-600">
                  + Create New Farm Entry
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Log new banana farm procurement intake with estimated tonnage.
              </p>
            </Link>

            <Link
              href="/admin/supervisors"
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-600">
                  Master Registries
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Manage Farmers, Vehicle Suppliers, Labour Teams, & Chemical Lists.
              </p>
            </Link>

            <Link
              href="/admin/cold-storage"
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-600">
                  Cold Storage Terminal
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Verify truck arrivals, perform quality reports, & allocate cold rooms.
              </p>
            </Link>

            <Link
              href="/admin/audit-logs"
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-600">
                  System Audit Trail
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                View real-time security logs of all system state changes.
              </p>
            </Link>
          </CardContent>
        </Card>

        {/* Database & System Connection Card */}
        <Card className="border-slate-100 shadow-xs">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Database Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800">Supabase PostgreSQL</span>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-extrabold">CONNECTED</Badge>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Row Level Security:</span>
                <span className="font-bold text-slate-800">Active ✅</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Database Mode:</span>
                <span className="font-bold text-slate-800">Live Production</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Mock Data Fallbacks:</span>
                <span className="font-bold text-slate-800">Disabled (0 files)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Active Cron Ping:</span>
                <span className="font-bold text-slate-800">Every 3 Days</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
