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
  Truck,
  Package,
  AlertTriangle,
  UserCheck,
  Bell,
} from "lucide-react";
import {
  HarvestTask,
  HARVEST_TEAMS,
  BRAND_NAMES,
  CHEMICAL_LABELS,
  ChemicalOption,
  BoxType,
  BOX_TYPE_LABELS,
  User,
  VehicleSupplier,
} from "@/types";
import { toast } from "sonner";

interface AssignHarvestModalProps {
  task: HarvestTask;
  supervisors: User[];
  vehicleSuppliers: VehicleSupplier[];
  onClose: () => void;
  onAssign: (data: {
    supervisorId: string;
    supervisorName: string;
    isHighPriority: boolean;
    selectedBoxTypes: BoxType[];
    requiredBoxCounts: Partial<Record<BoxType, number>>;
    brandName: string;
    vehicleSupplierId: string;
    labourTeam: string;
    hasChemicalTreatment?: boolean;
    chemicals: ChemicalOption[];
    hasEthylenePaper?: boolean;
    ethylenePacksCount?: number;
    pingIntervalHours: number;
  }) => void;
}

const ALL_BOX_TYPES: BoxType[] = ["5KG", "7KG", "13KG", "13_5KG", "16KG"];

export function AssignHarvestModal({
  task,
  onClose,
  onAssign,
  supervisors,
  vehicleSuppliers,
}: AssignHarvestModalProps) {
  // Deduplicate harvesting supervisors by name
  const uniqueSupervisors = Array.from(
    new Map(supervisors.map((s) => [s.name.toLowerCase().trim(), s])).values()
  );

  const [supervisorId, setSupervisorId] = useState(task.supervisorId || uniqueSupervisors[0]?.id || "");
  const [isHighPriority, setIsHighPriority] = useState(task.isHighPriority || false);

  // Multi-select Box Types
  const [selectedBoxTypes, setSelectedBoxTypes] = useState<BoxType[]>(
    task.selectedBoxTypes || ["7KG", "13KG"]
  );
  const [requiredBoxCounts, setRequiredBoxCounts] = useState<Partial<Record<BoxType, number>>>(
    task.requiredBoxCounts || { "7KG": 400, "13KG": 300 }
  );

  const [brandName, setBrandName] = useState(task.brandName || BRAND_NAMES[0]);
  const [vehicleSupplierId, setVehicleSupplierId] = useState(
    task.vehicleSupplierId || vehicleSuppliers[0]?.id || ""
  );
  const [labourTeam, setLabourTeam] = useState(task.teamName || HARVEST_TEAMS[0]);
  const [hasChemicalTreatment, setHasChemicalTreatment] = useState<boolean>(task.hasChemicalTreatment ?? true);
  const [selectedChemicals, setSelectedChemicals] = useState<ChemicalOption[]>(
    task.chemicals || ["ETHYLENE_WASH", "FUNGICIDE_DIP"]
  );
  const [hasEthylenePaper, setHasEthylenePaper] = useState<boolean>(task.hasEthylenePaper ?? false);
  const [ethylenePacksCount, setEthylenePacksCount] = useState<string>(
    task.ethylenePacksCount ? String(task.ethylenePacksCount) : "2"
  );
  const [pingIntervalHours, setPingIntervalHours] = useState(task.pingIntervalHours || 2);

  const totalRequired = Object.values(requiredBoxCounts).reduce(
    (a, b) => (a || 0) + (b || 0),
    0
  );
  const topBundlesCount = Math.ceil(totalRequired / 25);
  const bottomBundlesCount = Math.ceil(totalRequired / 20);
  const yieldKg = Number(task.tonnage || 10) * 1000;
  const germinationPaperPcs = Math.round(yieldKg / 40);

  const toggleBoxType = (boxType: BoxType) => {
    if (selectedBoxTypes.includes(boxType)) {
      setSelectedBoxTypes(selectedBoxTypes.filter((b) => b !== boxType));
      const copy = { ...requiredBoxCounts };
      delete copy[boxType];
      setRequiredBoxCounts(copy);
    } else {
      setSelectedBoxTypes([...selectedBoxTypes, boxType]);
      setRequiredBoxCounts({ ...requiredBoxCounts, [boxType]: 100 });
    }
  };

  const handleBoxCountChange = (boxType: BoxType, val: string) => {
    const num = parseInt(val) || 0;
    setRequiredBoxCounts({ ...requiredBoxCounts, [boxType]: num });
  };

  const toggleChemical = (chemKey: ChemicalOption) => {
    if (selectedChemicals.includes(chemKey)) {
      setSelectedChemicals(selectedChemicals.filter((c) => c !== chemKey));
    } else {
      setSelectedChemicals([...selectedChemicals, chemKey]);
    }
  };

  const selectedSupervisor = supervisors.find((s) => s.id === supervisorId);
  const selectedVehicleSupplier = vehicleSuppliers.find((v: VehicleSupplier) => v.id === vehicleSupplierId);

  const isValid =
    supervisorId &&
    selectedBoxTypes.length > 0 &&
    brandName &&
    vehicleSupplierId &&
    labourTeam &&
    (!hasChemicalTreatment || selectedChemicals.length > 0);

  const handleConfirm = () => {
    if (!isValid) return;

    toast.success("Harvest Scheduled & Inventory Alerted!", {
      description: `Pickup notification sent to Inventory Admin for ${task.farmerName}'s farm (${selectedSupervisor?.name}).`,
    });

    onAssign({
      supervisorId,
      supervisorName: selectedSupervisor?.name || "Assigned Supervisor",
      isHighPriority,
      selectedBoxTypes,
      requiredBoxCounts,
      brandName,
      vehicleSupplierId,
      labourTeam,
      hasChemicalTreatment,
      chemicals: hasChemicalTreatment ? selectedChemicals : [],
      hasEthylenePaper,
      ethylenePacksCount: hasEthylenePaper ? parseInt(ethylenePacksCount) || 2 : 0,
      pingIntervalHours,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-black text-slate-900 font-heading flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Sprout className="w-5 h-5" />
              </div>
              Schedule Harvest & Assign Harvest Supervisor
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isHighPriority && (
                <Badge className="bg-rose-600 text-white font-bold text-xs px-2.5 py-1 animate-pulse flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> High Priority
                </Badge>
              )}
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-2.5 py-1">
                Module 2.1
              </Badge>
            </div>
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

          {/* High Priority Toggle & Supervisor Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2 space-y-2">
              <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Assign Harvesting Supervisor <span className="text-rose-500">*</span>
              </Label>
              <Select value={supervisorId} onValueChange={(val: any) => setSupervisorId(val || "")}>
                <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl text-sm font-semibold px-4 shadow-2xs">
                  <SelectValue placeholder="Select active harvesting supervisor...">
                    {selectedSupervisor ? `${selectedSupervisor.name} (Harvesting Supervisor)` : "Select active harvesting supervisor..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl p-1.5">
                  {uniqueSupervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="cursor-pointer py-3 px-3.5 text-sm font-semibold">
                      {s.name} (Harvesting Supervisor)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* High Priority Checkbox */}
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-900 block">High Priority</span>
                <span className="text-[11px] text-rose-600 font-medium">Urgent dispatch tag</span>
              </div>
              <input
                type="checkbox"
                checked={isHighPriority}
                onChange={(e) => setIsHighPriority(e.target.checked)}
                className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Multi-Select Box Types & Required Quantities */}
          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Select Required Box Types & Quantities (Multi-Select) <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {ALL_BOX_TYPES.map((bt) => {
                const isSelected = selectedBoxTypes.includes(bt);
                return (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => toggleBoxType(bt)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{BOX_TYPE_LABELS[bt]}</span>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                        isSelected
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Input required box count per selected type */}
            {selectedBoxTypes.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Required Box Counts to Fulfill Orders
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    Total Order: {totalRequired} Boxes
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedBoxTypes.map((bt) => (
                    <div key={bt} className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">{BOX_TYPE_LABELS[bt]} Boxes</Label>
                      <Input
                        type="number"
                        value={requiredBoxCounts[bt] || ""}
                        onChange={(e) => handleBoxCountChange(bt, e.target.value)}
                        placeholder="Count"
                        className="bg-white border-slate-200 text-slate-900 font-bold h-10 rounded-xl text-sm"
                      />
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          {/* Vehicle Supplier Selection & Labour Team Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                Select Vehicle Supplier <span className="text-rose-500">*</span>
              </Label>
              <Select value={vehicleSupplierId} onValueChange={(val: any) => setVehicleSupplierId(val || "")}>
                <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl text-sm font-semibold px-4 shadow-2xs">
                  <SelectValue placeholder="Choose vehicle supplier...">
                    {selectedVehicleSupplier ? `${selectedVehicleSupplier.supplierName} (${selectedVehicleSupplier.vehicleNumber})` : "Choose vehicle supplier..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl p-1.5">
                  {vehicleSuppliers.map((v: VehicleSupplier) => (
                    <SelectItem key={v.id} value={v.id} className="cursor-pointer py-3 px-3.5 text-sm font-semibold">
                      <div>
                        <span className="font-bold text-slate-900 block">{v.supplierName}</span>
                        <span className="text-xs text-slate-500 font-normal">
                          {v.vehicleNumber} • {v.driverName} ({v.driverPhone})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Select Labour Team Squad <span className="text-rose-500">*</span>
              </Label>
              <Select value={labourTeam} onValueChange={(val: any) => setLabourTeam(val || "")}>
                <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl text-sm font-semibold px-4 shadow-2xs">
                  <SelectValue placeholder="Choose labour team squad...">
                    {labourTeam || "Choose labour team squad..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto p-1.5">
                  {HARVEST_TEAMS.map((team, idx) => (
                    <SelectItem key={idx} value={team} className="cursor-pointer py-3 px-3.5 text-sm font-semibold">
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Brand & Chemical & Ethylene Options */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                Target Packaging Brand Category <span className="text-rose-500">*</span>
              </Label>
              <Select value={brandName} onValueChange={(val: any) => setBrandName(val || "")}>
                <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-12 rounded-xl text-sm font-semibold px-4 shadow-2xs">
                  <SelectValue placeholder="Select brand category...">
                    {brandName || "Select brand category..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl p-1.5">
                  {BRAND_NAMES.map((brand, idx) => (
                    <SelectItem key={idx} value={brand} className="cursor-pointer py-3 px-3.5 text-sm font-semibold">
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional Chemical Treatment Toggle */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-emerald-600" />
                    Chemical Treatment Required?
                  </span>
                  <span className="text-[11px] text-slate-500">Only check if field chemical treatment is requested</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHasChemicalTreatment(!hasChemicalTreatment)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                      hasChemicalTreatment
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {hasChemicalTreatment ? "YES (Chemicals Active)" : "NO (Organic / No Chem)"}
                  </button>
                </div>
              </div>

              {/* Chemical selection dropdown list shows ONLY when toggled ON */}
              {hasChemicalTreatment && (
                <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Select Required Chemicals</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(CHEMICAL_LABELS) as ChemicalOption[]).map((chemKey) => {
                      const isSelected = selectedChemicals.includes(chemKey);
                      return (
                        <button
                          key={chemKey}
                          type="button"
                          onClick={() => toggleChemical(chemKey)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold text-left transition-all ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                              : "bg-white border-slate-200 text-slate-600"
                          }`}
                        >
                          <span>{CHEMICAL_LABELS[chemKey].split(" ")[0]}</span>
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Optional Ethylene Paper / Pouch */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Add Ethylene Paper / Pouch?
                  </span>
                  <span className="text-[11px] text-slate-500">Issued in packs</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHasEthylenePaper(!hasEthylenePaper)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                    hasEthylenePaper
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {hasEthylenePaper ? "YES" : "NO"}
                </button>
              </div>

              {hasEthylenePaper && (
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-3">
                  <Label className="text-xs font-bold text-slate-700">Packs Quantity to Pick</Label>
                  <Input
                    type="number"
                    value={ethylenePacksCount}
                    onChange={(e) => setEthylenePacksCount(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-28 bg-white border-slate-200 text-slate-900 font-bold h-9 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Automated Ping to Inventory Admin Notification Banner */}
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0">
                <Bell className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-sky-950">Automated Inventory Pickup Alert</p>
                <p className="text-xs text-sky-700">Submitting will ping Inventory Admin that empty box & chemical pickup is en-route</p>
              </div>
            </div>
            <Badge className="bg-sky-600 text-white text-xs font-bold px-3 py-1.5 flex-shrink-0">
              Auto Ping Active
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
            Schedule Harvest & Alert Inventory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
