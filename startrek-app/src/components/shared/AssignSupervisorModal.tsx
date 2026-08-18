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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Phone, Weight, UserCheck, ShieldCheck } from "lucide-react";
import { ProcurementTask, User, ROLE_LABELS } from "@/types";

interface AssignSupervisorModalProps {
  task: ProcurementTask;
  supervisors: User[];
  onClose: () => void;
  onAssign: (supervisorId: string) => void;
}

export function AssignSupervisorModal({
  task,
  onClose,
  onAssign,
  supervisors,
}: AssignSupervisorModalProps) {
  // If the task has a supervisor assigned but they aren't in the filtered list (e.g. an OFFICE_ADMIN from before the fix)
  // we add them temporarily so the dropdown resolves their name correctly instead of showing the raw UUID.
  const allSupervisors = [...supervisors];
  if (
    task.supervisorId &&
    task.supervisor &&
    !allSupervisors.some((s) => s.id === task.supervisorId)
  ) {
    allSupervisors.push(task.supervisor);
  }

  const [selectedSupervisorId, setSelectedSupervisorId] = useState(() => {
    if (task.supervisorId && allSupervisors.some((s) => s.id === task.supervisorId)) {
      return task.supervisorId;
    }
    return "";
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-3 text-slate-900 text-lg sm:text-xl font-bold font-heading">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            {task.supervisorId ? "Re-Assign / Change Supervisor" : "Assign Field Supervisor"}
          </DialogTitle>
        </DialogHeader>

        {/* Farmer details (editable) */}
        <div className="space-y-6 py-3">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Verify & Edit Intake Details
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Farmer Name</Label>
                <Input
                  defaultValue={task.farmer.name}
                  className="h-11 text-sm bg-white border-slate-200 text-slate-900 font-semibold rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number
                </Label>
                <Input
                  defaultValue={task.farmer.mobileNumber}
                  className="h-11 text-sm bg-white border-slate-200 text-slate-900 font-semibold rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Farm Location Address
              </Label>
              <Input
                defaultValue={task.farmer.address}
                className="h-11 text-sm bg-white border-slate-200 text-slate-900 font-semibold rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Weight className="w-3.5 h-3.5 text-slate-400" /> Approx. Tonnage (Tons)
              </Label>
              <Input
                defaultValue={task.approxTonnage}
                type="number"
                className="h-11 text-sm bg-white border-slate-200 text-slate-900 font-semibold rounded-xl"
              />
            </div>
          </div>

          {/* Supervisor Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span>Select Field Supervisor</span>
              <span className="text-rose-500">*</span>
            </Label>
            <Select value={selectedSupervisorId} onValueChange={(val: any) => setSelectedSupervisorId(val || "")}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl text-sm sm:text-base font-semibold px-4 shadow-2xs">
                <SelectValue placeholder="Choose supervisor..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-2xl rounded-xl p-1.5 max-h-64 overflow-y-auto">
                {allSupervisors.map((s) => {
                  const initials = s.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const roleLabel = ROLE_LABELS[s.role] || s.role;
                  return (
                    <SelectItem
                      key={s.id}
                      value={s.id}
                      className="cursor-pointer py-3 px-3.5 text-sm sm:text-base font-semibold rounded-lg hover:bg-slate-100 focus:bg-emerald-50 focus:text-emerald-900"
                    >
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-7 h-7 border border-emerald-200">
                            <AvatarFallback className="text-xs bg-emerald-600 text-white font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-slate-900 text-sm sm:text-base">{s.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {roleLabel}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200 text-slate-700 font-bold h-12 text-sm px-5">
            Cancel
          </Button>
          <Button
            onClick={() => selectedSupervisorId && onAssign(selectedSupervisorId)}
            disabled={!selectedSupervisorId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-12 px-6 text-sm sm:text-base shadow-md shadow-emerald-600/20 gap-2 flex-1 sm:flex-none"
          >
            <ShieldCheck className="w-5 h-5" />
            {task.supervisorId ? "Save Supervisor Change" : "Confirm & Assign Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
