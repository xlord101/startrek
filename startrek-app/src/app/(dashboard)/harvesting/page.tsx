"use client";

import { mockHarvestTasks } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Phone,
  Weight,
  ArrowRight,
  Sprout,
  Clock,
  Truck,
  ChevronRight,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { HARVEST_STATUS_LABELS } from "@/types";

export default function HarvestingLeadMobilePage() {
  const activeJobs = mockHarvestTasks.filter(
    (t) => t.status === "HARVEST_ASSIGNED" || t.status === "HARVEST_IN_PROGRESS"
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Mobile Header Banner */}
      <div className="bg-white border-b border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-600/30">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-slate-900 font-heading">
                Harvesting Field Lead
              </h1>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0">
                Squad View
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Module 2.2 — On-site harvest execution & logistics dispatch
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Harvest Jobs
            </span>
            <span className="text-xl font-black text-emerald-700 font-heading mt-0.5 block">
              {activeJobs.length}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              2-Hr Ping Status
            </span>
            <span className="text-xs font-bold text-sky-700 font-sans mt-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> All Teams Active
            </span>
          </div>
        </div>
      </div>

      {/* Active Jobs List */}
      <div className="flex-1 p-5 space-y-4 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-heading">
            Assigned Field Harvesting Jobs
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {activeJobs.length} Active
          </span>
        </div>

        {activeJobs.map((task) => (
          <Card
            key={task.id}
            className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden hover:border-emerald-300 transition-all duration-200"
          >
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    {task.farmerName}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-start gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>{task.address}</span>
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold px-2 py-0.5 border ${
                    task.status === "HARVEST_ASSIGNED"
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : "bg-orange-50 text-orange-700 border-orange-200"
                  }`}
                >
                  {HARVEST_STATUS_LABELS[task.status]}
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Allocated Squad:</span>
                  <span className="font-bold text-slate-900">{task.teamName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Packing Brand:</span>
                  <span className="font-bold text-slate-900">{task.brandName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Target Tonnage:</span>
                  <span className="font-bold text-emerald-800">{task.tonnage} Tons</span>
                </div>
              </div>

              <Link href={`/harvesting/job/${task.id}`}>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-sm shadow-emerald-600/20 justify-between px-4 mt-1 text-sm">
                  <span className="flex items-center gap-2">
                    <Sprout className="w-4 h-4" />
                    Open Harvest & Dispatch Form
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}

        {activeJobs.length === 0 && (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-6">
            <Truck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No Active Harvesting Jobs</p>
            <p className="text-xs text-slate-500 mt-1">All assigned harvesting jobs have been dispatched.</p>
          </div>
        )}
      </div>
    </div>
  );
}
