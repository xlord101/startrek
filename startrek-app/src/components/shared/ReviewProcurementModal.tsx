"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MapPin,
  Phone,
  Lock,
  AlertTriangle,
  Receipt,
  FileCheck,
  ShieldCheck,
} from "lucide-react";
import { ProcurementTask, User as UserType } from "@/types";
import { toast } from "sonner";

interface ReviewProcurementModalProps {
  task: ProcurementTask;
  currentUser: UserType;
  onClose: () => void;
  onApprove: (taskId: string, finalRate: number) => void;
}

export function ReviewProcurementModal({
  task,
  currentUser,
  onClose,
  onApprove,
}: ReviewProcurementModalProps) {
  const [finalRate, setFinalRate] = useState<string>(
    task.rate || task.finalRate ? String(task.rate || task.finalRate) : ""
  );

  const actualTons = task.actualTonnage || task.approxTonnage;
  const numericRate = parseFloat(finalRate) || 0;
  const calculatedTotal = actualTons * numericRate;

  const isValid = numericRate > 0;

  const handleConfirm = () => {
    if (!isValid) return;
    toast.success("Procurement Approved & Locked!", {
      description: `Task for ${task.farmer.name} approved by ${currentUser.name} (${currentUser.role}).`,
    });
    onApprove(task.id, numericRate);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-slate-900 text-lg sm:text-xl font-bold font-heading">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 flex-shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              Review & Finalize Rate
            </DialogTitle>
            <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-xs font-bold px-2.5 py-1">
              Module 1.4
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-3">
          {/* Farmer & Location Info */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Farmer & Location
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Intake ID: <strong className="text-slate-800">#{task.id.toUpperCase()}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <Label className="text-xs text-slate-500 font-bold uppercase">Farmer Name</Label>
                <p className="text-base font-bold text-slate-900 mt-0.5">{task.farmer.name}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500 font-bold uppercase">Primary Phone</Label>
                <p className="text-base font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {task.farmer.mobileNumber}
                </p>
              </div>
            </div>

            <div className="pt-1">
              <Label className="text-xs text-slate-500 font-bold uppercase">Farm Address</Label>
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {task.farmer.address}
              </p>
            </div>
          </div>

          {/* Supervisor Field Inspection Findings */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Field Inspection Report
              </span>
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6 border border-slate-300">
                  <AvatarFallback className="text-xs bg-slate-200 text-slate-700 font-bold">
                    {task.supervisor?.name?.charAt(0) || "S"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {task.supervisor?.name || "Field Supervisor"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Actual Yield</span>
                <span className="text-base font-black text-slate-900 font-heading mt-0.5 block">{task.actualTonnage || task.approxTonnage} T</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Ratio</span>
                <span className="text-base font-black text-slate-900 font-heading mt-0.5 block">{task.ratioPercentage || 80}%</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Quality</span>
                <span className={`text-xs sm:text-sm font-bold block mt-1 ${task.quality === "EXCELLENT" || task.quality === "GOOD" ? "text-emerald-700" : task.quality === "REJECT" ? "text-rose-700" : "text-amber-700"}`}>
                  {task.quality || "GOOD"}
                </span>
              </div>
            </div>

            {/* Box Particulars */}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase block mb-2">
                Submitted Particulars
              </span>
              <div className="flex flex-wrap gap-2">
                {task.particulars && task.particulars.length > 0 ? (
                  task.particulars.map((p, i) => (
                    <Badge key={i} variant="outline" className="bg-white border-slate-200 text-slate-800 text-xs sm:text-sm font-semibold px-3 py-1">
                      {p.boxType.replace("_", ".")} Box
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="bg-white border-slate-200 text-slate-800 text-xs sm:text-sm font-semibold px-3 py-1">
                    13 kg Box
                  </Badge>
                )}
              </div>
            </div>

            {/* Rejection Note if applicable */}
            {task.quality === "REJECT" && task.rejectionReason && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm space-y-1">
                <span className="font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Rejection Note
                </span>
                <p className="text-rose-700 font-medium">{task.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Final Rate Allocation & Total Valuation */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Final Rate per Ton (₹) <span className="text-rose-500">*</span>
              </Label>
              {task.rate && (
                <span className="text-xs text-slate-500 font-semibold">
                  On-site quote: ₹{task.rate}/T
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
                <Input
                  type="number"
                  value={finalRate}
                  onChange={(e) => setFinalRate(e.target.value)}
                  placeholder="Enter final rate"
                  className="pl-9 bg-white border-emerald-300 text-slate-900 font-black text-base h-12 rounded-xl focus-visible:ring-emerald-500 shadow-2xs"
                />
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-emerald-200/90 shadow-2xs">
                <span className="text-xs font-bold text-slate-400 uppercase block">Est. Total Produce Value</span>
                <span className="text-xl font-black text-emerald-700 font-heading block mt-0.5">
                  ₹{calculatedTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Stamp Preview */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 px-1 pt-1">
            <span className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Sign-off Authority: <strong className="text-slate-800">{currentUser.name}</strong>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Stamp: Accepted by {currentUser.role === "MAIN_ADMIN" ? "Main Admin" : "Office"}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200 text-slate-700 font-bold h-12 text-sm px-5">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-12 px-6 text-sm sm:text-base shadow-md shadow-emerald-600/20 gap-2 flex-1 sm:flex-none"
          >
            <Lock className="w-5 h-5" />
            Confirm & Lock Procurement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
