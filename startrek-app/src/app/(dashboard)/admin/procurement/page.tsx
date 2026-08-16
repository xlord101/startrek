"use client";

import { useState, useEffect } from "react";
import { store, useStartrekStore } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Search,
  MoreHorizontal,
  UserCheck,
  Eye,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  TrendingUp,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { ProcurementTask, ProcurementStatus } from "@/types";
import { AssignSupervisorModal } from "@/components/shared/AssignSupervisorModal";
import { ReviewProcurementModal } from "@/components/shared/ReviewProcurementModal";



const statCards = [
  {
    label: "Pending Assignment",
    status: "PENDING_ASSIGNMENT" as ProcurementStatus,
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200/80",
    ring: "ring-amber-400",
  },
  {
    label: "Assigned & In Field",
    status: "ASSIGNED" as ProcurementStatus,
    icon: UserCheck,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200/80",
    ring: "ring-sky-400",
  },
  {
    label: "Field Report Submitted",
    status: "FIELD_SUBMITTED" as ProcurementStatus,
    icon: AlertCircle,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200/80",
    ring: "ring-orange-400",
  },
  {
    label: "Approved & Locked",
    status: "APPROVED_PROCUREMENT" as ProcurementStatus,
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200/80",
    ring: "ring-emerald-400",
  },
];

