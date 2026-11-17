"use client";

import { store, useStartrekStore } from "@/lib/store";
import { useLayoutEffect, useCallback, useState, useMemo } from "react";
import { useLiveData } from "@/hooks/useLiveData";
import { useSearchParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import Link from "next/link";
import { ROLE_LABELS } from "@/types";
import { SupervisorAddFarmerModal } from "@/components/shared/SupervisorAddFarmerModal";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { cn } from "@/lib/utils";

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
    return fetch("/api/procurement")
      .then((r) => {
        if (r.status === 401) window.location.href = "/login";
        return r.json();
      })
      .then((data) => {
        if (data.tasks) store.setProcurementTasks(data.tasks);
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
                          Date: <strong className="text-slate-900">{new Date(task.createdAt).toLocaleDateString()}</strong>
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
                      <div className="pt-1 flex items-center justify-between text-xs font-semibold text-emerald-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Harvest Complete
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {task.harvestedBoxes || task.currentFilledBoxes || 0} Boxes
                        </span>
                      </div>
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
                          Date: <strong className="text-slate-900">{new Date(task.createdAt).toLocaleDateString()}</strong>
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
    </div>
  );
}