"use client";

import { store, useStartrekStore } from "@/lib/store";
import { useLayoutEffect, useCallback, useState, useMemo, useEffect } from "react";
import { useLiveData } from "@/hooks/useLiveData";
import { useSearchParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Phone,
  Weight,
  ClipboardCheck,
  CheckCircle2,
  Smartphone,
  ChevronRight,
  Plus,
  Sprout,
  ClipboardList,
  Truck,
  Users,
  Edit3,
  Save,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { ROLE_LABELS } from "@/types";
import { SupervisorAddFarmerModal } from "@/components/shared/SupervisorAddFarmerModal";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface SupervisorDashboardClientProps {
  currentUser: { id: string; name: string; role: string } | null;
  initialProcurementTasks?: any[];
  initialHarvestTasks?: any[];
}

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SupervisorDashboardClient({
  currentUser,
  initialProcurementTasks,
  initialHarvestTasks,
}: SupervisorDashboardClientProps) {
  const { procurementTasks, harvestTasks } = useStartrekStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Section switcher: 'harvesting' (default) or 'procurement'
  const sectionParam = searchParams.get("section");
  const activeSection: "harvesting" | "procurement" =
    sectionParam === "procurement" ? "procurement" : "harvesting";

  // Date filter defaults strictly to Today
  const [startDate, setStartDate] = useState<string>(() => getTodayStr());
  const [endDate, setEndDate] = useState<string>(() => getTodayStr());
  const [isAddFarmerModalOpen, setIsAddFarmerModalOpen] = useState(false);
  const [taskTab, setTaskTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [selectedHarvestTask, setSelectedHarvestTask] = useState<any | null>(null);

  const isWithinDateRange = useCallback(
    (dateStr?: string | Date | null) => {
      if (!startDate && !endDate) return true;
      if (!dateStr) return true;
      const date = new Date(dateStr);
      if (startDate) {
        const [sy, sm, sd] = startDate.split("-").map(Number);
        const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        if (date < start) return false;
      }
      if (endDate) {
        const [ey, em, ed] = endDate.split("-").map(Number);
        const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        if (date > end) return false;
      }
      return true;
    },
    [startDate, endDate]
  );

  // Hydrate store on mount
  const hasInitialData =
    (initialProcurementTasks && initialProcurementTasks.length > 0) ||
    (initialHarvestTasks && initialHarvestTasks.length > 0);

  useLayoutEffect(() => {
    if (initialProcurementTasks?.length) {
      store.setProcurementTasks(initialProcurementTasks as any);
    }
    if (initialHarvestTasks?.length) {
      store.setHarvestTasks(initialHarvestTasks as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTaskData = useCallback(() => {
    fetch("/api/procurement")
      .then((r) => {
        if (r.status === 401) window.location.href = "/login";
        return r.json();
      })
      .then((data) => {
        if (data.tasks) store.setProcurementTasks(data.tasks);
      })
      .catch(() => {});

    fetch("/api/harvest")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data.tasks) store.setHarvestTasks(data.tasks);
      })
      .catch(() => {});
  }, []);

  useLiveData(hasInitialData ? [] : [fetchTaskData]);

  const supervisorName = currentUser?.name || "Supervisor";

  // Filter tasks belonging to current supervisor
  const myProcurementTasks = useMemo(() => {
    return procurementTasks.filter(
      (t) =>
        t.supervisorId === currentUser?.id ||
        t.supervisor?.id === currentUser?.id ||
        t.supervisor?.name?.toLowerCase() === currentUser?.name?.toLowerCase()
    );
  }, [procurementTasks, currentUser]);

  // RULE: Active pending tasks ALWAYS appear regardless of date filter!
  // Completed tasks are filtered strictly by date.
  const activeProcurement = useMemo(() => {
    return myProcurementTasks.filter(
      (t) => (t.status as string) === "ASSIGNED"
    );
  }, [myProcurementTasks]);

  const completedProcurement = useMemo(() => {
    return myProcurementTasks.filter(
      (t) =>
        (t.status === "FIELD_SUBMITTED" || t.status === "APPROVED_PROCUREMENT") &&
        isWithinDateRange(t.createdAt)
    );
  }, [myProcurementTasks, isWithinDateRange]);

  const myHarvestTasks = useMemo(() => {
    return harvestTasks.filter(
      (t) =>
        t.supervisorId === currentUser?.id ||
        t.supervisor?.id === currentUser?.id ||
        t.supervisor?.name?.toLowerCase() === currentUser?.name?.toLowerCase() ||
        t.supervisorName?.toLowerCase() === currentUser?.name?.toLowerCase()
    );
  }, [harvestTasks, currentUser]);

  // RULE: Active pending harvest tasks ALWAYS appear regardless of date!
  const activeHarvest = useMemo(() => {
    return myHarvestTasks.filter((t) =>
      ["HARVEST_ASSIGNED", "PICKUP_COMPLETED", "WORK_STARTED", "HARVEST_IN_PROGRESS"].includes(t.status)
    );
  }, [myHarvestTasks]);

  const completedHarvest = useMemo(() => {
    return myHarvestTasks.filter(
      (t) =>
        ["HARVEST_COMPLETED", "DISPATCHED_TO_COLD_STORAGE"].includes(t.status) &&
        isWithinDateRange(t.completedAt || t.dispatchedAt || t.createdAt)
    );
  }, [myHarvestTasks, isWithinDateRange]);

  const switchSection = (section: "harvesting" | "procurement") => {
    router.push(`/supervisor?section=${section}`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Mobile-Optimized Top Banner */}
      <div className="bg-white border-b border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-600/30">
              {supervisorName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold text-slate-900 font-heading">
                  {supervisorName}
                </h1>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0">
                  {currentUser?.role ? ((ROLE_LABELS as any)[currentUser.role] || currentUser.role) : "Supervisor"}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Smartphone className="w-3 h-3 text-emerald-600" />
                Mobile Inspection View
              </p>
            </div>
          </div>

          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-3 rounded-xl shadow-sm gap-1.5"
            onClick={() => setIsAddFarmerModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Farmer</span>
          </Button>
        </div>

        {/* Section Switcher: Harvesting vs Procurement */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/90 rounded-2xl mt-4 border border-slate-200/60">
          <button
            type="button"
            onClick={() => switchSection("harvesting")}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150",
              activeSection === "harvesting"
                ? "bg-white text-emerald-900 shadow-sm border border-emerald-200/60 font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Sprout className="w-4 h-4 text-emerald-600" />
            <span>Harvesting Tasks</span>
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
              {activeHarvest.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => switchSection("procurement")}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150",
              activeSection === "procurement"
                ? "bg-white text-emerald-900 shadow-sm border border-emerald-200/60 font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            <span>Procurement Tasks</span>
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
              {activeProcurement.length}
            </span>
          </button>
        </div>

        {/* Date Filter: Defaults strictly to Today, with clear explanation */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Filter Tasks By Date (Default: Today)
            </label>
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
              *Pending tasks always visible
            </span>
          </div>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={({ startDate: s, endDate: e }) => {
              setStartDate(s);
              setEndDate(e);
            }}
            className="w-full"
          />
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {activeSection === "harvesting" ? "Active Harvests" : "Active Inspections"}
            </span>
            <span className="text-xl font-black text-amber-600 font-heading mt-0.5 block">
              {activeSection === "harvesting" ? activeHarvest.length : activeProcurement.length}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {activeSection === "harvesting" ? "Completed Harvests" : "Completed Inspections"}
            </span>
            <span className="text-xl font-black text-emerald-600 font-heading mt-0.5 block">
              {activeSection === "harvesting" ? completedHarvest.length : completedProcurement.length}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100">
          <Link href="/supervisor/procurement/new">
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 rounded-xl shadow-sm justify-between px-4">
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Register New Farmer & Intake
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Active vs Completed Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-white shadow-xs">
        <button
          className={cn(
            "flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors",
            taskTab === "ACTIVE"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          )}
          onClick={() => setTaskTab("ACTIVE")}
        >
          Active Tasks (
          {activeSection === "harvesting" ? activeHarvest.length : activeProcurement.length})
        </button>
        <button
          className={cn(
            "flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors",
            taskTab === "COMPLETED"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          )}
          onClick={() => setTaskTab("COMPLETED")}
        >
          Completed Tasks (
          {activeSection === "harvesting" ? completedHarvest.length : completedProcurement.length})
        </button>
      </div>

      {/* Task List Content */}
      <div className="flex-1 p-5 max-w-4xl mx-auto w-full space-y-4">
        {/* ===================== HARVESTING SECTION ===================== */}
        {activeSection === "harvesting" && (
          <div className="space-y-4">
            {(taskTab === "ACTIVE" ? activeHarvest : completedHarvest).map((task) => {
              const farmerName = task.farmerName || (task as any).farmer?.name || "Farmer";
              const farmerPhone = (task as any).farmerPhone || (task as any).farmer?.mobileNumber || task.mobileNumber || "";
              const vehicleNo = task.vehicleSupplier?.vehicleNumber || task.truckNumber || (task as any).vehicleSupplierName || "";
              const driverName = task.driverName || task.vehicleSupplier?.driverName || "";
              const driverPhone = task.driverPhone || task.vehicleSupplier?.driverPhone || "";
              const labourTeam = task.labourTeam || task.teamName || "";
              const labourLeaderPhone = task.labourTeamPhone || (task as any).laborLeaderPhone || "";

              return (
                <Card
                  key={task.id}
                  className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden hover:border-emerald-300 transition-all duration-200"
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 font-heading">
                            {farmerName}
                          </h3>
                          {farmerPhone && (
                            <a
                              href={`tel:${farmerPhone}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                              title="Call Farmer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{farmerPhone}</span>
                            </a>
                          )}
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            #{task.procurementTaskId || task.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-start gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                          <span>{task.address || (task as any).farmer?.address || "Farm Location"}</span>
                        </p>
                      </div>
                      <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-xs font-bold px-2 py-0.5">
                        {task.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">
                          Brand
                        </span>
                        <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          {task.brandName || "StarPremium"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">
                          Est. Yield
                        </span>
                        <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Weight className="w-3 h-3 text-slate-400" />
                          {task.tonnage} Tons
                        </span>
                      </div>

                      {/* Vehicle Details */}
                      <div className="col-span-2 pt-2 border-t border-slate-200/60">
                        <span className="text-slate-400 font-medium block text-[10px] uppercase flex items-center gap-1">
                          <Truck className="w-3 h-3 text-emerald-600" />
                          Assigned Vehicle & Driver
                        </span>
                        <div className="flex items-center justify-between flex-wrap gap-1 mt-0.5">
                          <span className="font-bold text-slate-900">
                            {vehicleNo || "Vehicle Pending"}
                            {driverName && <span className="font-normal text-slate-600 ml-1">({driverName})</span>}
                          </span>
                          {driverPhone && (
                            <a
                              href={`tel:${driverPhone}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded transition-colors"
                              title="Call Driver"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{driverPhone}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Labour Team Details */}
                      <div className="col-span-2 pt-2 border-t border-slate-200/60">
                        <span className="text-slate-400 font-medium block text-[10px] uppercase flex items-center gap-1">
                          <Users className="w-3 h-3 text-emerald-600" />
                          Assigned Labour Team
                        </span>
                        <div className="flex items-center justify-between flex-wrap gap-1 mt-0.5">
                          <span className="font-bold text-slate-900">
                            {labourTeam || "Labour Pending"}
                          </span>
                          {labourLeaderPhone && (
                            <a
                              href={`tel:${labourLeaderPhone}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors"
                              title="Call Labour Team"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{labourLeaderPhone}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {task.createdAt && (
                      <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 flex items-center justify-between">
                        <span>
                          Date: <strong className="text-slate-900">{formatDate(task.createdAt)}</strong>
                        </span>
                        {(task.supervisorName || task.supervisor?.name) && (
                          <span>
                            Staff: <strong className="text-slate-900">{task.supervisorName || task.supervisor?.name}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {["HARVEST_ASSIGNED", "PICKUP_COMPLETED", "WORK_STARTED", "HARVEST_IN_PROGRESS"].includes(task.status) ? (
                      <Link href={`/harvesting/job/${task.id}`}>
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-sm shadow-emerald-600/20 justify-between px-4 mt-1 text-sm">
                          <span className="flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4" />
                            Manage Harvest Job
                          </span>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedHarvestTask(task)}
                        className="w-full border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 font-bold h-11 rounded-xl justify-between px-4 mt-1 text-sm cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          View / Edit Harvest Details
                        </span>
                        <span className="text-[11px] font-mono text-emerald-800 font-black">
                          {task.harvestedBoxes || task.currentFilledBoxes || 0} Boxes ›
                        </span>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {(taskTab === "ACTIVE" ? activeHarvest : completedHarvest).length === 0 && (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-slate-800">
                  No {taskTab === "ACTIVE" ? "Active" : "Completed"} Harvest Tasks
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {taskTab === "ACTIVE"
                    ? "Pending harvest assignments will automatically appear here."
                    : "Completed harvests for the selected date range will appear here."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===================== PROCUREMENT SECTION ===================== */}
        {activeSection === "procurement" && (
          <div className="space-y-4">
            {(taskTab === "ACTIVE" ? activeProcurement : completedProcurement).map((task) => {
              const farmerName = task.farmer?.name || "Farmer";
              const farmerPhone = task.farmer?.mobileNumber || "";

              return (
                <Card
                  key={task.id}
                  className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden hover:border-emerald-300 transition-all duration-200"
                >
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 font-heading">
                            {farmerName}
                          </h3>
                          {farmerPhone && (
                            <a
                              href={`tel:${farmerPhone}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                              title="Call Farmer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{farmerPhone}</span>
                            </a>
                          )}
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            #{task.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-start gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                          <span>{task.farmer?.address}</span>
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">
                          Contact Phone
                        </span>
                        <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {farmerPhone || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">
                          Approx Yield
                        </span>
                        <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Weight className="w-3.5 h-3.5 text-slate-400" />
                          {task.approxTonnage} Tons
                        </span>
                      </div>
                    </div>

                    {task.createdAt && (
                      <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 flex items-center justify-between">
                        <span>
                          Date: <strong className="text-slate-900">{formatDate(task.createdAt)}</strong>
                        </span>
                        {task.supervisor && (
                          <span>
                            Staff: <strong className="text-slate-900">{task.supervisor.name}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {task.status === "ASSIGNED" ? (
                      <Link href={`/supervisor/task/${task.id}`}>
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-sm shadow-emerald-600/20 justify-between px-4 mt-1 text-sm">
                          <span className="flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4" />
                            Start Field Inspection
                          </span>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    ) : (
                      <div className="pt-1 flex items-center justify-between text-xs font-semibold text-emerald-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Field Report Submitted
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {task.actualTonnage} T ({task.quality})
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {(taskTab === "ACTIVE" ? activeProcurement : completedProcurement).length === 0 && (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-slate-800">
                  No {taskTab === "ACTIVE" ? "Active" : "Completed"} Procurement Tasks
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {taskTab === "ACTIVE"
                    ? "Assigned procurement visits will automatically appear here."
                    : "Completed field inspection reports for the selected date range will appear here."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <SupervisorAddFarmerModal
        isOpen={isAddFarmerModalOpen}
        onClose={() => setIsAddFarmerModalOpen(false)}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      <CompletedHarvestDetailsModal
        task={selectedHarvestTask}
        open={!!selectedHarvestTask}
        onClose={() => setSelectedHarvestTask(null)}
        onUpdated={fetchTaskData}
      />
    </div>
  );
}

function CompletedHarvestDetailsModal({
  task,
  open,
  onClose,
  onUpdated,
}: {
  task: any;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [vehicleNo, setVehicleNo] = useState("");
  const [lineName, setLineName] = useState("");
  const [rate, setRate] = useState("");
  const [totalBoxes, setTotalBoxes] = useState("");
  const [wastage, setWastage] = useState("");

  const [box3H, setBox3H] = useState("");
  const [box4H, setBox4H] = useState("");
  const [box5H, setBox5H] = useState("");
  const [box6H, setBox6H] = useState("");
  const [box7H, setBox7H] = useState("");
  const [box8H, setBox8H] = useState("");

  useEffect(() => {
    if (!task) return;
    const b = (task?.billData as any) || {};
    setVehicleNo(task.truckNumber || b.vehicleNo || task.vehicleSupplier?.vehicleNumber || "");
    setLineName(b.lineName || task.labourTeam || task.teamName || "");
    setRate(b.rate !== undefined ? String(b.rate) : String(task.finalRate || ""));
    setTotalBoxes(task.harvestedBoxes !== undefined ? String(task.harvestedBoxes) : String(b.totalBoxCount || ""));
    setWastage(task.fieldDamagedBoxes !== undefined ? String(task.fieldDamagedBoxes) : String(b.wastage || 0));

    setBox3H(b.box3H !== undefined && b.box3H !== null ? String(b.box3H) : "");
    setBox4H(b.box4H !== undefined && b.box4H !== null ? String(b.box4H) : "");
    setBox5H(b.box5H !== undefined && b.box5H !== null ? String(b.box5H) : "");
    setBox6H(b.box6H !== undefined && b.box6H !== null ? String(b.box6H) : "");
    setBox7H(b.box7H !== undefined && b.box7H !== null ? String(b.box7H) : "");
    setBox8H(b.box8H !== undefined && b.box8H !== null ? String(b.box8H) : "");
    setIsEditing(false);
  }, [task]);

  if (!task) return null;

  const b = (task?.billData as any) || {};
  const farmerName = task.farmerName || task.farmer?.name || "Farmer";
  const farmerPhone = (task as any).farmer?.mobileNumber || task.farmer?.phone || task.mobileNumber;
  const address = task.address || task.farmer?.address || "Farm Location";
  const driverName = task.vehicleSupplier?.driverName || task.driverName;
  const driverPhone = task.vehicleSupplier?.driverPhone || task.driverPhone;

  const currentTotalBoxes = Number(totalBoxes) || Number(task.harvestedBoxes) || Number(b.totalBoxCount) || 0;
  const currentWastage = Number(wastage) || Number(task.fieldDamagedBoxes) || Number(b.wastage) || 0;

  // Leftover return calculations
  let totalPickedUp = task.totalBoxesPickedUp || task.targetRequiredBoxes || 0;
  if (!totalPickedUp && task.actualBoxPickups) {
    totalPickedUp = Object.values(task.actualBoxPickups).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  }
  if (!totalPickedUp && task.requiredBoxCounts) {
    totalPickedUp = Object.values(task.requiredBoxCounts).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  }
  if (!totalPickedUp && currentTotalBoxes > 0) {
    totalPickedUp = currentTotalBoxes;
  }

  const leftoverBoxes = Math.max(0, totalPickedUp - currentTotalBoxes - currentWastage);
  const leftoverTopBundles = Math.floor(leftoverBoxes / 25);
  const leftoverTopLoose = leftoverBoxes % 25;
  const leftoverBottomBundles = Math.floor(leftoverBoxes / 20);
  const leftoverBottomLoose = leftoverBoxes % 20;

  const allocatedSheets = task.germEthylenePaperSheets || (Math.ceil((totalPickedUp > 0 ? totalPickedUp : 320) / 320) * 320);
  const leftoverSheets = Math.max(0, allocatedSheets - currentTotalBoxes);
  const issuedFaviloc = task.favilocPackets && task.favilocPackets > 0 ? task.favilocPackets : 5;
  const leftoverFaviloc = Math.max(0, issuedFaviloc - Math.ceil(currentTotalBoxes / 130));
  const issuedFoam = task.foamUnit !== undefined && task.foamUnit !== null && task.foamUnit > 0 ? task.foamUnit : 1;
  const leftoverFoam = currentTotalBoxes <= 600 ? issuedFoam : 0;

  const is7kg = task.selectedBoxTypes?.some((b: any) => String(b).includes("7")) || Boolean((task.requiredBoxCounts as any)?.["7KG"]);
  const bagRatio = is7kg ? 35 : 25;
  const leftoverBagsKg = Math.round((leftoverBoxes / bagRatio) * 100) / 100;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/harvest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          action: "UPDATE_HARVEST_DETAILS",
          harvestedBoxes: Number(totalBoxes) || 0,
          fieldDamagedBoxes: Number(wastage) || 0,
          truckNumber: vehicleNo,
          billData: {
            ...b,
            vehicleNo,
            lineName,
            rate: parseFloat(rate) || 0,
            totalBoxCount: Number(totalBoxes) || 0,
            wastage: Number(wastage) || 0,
            box3H: Number(box3H) || 0,
            box4H: Number(box4H) || 0,
            box5H: Number(box5H) || 0,
            box6H: Number(box6H) || 0,
            box7H: Number(box7H) || 0,
            box8H: Number(box8H) || 0,
          },
        }),
      });
      if (!res.ok) throw new Error("Server failed to update harvest details");
      toast.success("Harvest & billing details updated successfully");
      setIsEditing(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to save harvest details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 shadow-2xl rounded-2xl p-5 sm:p-6 space-y-4">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-xs">
                Intake #{task.procurementTaskId || task.id}
              </Badge>
              <Badge variant="outline" className="text-slate-600 text-xs font-semibold">
                {task.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <Button
              type="button"
              size="sm"
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "font-bold text-xs h-8 px-3 gap-1.5 rounded-lg",
                isEditing ? "bg-slate-900 hover:bg-slate-800 text-white" : "border-slate-300 text-slate-700"
              )}
            >
              {isEditing ? (
                <>
                  <Eye className="w-3.5 h-3.5" /> Read Mode
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" /> Edit Details
                </>
              )}
            </Button>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 mt-2">
            Completed Harvest Details &amp; Produce Summary
          </DialogTitle>
        </DialogHeader>

        {isEditing ? (
          /* EDIT MODE */
          <div className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">Vehicle Number</Label>
                <Input
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="bg-white border-slate-200 h-9 font-bold text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">Line Name (Labour)</Label>
                <Input
                  value={lineName}
                  onChange={(e) => setLineName(e.target.value)}
                  className="bg-white border-slate-200 h-9 font-bold text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">Total Loaded Boxes</Label>
                <Input
                  type="number"
                  value={totalBoxes}
                  onChange={(e) => setTotalBoxes(e.target.value)}
                  className="bg-white border-emerald-300 text-emerald-800 font-black h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">Field Wastage (Boxes / kg)</Label>
                <Input
                  type="number"
                  value={wastage}
                  onChange={(e) => setWastage(e.target.value)}
                  className="bg-white border-slate-200 h-9 font-bold text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">Rate (₹/Ton)</Label>
                <Input
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="bg-white border-slate-200 h-9 font-bold text-xs"
                />
              </div>
            </div>

            {/* Hand Breakdown Inputs */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                Hand Breakdown (3H to 8H)
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">3H</Label>
                  <Input value={box3H} onChange={(e) => setBox3H(e.target.value)} placeholder="0" className="bg-white h-8 text-xs font-bold" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">4H</Label>
                  <Input value={box4H} onChange={(e) => setBox4H(e.target.value)} placeholder="0" className="bg-white h-8 text-xs font-bold" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">5H</Label>
                  <Input value={box5H} onChange={(e) => setBox5H(e.target.value)} placeholder="0" className="bg-white h-8 text-xs font-bold" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">6H</Label>
                  <Input value={box6H} onChange={(e) => setBox6H(e.target.value)} placeholder="0" className="bg-white h-8 text-xs font-bold" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">7H</Label>
                  <Input value={box7H} onChange={(e) => setBox7H(e.target.value)} placeholder="0" className="bg-white h-8 text-xs font-bold" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-slate-600">8H</Label>
                  <Input value={box8H} onChange={(e) => setBox8H(e.target.value)} placeholder="0" className="bg-white h-8 text-xs font-bold" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* READ-ONLY FORMATTED VIEW */
          <div className="space-y-3.5 text-xs font-sans">
            {/* Farmer & Location Info */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{farmerName}</span>
                <span className="text-[11px] text-slate-500 font-semibold">{formatDate(task.createdAt)}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 text-xs">
                {farmerPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" /> {farmerPhone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" /> {address}
                </span>
              </div>
            </div>

            {/* Operational & Dispatch Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Vehicle No</span>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  {vehicleNo || "—"}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Driver</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">
                  {driverName || "—"} {driverPhone ? `(${driverPhone})` : ""}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Labour Team</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">{lineName || "—"}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Vendor</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">{b.vendorName || "KD"}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Destination</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">{b.destinationColdStorage || task.destinationColdStorage || "Cold Storage"}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Locked Rate</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">₹{rate || "—"}/T</span>
              </div>
            </div>

            {/* Produce & Hands Section */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Produce &amp; Hand Particulars
                </span>
                <span className="text-xs font-black text-emerald-900 bg-white px-2.5 py-0.5 rounded-md border border-emerald-300">
                  Total: {currentTotalBoxes} Loaded Boxes
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                {[
                  { label: "3H", val: b.box3H ?? box3H },
                  { label: "4H", val: b.box4H ?? box4H },
                  { label: "5H", val: b.box5H ?? box5H },
                  { label: "6H", val: b.box6H ?? box6H },
                  { label: "7H", val: b.box7H ?? box7H },
                  { label: "8H", val: b.box8H ?? box8H },
                ].map((h) => (
                  <div key={h.label} className="p-2 bg-white rounded-lg border border-emerald-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">{h.label}</span>
                    <span className="text-sm font-black text-slate-900 font-heading">{h.val ? String(h.val) : "0"}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs pt-1 text-slate-600 font-medium">
                <span>Brand: <strong className="text-slate-900">{b.orchardParticulars || task.brandName || "Star"}</strong></span>
                <span>Wastage: <strong className="text-rose-700">{currentWastage} kg</strong></span>
              </div>
            </div>

            {/* Leftover / Return Items Breakdown */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                  Leftover Materials Return Status
                </span>
                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-[10px]">
                  Brand: {b.orchardParticulars || task.brandName || "Star"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block">Tops Return</span>
                  <span className="text-xs font-black text-slate-900">{leftoverBoxes} pcs</span>
                  <span className="text-[9px] text-slate-500 block">({leftoverTopBundles} bndl{leftoverTopLoose > 0 ? ` +${leftoverTopLoose}` : ""})</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block">Bottoms Return</span>
                  <span className="text-xs font-black text-slate-900">{leftoverBoxes} pcs</span>
                  <span className="text-[9px] text-slate-500 block">({leftoverBottomBundles} bndl{leftoverBottomLoose > 0 ? ` +${leftoverBottomLoose}` : ""})</span>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="text-[10px] text-purple-700 font-bold block">Germ. Paper</span>
                  <span className="text-xs font-black text-purple-900">{leftoverSheets} sheets</span>
                </div>
                <div className="p-2 bg-sky-50 rounded-lg border border-sky-200">
                  <span className="text-[10px] text-sky-700 font-bold block">Faviloc</span>
                  <span className="text-xs font-black text-sky-900">{leftoverFaviloc} pkts</span>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                  <span className="text-[10px] text-indigo-700 font-bold block">Foam</span>
                  <span className="text-xs font-black text-indigo-900">{leftoverFoam} unit</span>
                </div>
                <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-600 font-bold block">Bags Return</span>
                  <span className="text-xs font-black text-slate-900">{leftoverBagsKg} kg</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="rounded-xl font-bold h-10 border-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl shadow-md gap-1.5 text-xs"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 rounded-xl px-5 text-xs"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}