export default function ProcurementPage() {
  const { procurementTasks } = useStartrekStore();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProcurementStatus | "ALL">("ALL");
  const [assignTarget, setAssignTarget] = useState<ProcurementTask | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ProcurementTask | null>(null);
  const [supervisors, setSupervisors] = useState<import("@/types").User[]>([]);
  const [currentUser, setCurrentUser] = useState<import("@/types").User | null>(null);

  useEffect(() => {
    const fetchData = () => {
      // Sync tasks live from database across all devices
      fetch("/api/procurement")
        .then((r) => {
          if (r.status === 401) window.location.href = '/login';
          return r.json();
        })
        .then((data) => {
          if (data.tasks) {
            store.setProcurementTasks(data.tasks);
          }
        })
        .catch(() => {});

      fetch("/api/users")
        .then((r) => {
          if (r.status === 401) window.location.href = '/login';
          return r.json();
        })
        .then((data) => {
          if (data.users) {
            setSupervisors(data.users.filter((u: any) => u.isActive && (u.role === "SUPERVISOR" || u.role === "OFFICE_ADMIN" || u.role === "MAIN_ADMIN")));
          }
        })
        .catch(() => {});
    };

    fetchData();

    fetch("/api/auth/me")
      .then((r) => {
        if (r.status === 401) window.location.href = '/login';
        return r.json();
      })
      .then((data) => { if (data.authenticated) setCurrentUser(data.user); })
      .catch(() => {});

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = procurementTasks.filter((t) => {
    const matchesSearch =
      t.farmer.name.toLowerCase().includes(search.toLowerCase()) ||
      t.farmer.address.toLowerCase().includes(search.toLowerCase()) ||
      t.farmer.mobileNumber.includes(search) ||
      (t.supervisor?.name && t.supervisor.name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === "ALL" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    PENDING_ASSIGNMENT: procurementTasks.filter((t) => t.status === "PENDING_ASSIGNMENT").length,
    ASSIGNED: procurementTasks.filter((t) => t.status === "ASSIGNED").length,
    FIELD_SUBMITTED: procurementTasks.filter((t) => t.status === "FIELD_SUBMITTED").length,
    APPROVED_PROCUREMENT: procurementTasks.filter((t) => t.status === "APPROVED_PROCUREMENT").length,
  };

  const totalTonnage = procurementTasks.reduce(
    (acc, t) => acc + (t.actualTonnage || t.approxTonnage),
    0
  );

  const handleAssignSupervisor = async (supervisorId: string) => {
    if (!assignTarget) return;

    const matchedSup = supervisors.find((s) => s.id === supervisorId);
    store.assignSupervisor(assignTarget.id, supervisorId, matchedSup?.name);

    try {
      await fetch("/api/procurement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: assignTarget.id,
          supervisorId,
          status: "ASSIGNED",
        }),
      });
      toast.success("Supervisor Assigned", {
        description: `Task assigned to ${matchedSup?.name || "supervisor"} and updated live across workstations.`,
      });
    } catch (e) {
      console.error("Failed to sync supervisor assignment to database", e);
    }

    setAssignTarget(null);
  };

  const handleApproveTask = async (taskId: string, finalRate: number) => {
    store.approveProcurement(taskId, finalRate);
    setReviewTarget(null);

    try {
      await fetch("/api/procurement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          status: "APPROVED_PROCUREMENT",
          finalRatePerKg: finalRate,
        }),
      });
      toast.success("Procurement Approved", {
        description: "Task approved and synced to database.",
      });
    } catch (e) {
      console.error("Failed to sync approval to database", e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 lg:px-8 py-5 bg-white border-b border-slate-200 shadow-2xs gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs flex-shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-heading">
                Procurement Management
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                Module 1 Active
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Track farm intakes, field inspections, quality assessments & final rate approvals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Volume: <strong className="text-slate-900 font-bold">{totalTonnage.toFixed(1)} Tons</strong></span>
          </div>

          <Link href="/admin/procurement/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold h-10 px-4 rounded-xl shadow-sm shadow-emerald-600/20 gap-2 flex items-center">
              <Plus className="w-4 h-4" />
              <span>New Farm Intake</span>
            </Button>
          </Link>
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
                placeholder="Search farmer, village, or supervisor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-slate-50 border-slate-200 text-sm rounded-xl focus-visible:ring-emerald-500 w-full"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
              {(["ALL", "PENDING_ASSIGNMENT", "ASSIGNED", "FIELD_SUBMITTED", "APPROVED_PROCUREMENT"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    filterStatus === st
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  {st === "ALL" ? "All Status" : st === "PENDING_ASSIGNMENT" ? "Pending" : st === "ASSIGNED" ? "Assigned" : st === "FIELD_SUBMITTED" ? "Submitted" : "Approved"}
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
                    Assigned Supervisor
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Yield Tonnage
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Quality & Ratio
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase pr-6 text-right py-3.5">
                    Actions
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
                        <p className="font-bold text-slate-900 text-sm">{task.farmer.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 max-w-[220px] truncate">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          {task.farmer.address}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      {task.supervisor ? (
                        <div>
                          <p className="font-bold text-slate-900 text-xs flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {task.supervisor.name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium uppercase">Active Field Staff</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unassigned</span>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">
                          {task.actualTonnage || task.approxTonnage} Tons
                        </span>
                        {task.actualTonnage && (
                          <span className="text-[10px] font-bold text-emerald-600 block">Verified on-site</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      {task.quality ? (
                        <div>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-2 py-0.5">
                            {task.quality}
                          </Badge>
                          {task.ratioPercentage && (
                            <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
                              Ratio: {task.ratioPercentage}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Pending Inspection</span>
                      )}
                    </TableCell>

                    <TableCell className="py-4">
                      <StatusBadge status={task.status} />
                    </TableCell>

                    <TableCell className="pr-6 text-right py-4">
                      <div className="flex items-center justify-end gap-2">
                        {task.status === "PENDING_ASSIGNMENT" && (
                          <Button
                            size="sm"
                            onClick={() => setAssignTarget(task)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 px-3 rounded-lg gap-1.5 shadow-xs"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Assign Supervisor
                          </Button>
                        )}
                        {task.status === "FIELD_SUBMITTED" && (
                          <Button
                            size="sm"
                            onClick={() => setReviewTarget(task)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 px-3 rounded-lg gap-1.5 shadow-xs"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            Review & Lock Rate
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg inline-flex items-center justify-center border border-slate-200">
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-slate-200">
                            <DropdownMenuItem onClick={() => setReviewTarget(task)} className="cursor-pointer text-slate-700 font-medium">
                              <Eye className="w-4 h-4 mr-2 text-slate-400" />
                              View Full Task
                            </DropdownMenuItem>
                            {(task.status === "ASSIGNED" || task.status === "FIELD_SUBMITTED") && (
                              <DropdownMenuItem
                                onClick={() => setAssignTarget(task)}
                                className="cursor-pointer text-sky-700 font-medium"
                              >
                                <UserCheck className="w-4 h-4 mr-2 text-sky-600" />
                                Change Supervisor / Admin
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Assign Supervisor Modal */}
      {assignTarget && (
        <AssignSupervisorModal
          task={assignTarget}
          supervisors={supervisors}
          onClose={() => setAssignTarget(null)}
          onAssign={handleAssignSupervisor}
        />
      )}

      {/* Review & Rate Lock Modal */}
      {reviewTarget && currentUser && (
        <ReviewProcurementModal
          task={reviewTarget}
          currentUser={currentUser as import("@/types").User}
          onClose={() => setReviewTarget(null)}
          onApprove={handleApproveTask}
        />
      )}
    </div>
  );
}
