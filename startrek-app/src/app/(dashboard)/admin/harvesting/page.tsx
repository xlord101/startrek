"use client";

import { useState } from "react";
import { mockHarvestTasks as initialMockTasks } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sprout,
  Search,
  MoreHorizontal,
  Users,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  TrendingUp,
  Truck,
  FlaskConical,
  Tag,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  HarvestTask,
  HarvestTaskStatus,
  HARVEST_STATUS_LABELS,
  CHEMICAL_LABELS,
  ChemicalOption,
} from "@/types";
import { AssignHarvestModal } from "@/components/shared/AssignHarvestModal";

const statCards = [
  {
    label: "Ready for Harvest",
    status: "READY_FOR_HARVEST" as HarvestTaskStatus,
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200/80",
    ring: "ring-amber-400",
  },
  {
    label: "Teams Assigned",
    status: "HARVEST_ASSIGNED" as HarvestTaskStatus,
    icon: Users,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200/80",
    ring: "ring-sky-400",
  },
  {
    label: "Harvest In Progress",
    status: "HARVEST_IN_PROGRESS" as HarvestTaskStatus,
    icon: AlertCircle,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200/80",
    ring: "ring-orange-400",
  },
  {
    label: "Dispatched to Cold Storage",
    status: "DISPATCHED_TO_COLD_STORAGE" as HarvestTaskStatus,
    icon: Truck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200/80",
    ring: "ring-emerald-400",
  },
];

