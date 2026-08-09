"use client";

import { useStartrekStore } from "@/lib/store";
import { mockCurrentUser } from "@/lib/mock-data";
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
} from "lucide-react";
import Link from "next/link";

export default function SupervisorDashboardPage() {
  const { procurementTasks } = useStartrekStore();
  const currentSupervisor = mockCurrentUser.supervisor; // Arjun Nair

  // Show all active field tasks assigned for mobile inspection
  const myTasks = procurementTasks.filter(
    (t) => t.status === "ASSIGNED" || t.status === "FIELD_SUBMITTED" || t.status === "APPROVED_PROCUREMENT"
  );

  const pendingSubmissions = myTasks.filter((t) => t.status === "ASSIGNED").length;
  const completedSubmissions = myTasks.filter(
    (t) => t.status === "FIELD_SUBMITTED" || t.status === "APPROVED_PROCUREMENT"
  ).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Mobile-Optimized Top Banner */}
      <div className="bg-white border-b border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-600/30">
              {currentSupervisor.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold text-slate-900 font-heading">
                  {currentSupervisor.name}
                </h1>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0">
                  Field Supervisor
                </Badge>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Smartphone className="w-3 h-3 text-emerald-600" />
                Mobile Inspection View
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Pending Visits
            </span>
            <span className="text-xl font-black text-amber-600 font-heading mt-0.5 block">
              {pendingSubmissions}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Completed Visits
            </span>
            <span className="text-xl font-black text-emerald-600 font-heading mt-0.5 block">
              {completedSubmissions}
            </span>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 p-5 space-y-4 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
            Assigned Farm Visits
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {myTasks.length} Assigned
          </span>
        </div>

        {myTasks.map((task) => (
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
                    <Phone className="w-3 h-3 text-slate-400" />
                    {task.farmer.mobileNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block text-[10px] uppercase">
                    Approx Yield
                  </span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Weight className="w-3 h-3 text-slate-400" />
                    {task.approxTonnage} Tons
                  </span>
                </div>
              </div>

              {task.supervisor && (
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

        {myTasks.length === 0 && (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-6">
            <Clock className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No Assigned Visits</p>
            <p className="text-xs text-slate-500 mt-1">
              You currently have no pending farm inspection visits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
