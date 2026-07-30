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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sprout,
  Users,
  Tag,
  FlaskConical,
  Clock,
  Check,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import {
  HarvestTask,
  HARVEST_TEAMS,
  BRAND_NAMES,
  CHEMICAL_LABELS,
  ChemicalOption,
} from "@/types";
import { toast } from "sonner";

interface AssignHarvestModalProps {
  task: HarvestTask;
  onClose: () => void;
  onAssign: (data: {
    teamName: string;
    brandName: string;
    chemicals: ChemicalOption[];
    pingIntervalHours: number;
  }) => void;
}

export function AssignHarvestModal({
  task,
  onClose,
  onAssign,
}: AssignHarvestModalProps) {
  const [teamName, setTeamName] = useState(task.teamName || "");
  const [brandName, setBrandName] = useState(task.brandName || BRAND_NAMES[0]);
  const [selectedChemicals, setSelectedChemicals] = useState<ChemicalOption[]>(
    task.chemicals || ["ETHYLENE_WASH", "FUNGICIDE_DIP"]
  );
  const [pingIntervalHours, setPingIntervalHours] = useState(
    task.pingIntervalHours || 2
  );

  const toggleChemical = (chemKey: ChemicalOption) => {
    if (selectedChemicals.includes(chemKey)) {
      setSelectedChemicals(selectedChemicals.filter((c) => c !== chemKey));
    } else {
      setSelectedChemicals([...selectedChemicals, chemKey]);
    }
  };

  const isValid = teamName && brandName && selectedChemicals.length > 0;

  const handleConfirm = () => {
    if (!isValid) return;
    toast.success("Harvest Team Allocated!", {
      description: `${teamName} assigned to harvest ${task.farmerName}'s yield (${task.tonnage} T).`,
    });
    onAssign({
      teamName,
      brandName,
      chemicals: selectedChemicals,
      pingIntervalHours,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-slate-900 text-lg sm:text-xl font-bold font-heading">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Sprout className="w-5 h-5" />
              </div>
              Schedule & Assign Harvest Team
            </DialogTitle>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-2.5 py-1">
              Module 2.1
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-3">
          {/* Approved Farm Summary */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Approved Yield Details
              </span>
              <Badge variant="outline" className="bg-white border-slate-200 text-slate-900 text-xs font-bold px-2.5 py-0.5">
                Rate: ₹{task.finalRate}/T
              </Badge>
            </div>

            <div className="flex items-start justify-between gap-4 pt-1">
              <div>
                <h4 className="text-base font-bold text-slate-900">{task.farmerName}</h4>
                <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {task.address}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-base font-black text-slate-900 font-heading block">{task.tonnage} Tons</span>
                <span className="text-xs font-bold text-emerald-700 block mt-0.5">{task.quality} Grade</span>
              </div>
            </div>
          </div>

          {/* 1. Select Harvest Team (1 of 10 Teams) */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Select Harvest Field Team (1 of 10 Squads) <span className="text-rose-500">*</span>
            </Label>
            <Select value={teamName} onValueChange={(val: any) => setTeamName(val || "")}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl text-sm sm:text-base font-semibold px-4 shadow-2xs">
                <SelectValue placeholder="Choose harvesting team squad..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto p-1.5">
                {HARVEST_TEAMS.map((team, idx) => (
                  <SelectItem
                    key={idx}
                    value={team}
                    className="cursor-pointer py-3 px-3.5 text-sm sm:text-base font-semibold rounded-lg hover:bg-slate-100 focus:bg-emerald-50 focus:text-emerald-900"
                  >
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Select Target Packing Brand Name */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              Target Packaging Brand Category <span className="text-rose-500">*</span>
            </Label>
            <Select value={brandName} onValueChange={(val: any) => setBrandName(val || "")}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl text-sm sm:text-base font-semibold px-4 shadow-2xs">
                <SelectValue placeholder="Select brand category..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl p-1.5">
                {BRAND_NAMES.map((brand, idx) => (
                  <SelectItem
                    key={idx}
                    value={brand}
                    className="cursor-pointer py-3 px-3.5 text-sm sm:text-base font-semibold rounded-lg hover:bg-slate-100 focus:bg-emerald-50 focus:text-emerald-900"
                  >
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Chemical Treatment Requirements (Multi-select) */}
          <div className="space-y-2.5">
            <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-emerald-600" />
              Required Chemical Treatments (Select all that apply) <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(CHEMICAL_LABELS) as ChemicalOption[]).map((chemKey) => {
                const isSelected = selectedChemicals.includes(chemKey);
                return (
                  <button
                    key={chemKey}
                    type="button"
                    onClick={() => toggleChemical(chemKey)}
                    className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border text-sm font-semibold text-left transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{CHEMICAL_LABELS[chemKey]}</span>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all flex-shrink-0 ml-2 ${
                        isSelected
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Automated 2-Hour Ping Mechanism */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 flex-shrink-0">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">Automated Field Check Ping</p>
                <p className="text-xs text-slate-500">Alert team lead every 2 hours during harvest</p>
              </div>
            </div>
            <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-xs font-bold px-3 py-1.5 flex-shrink-0">
              2 Hours Active
            </Badge>
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
            <ShieldCheck className="w-5 h-5" />
            Allocate Team & Start Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
