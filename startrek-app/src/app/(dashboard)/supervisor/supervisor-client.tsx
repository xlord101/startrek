"use client";

import { store, useStartrekStore } from "@/lib/store";
import { useLayoutEffect, useCallback, useState } from "react";
import { useLiveData } from "@/hooks/useLiveData";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Phone,
  Weight,
  ArrowRight,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ChevronRight,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { ROLE_LABELS, UserRole } from "@/types";
import { SupervisorAddFarmerModal } from "@/components/shared/SupervisorAddFarmerModal";

interface SupervisorDashboardClientProps {
  currentUser: { id: string; name: string; role: string } | null;
  initialProcurementTasks?: any[];
  initialHarvestTasks?: any[];
}

export default function SupervisorDashboardClient({
  currentUser,
  initialProcurementTasks,
  initialHarvestTasks,
}: SupervisorDashboardClientProps) {
  const { procurementTasks, harvestTasks } = useStartrekStore();

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isAddFarmerModalOpen, setIsAddFarmerModalOpen] = useState(false);
  const [taskTab, setTaskTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");

  const isWithinDateRange = (dateStr?: string | Date) => {
    if (!startDate && !endDate) return true;
    if (!dateStr) return true;
    const date = new Date(dateStr);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (date < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
    return true;
  };


  // Hydrate the store with server-rendered data BEFORE first paint —
  // eliminates the blank-spinner fetch waterfall on load.
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
        if (r.status === 401) window.location.href = '/login';
        return r.json();
      })
      .then((data) => {
        if (data.tasks) store.setProcurementTasks(data.tasks);
      })
      .catch(() => {});
  }, [hasInitialData]);

  // Focus/visibility-aware live refresh. With server-rendered initial data we
  // only need to keep procurement in sync; harvest data arrives with it.
  useLiveData(hasInitialData ? [] : [fetchTaskData]);

  const supervisorName = currentUser?.name || "Supervisor";
  const isAdmin = currentUser?.role === "MAIN_ADMIN" || currentUser?.role === "OFFICE_ADMIN";

  // Any supervisor — field or procurement — can be assigned either kind of task.
  // Visibility follows the ASSIGNMENT, not the role label.
  const myProcurementTasks = procurementTasks.filter(
    (t) =>
      (t.supervisorId === currentUser?.id ||
        t.supervisor?.id === currentUser?.id ||
        t.supervisor?.name?.toLowerCase() === currentUser?.name?.toLowerCase()) &&
      (t.status === "ASSIGNED" || t.status === "FIELD_SUBMITTED" || t.status === "APPROVED_PROCUREMENT") &&
      isWithinDateRange(t.createdAt)
  );
  const pendingProcurement = myProcurementTasks.filter(t => t.status === "ASSIGNED");
  const completedProcurement = myProcurementTasks.filter(t => t.status === "FIELD_SUBMITTED" || t.status === "APPROVED_PROCUREMENT");

  const myHarvestTasks = harvestTasks.filter(
    (t) =>
      (t.supervisorId === currentUser?.id ||
      t.supervisor?.id === currentUser?.id ||
      t.supervisor?.name?.toLowerCase() === currentUser?.name?.toLowerCase() ||
      t.supervisorName?.toLowerCase() === currentUser?.name?.toLowerCase()) &&
      isWithinDateRange(t.createdAt)
  );
  const pendingHarvest = myHarvestTasks.filter(t => ["HARVEST_ASSIGNED", "PICKUP_COMPLETED", "WORK_STARTED", "HARVEST_IN_PROGRESS"].includes(t.status));
  const completedHarvest = myHarvestTasks.filter(t => ["HARVEST_COMPLETED", "DISPATCHED_TO_COLD_STORAGE"].includes(t.status));



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

        
        <div className="mt-4 flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Pending Visits
            </span>
            <span className="text-xl font-black text-amber-600 font-heading mt-0.5 block">
              {pendingProcurement.length + pendingHarvest.length}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Completed Visits
            </span>
            <span className="text-xl font-black text-emerald-600 font-heading mt-0.5 block">
              {completedProcurement.length + completedHarvest.length}
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

            {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white shadow-sm">
        <button 
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${taskTab === 'ACTIVE' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          onClick={() => setTaskTab('ACTIVE')}
        >
          Active Tasks
        </button>
        <button 
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${taskTab === 'COMPLETED' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          onClick={() => setTaskTab('COMPLETED')}
        >
          Completed Tasks
        </button>
      </div>

      {/* Task List Columns */}
      <div className="flex-1 p-5 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Procurement Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
              Procurement & Rate Inspection
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {taskTab === 'ACTIVE' ? pendingProcurement.length : completedProcurement.length} Tasks
            </span>
          </div>

          {(taskTab === 'ACTIVE' ? pendingProcurement : completedProcurement).map((task) => (
              <Card
                key={task.id}
                className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden hover:border-emerald-300 transition-all duration-200"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">
                        {task.farmer.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-start gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span>{task.farmer.address}</span>
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
                        {task.farmer.mobileNumber}
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
                      <span>Date: <strong className="text-slate-900">{new Date(task.createdAt).toLocaleDateString()}</strong></span>
                      {task.supervisor && <span>Staff: <strong className="text-slate-900">{task.supervisor.name}</strong></span>}
                    </div>
                  )}
                  {!task.createdAt && task.supervisor && (
                    <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
                      Assigned Staff: <strong className="text-slate-900">{task.supervisor.name}</strong>
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
          ))}
          
          {(taskTab === 'ACTIVE' ? pendingProcurement : completedProcurement).length === 0 && (
             <div className="text-center py-8 bg-white border border-slate-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-slate-800">No {taskTab === 'ACTIVE' ? 'Active' : 'Completed'} Procurement Tasks</p>
             </div>
          )}
        </div>

        {/* Harvest Column */}
        <div className="space-y-4 md:mt-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
              Harvesting & Field Packing
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {taskTab === 'ACTIVE' ? pendingHarvest.length : completedHarvest.length} Tasks
            </span>
          </div>

          {(taskTab === 'ACTIVE' ? pendingHarvest : completedHarvest).map((task) => (
              <Card
                key={task.id}
                className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden hover:border-emerald-300 transition-all duration-200"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">
                        {task.farmerName || (task as any).farmer?.name || "Farmer"}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-start gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span>{task.address || (task as any).farmer?.address || "Farm Location"}</span>
                      </p>
                    </div>
                    <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-xs font-bold px-2 py-0.5">
                      {task.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

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
                    {task.teamName && (
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">
                          Labour Team
                        </span>
                        <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          {task.teamName}
                        </span>
                      </div>
                    )}
                    {(task.vehicleSupplier?.vehicleNumber || (task as any).vehicleSupplierName) && (
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">
                          Vehicle
                        </span>
                        <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          {task.vehicleSupplier?.vehicleNumber || (task as any).vehicleSupplierName}
                        </span>
                      </div>
                    )}
                  </div>

                  {task.createdAt && (
                    <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 flex items-center justify-between">
                      <span>Date: <strong className="text-slate-900">{new Date(task.createdAt).toLocaleDateString()}</strong></span>
                      {(task.supervisorName || (task as any).supervisor?.name) && <span>Staff: <strong className="text-slate-900">{task.supervisorName || (task as any).supervisor?.name}</strong></span>}
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
                    </div>
                  )}
                </CardContent>
              </Card>
          ))}
          
          {(taskTab === 'ACTIVE' ? pendingHarvest : completedHarvest).length === 0 && (
             <div className="text-center py-8 bg-white border border-slate-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-slate-800">No {taskTab === 'ACTIVE' ? 'Active' : 'Completed'} Harvest Tasks</p>
             </div>
          )}
        </div>
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
