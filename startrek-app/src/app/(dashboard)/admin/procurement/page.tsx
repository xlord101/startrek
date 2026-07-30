"use client";

import { useState } from "react";
import { mockTasks as initialMockTasks, mockUsers, mockCurrentUser } from "@/lib/mock-data";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
  Phone,
  TrendingUp,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { ProcurementTask, ProcurementStatus } from "@/types";
import { AssignSupervisorModal } from "@/components/shared/AssignSupervisorModal";
import { ReviewProcurementModal } from "@/components/shared/ReviewProcurementModal";

const supervisors = mockUsers.filter(
  (u) => u.role === "SUPERVISOR" && u.isActive
);

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
  const [tasks, setTasks] = useState<ProcurementTask[]>(initialMockTasks);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProcurementStatus | "ALL">(
    "ALL"
  );

  const [assignTarget, setAssignTarget] = useState<ProcurementTask | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ProcurementTask | null>(null);

  const currentUser = mockCurrentUser.office; // Office Admin

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      t.farmer.name.toLowerCase().includes(search.toLowerCase()) ||
      t.farmer.mobileNumber.includes(search) ||
      t.farmer.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      filterStatus === "ALL" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    PENDING_ASSIGNMENT: tasks.filter(
      (t) => t.status === "PENDING_ASSIGNMENT"
    ).length,
    ASSIGNED: tasks.filter((t) => t.status === "ASSIGNED").length,
    FIELD_SUBMITTED: tasks.filter((t) => t.status === "FIELD_SUBMITTED")
      .length,
    APPROVED_PROCUREMENT: tasks.filter(
      (t) => t.status === "APPROVED_PROCUREMENT"
    ).length,
  };

  const totalEstTonnage = tasks.reduce((acc, t) => acc + t.approxTonnage, 0);

  const handleAssignSupervisor = (supervisorId: string) => {
    if (!assignTarget) return;
    const supervisor = supervisors.find((s) => s.id === supervisorId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === assignTarget.id
          ? {
              ...t,
              status: "ASSIGNED" as ProcurementStatus,
              supervisorId,
              supervisor,
              assignedAt: new Date(),
            }
          : t
      )
    );
    setAssignTarget(null);
  };

  const handleApproveRate = (taskId: string, finalRate: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "APPROVED_PROCUREMENT" as ProcurementStatus,
              finalRate,
              approvedById: currentUser.id,
              approvedBy: currentUser,
              approvedAt: new Date(),
            }
          : t
      )
    );
    setReviewTarget(null);
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
                Procurement Pipeline
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                Module 1 Active
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage yield intake, allocate field supervisors, and approve rates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Intake: <strong className="text-slate-900 font-bold">{totalEstTonnage} Tons</strong></span>
          </div>

          <Link href="/admin/procurement/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 font-semibold gap-2 rounded-xl h-10 px-4 text-sm">
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Record New Intake
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
                onClick={() =>
                  setFilterStatus(isSelected ? "ALL" : status)
                }
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
                      {counts[status]}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">tasks</span>
                  </div>
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl ${bg} ${border} border shadow-2xs`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Table & Toolbar Container */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
          {/* Table toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-slate-100 bg-white">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search farmer name, phone or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-slate-50 border-slate-200 text-sm rounded-xl focus-visible:ring-emerald-500 w-full"
              />
            </div>

            {/* Status Filter Pills */}
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
                  {st === "ALL" ? "All" : st === "PENDING_ASSIGNMENT" ? "Pending" : st === "ASSIGNED" ? "Assigned" : st === "FIELD_SUBMITTED" ? "Review" : "Approved"}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Data Table */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-6 py-3.5">
                    Farmer & Location
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Contact
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Yield / Rate
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Assigned Supervisor
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5">
                    Sign-off Audit
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
                        <p className="font-bold text-slate-900 text-sm">
                          {task.farmer.name}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 max-w-[220px] truncate">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          {task.farmer.address}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-sm font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {task.farmer.mobileNumber}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                          {task.actualTonnage || task.approxTonnage} Tons
                        </span>
                        {task.finalRate && (
                          <span className="block text-[11px] font-bold text-emerald-700 mt-1">
                            ₹{task.finalRate}/T
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-sm font-medium">
                      {task.supervisor ? (
                        <div className="flex items-center gap-2 text-slate-900">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold border border-emerald-200">
                            {task.supervisor.name.charAt(0)}
                          </div>
                          <span>{task.supervisor.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <StatusBadge status={task.status} />
                    </TableCell>
                    <TableCell className="py-4 text-xs font-medium text-slate-500">
                      {task.approvedBy ? (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 inline-block">
                          Accepted by {task.approvedBy.role === "MAIN_ADMIN" ? "Main Admin" : "Office"}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          {task.createdAt.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      )}
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
                            Assign
                          </Button>
                        )}
                        {task.status === "FIELD_SUBMITTED" && (
                          <Button
                            size="sm"
                            onClick={() => setReviewTarget(task)}
                            className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold h-8 px-3 rounded-lg gap-1.5 shadow-xs"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            Review Rate
                          </Button>
                        )}
                        {task.status === "APPROVED_PROCUREMENT" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewTarget(task)}
                            className="border-slate-200 text-slate-700 text-xs font-bold h-8 px-3 rounded-lg gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            View Audit
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
                            {task.status === "PENDING_ASSIGNMENT" && (
                              <DropdownMenuItem
                                onClick={() => setAssignTarget(task)}
                                className="cursor-pointer text-emerald-700 font-medium"
                              >
                                <UserCheck className="w-4 h-4 mr-2 text-emerald-600" />
                                Assign Supervisor
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

          {/* Mobile Card List View (< sm screens) */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filtered.map((task) => (
              <div key={task.id} className="p-4 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{task.farmer.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {task.farmer.address}
                    </p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Contact</span>
                    <span className="font-bold text-slate-800">{task.farmer.mobileNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Yield / Rate</span>
                    <span className="font-bold text-slate-800">
                      {task.actualTonnage || task.approxTonnage} Tons {task.finalRate ? `(₹${task.finalRate})` : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    Supervisor: <strong className="text-slate-800">{task.supervisor?.name || "Unassigned"}</strong>
                  </span>
                  {task.status === "PENDING_ASSIGNMENT" && (
                    <Button
                      size="sm"
                      onClick={() => setAssignTarget(task)}
                      className="bg-emerald-600 text-white text-xs font-bold h-8 px-3 rounded-lg"
                    >
                      Assign
                    </Button>
                  )}
                  {task.status === "FIELD_SUBMITTED" && (
                    <Button
                      size="sm"
                      onClick={() => setReviewTarget(task)}
                      className="bg-orange-600 text-white text-xs font-bold h-8 px-3 rounded-lg"
                    >
                      Review
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal 1: Assign Supervisor */}
      {assignTarget && (
        <AssignSupervisorModal
          task={assignTarget}
          supervisors={supervisors}
          onClose={() => setAssignTarget(null)}
          onAssign={handleAssignSupervisor}
        />
      )}

      {/* Modal 2: Review & Rate Lock */}
      {reviewTarget && (
        <ReviewProcurementModal
          task={reviewTarget}
          currentUser={currentUser}
          onClose={() => setReviewTarget(null)}
          onApprove={handleApproveRate}
        />
      )}
    </div>
  );
}