export default function HarvestingPage() {
  const [tasks, setTasks] = useState<HarvestTask[]>(initialMockTasks);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<HarvestTaskStatus | "ALL">("ALL");

  const [assignTarget, setAssignTarget] = useState<HarvestTask | null>(null);

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      t.farmerName.toLowerCase().includes(search.toLowerCase()) ||
      t.address.toLowerCase().includes(search.toLowerCase()) ||
      (t.teamName && t.teamName.toLowerCase().includes(search.toLowerCase())) ||
      (t.truckNumber && t.truckNumber.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    READY_FOR_HARVEST: tasks.filter((t) => t.status === "READY_FOR_HARVEST").length,
    HARVEST_ASSIGNED: tasks.filter((t) => t.status === "HARVEST_ASSIGNED").length,
    HARVEST_IN_PROGRESS: tasks.filter((t) => t.status === "HARVEST_IN_PROGRESS").length,
    DISPATCHED_TO_COLD_STORAGE: tasks.filter(
      (t) => t.status === "DISPATCHED_TO_COLD_STORAGE" || t.status === "HARVEST_COMPLETED"
    ).length,
  };

  const totalHarvestTonnage = tasks.reduce((acc, t) => acc + t.tonnage, 0);

  const handleAssignTeam = (data: {
    teamName: string;
    brandName: string;
    chemicals: ChemicalOption[];
    pingIntervalHours: number;
  }) => {
    if (!assignTarget) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === assignTarget.id
          ? {
              ...t,
              status: "HARVEST_ASSIGNED" as HarvestTaskStatus,
              teamName: data.teamName,
              brandName: data.brandName,
              chemicals: data.chemicals,
              pingIntervalHours: data.pingIntervalHours,
              assignedAt: new Date(),
            }
          : t
      )
    );
    setAssignTarget(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 lg:px-8 py-5 bg-white border-b border-slate-200 shadow-2xs gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs flex-shrink-0">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-heading">
                Harvesting & Logistics Pipeline
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                Module 2 Active
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Allocate harvest teams, specify brand packing & chemical specs, track logistics dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Volume: <strong className="text-slate-900 font-bold">{totalHarvestTonnage} Tons</strong></span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Stat KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, status, icon: Icon, color, bg, border, ring }) => {
            const isSelected = filterStatus === status;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(isSelected ? "ALL" : status)}
                className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all duration-200 text-left bg-white shadow-soft ${
                  isSelected
                    ? `${border} ring-2 ${ring} bg-slate-50/50 shadow-md`
                    : "border-slate-200 hover:border-slate-300 hover:shadow-card"
                }`}
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {label}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900 font-heading">
                      {counts[status as keyof typeof counts] ?? 0}
                    </span>
                    <span className="text-xs text-slate-400 font-medium font-sans">farms</span>
                  </div>
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl ${bg} ${border} border shadow-2xs`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Table Toolbar & Container */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-slate-100 bg-white">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by farmer, team, or truck number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-slate-50 border-slate-200 text-sm rounded-xl focus-visible:ring-emerald-500 w-full"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
              {(["ALL", "READY_FOR_HARVEST", "HARVEST_ASSIGNED", "HARVEST_IN_PROGRESS", "DISPATCHED_TO_COLD_STORAGE"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    filterStatus === st
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  {st === "ALL" ? "All" : st === "READY_FOR_HARVEST" ? "Ready" : st === "HARVEST_ASSIGNED" ? "Assigned" : st === "HARVEST_IN_PROGRESS" ? "In Field" : "Dispatched"}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-6 py-3.5">
                    Farmer & Location
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Yield / Rate
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Assigned Harvest Squad
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Brand & Chemicals
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Logistics / Truck
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider pr-6 text-right py-3.5">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((task) => (
                  <TableRow
                    key={task.id}
                    className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                  >
                    <TableCell className="pl-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{task.farmerName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 max-w-[200px] truncate">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          {task.address}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                          {task.tonnage} Tons
                        </span>
                        <span className="block text-[11px] font-bold text-emerald-700 mt-1">
                          ₹{task.finalRate}/T
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-sm font-medium">
                      {task.teamName ? (
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{task.teamName}</p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">2-Hr Ping Active</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      {task.brandName ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <Tag className="w-3 h-3 text-slate-500" />
                            {task.brandName}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {task.chemicals?.map((chem, idx) => (
                              <Badge key={idx} variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[9px] font-semibold">
                                {CHEMICAL_LABELS[chem]?.split(" ")[0]}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Specs Pending</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      {task.truckNumber ? (
                        <div>
                          <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5 text-emerald-600" />
                            {task.truckNumber}
                          </span>
                          <span className="text-[11px] text-slate-500 block">Driver: {task.driverName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Not Dispatched</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          task.status === "READY_FOR_HARVEST"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : task.status === "HARVEST_ASSIGNED"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : task.status === "HARVEST_IN_PROGRESS"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {HARVEST_STATUS_LABELS[task.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right py-4">
                      <div className="flex items-center justify-end gap-2">
                        {task.status === "READY_FOR_HARVEST" && (
                          <Button
                            size="sm"
                            onClick={() => setAssignTarget(task)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3 rounded-lg gap-1.5 shadow-xs"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Assign Team
                          </Button>
                        )}
                        {task.status === "HARVEST_ASSIGNED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAssignTarget(task)}
                            className="border-slate-200 text-slate-700 text-xs font-bold h-8 px-3 rounded-lg gap-1.5"
                          >
                            Edit Specs
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg inline-flex items-center justify-center border border-slate-200">
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-200">
                            <DropdownMenuItem onClick={() => setAssignTarget(task)} className="cursor-pointer text-slate-700 font-medium">
                              <Eye className="w-4 h-4 mr-2 text-slate-400" />
                              View Harvest Specs
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filtered.map((task) => (
              <div key={task.id} className="p-4 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{task.farmerName}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {task.address}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-800 border-slate-200">
                    {task.tonnage} Tons
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Team</span>
                    <span className="font-bold text-slate-800">{task.teamName || "Unassigned"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Status</span>
                    <span className="font-bold text-emerald-800">{HARVEST_STATUS_LABELS[task.status]}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    Rate: <strong className="text-slate-800">₹{task.finalRate}/T</strong>
                  </span>
                  {task.status === "READY_FOR_HARVEST" && (
                    <Button
                      size="sm"
                      onClick={() => setAssignTarget(task)}
                      className="bg-emerald-600 text-white text-xs font-bold h-8 px-3 rounded-lg"
                    >
                      Assign Team
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assign Harvest Modal */}
      {assignTarget && (
        <AssignHarvestModal
          task={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssign={handleAssignTeam}
        />
      )}
    </div>
  );
}
