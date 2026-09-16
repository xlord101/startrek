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
  CHEMICAL_DEFAULT_QUANTITIES,
  calculateBundlePlan,
  ChemicalOption,
  BoxType,
  BOX_TYPE_LABELS,
  ROLE_LABELS,
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
    brandBoxCounts: Record<string, Partial<Record<BoxType, number>>>;
    brandName: string;
    vehicleSupplierId: string;
    labourTeam: string;
    hasChemicalTreatment?: boolean;
    chemicals: ChemicalOption[];
    chemicalQuantities?: Partial<Record<ChemicalOption, string>>;
    hasEthylenePaper?: boolean;
    ethylenePacksCount?: number;
    germinationPaperPcs?: number;
    topBundlesCount?: number;
    bottomBundlesCount?: number;
    completeBundlesCount?: number;
    favilocPackets?: number;
    rubberPackets?: number;
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

  // Multi-brand packing plan (Module 4): each brand gets its own per-boxtype counts
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    task.brandName ? [task.brandName] : [BRAND_NAMES[0]]
  );
  const [brandBoxCounts, setBrandBoxCounts] = useState<Record<string, Partial<Record<BoxType, number>>>>(
    task.brandBoxCounts && Object.keys(task.brandBoxCounts).length > 0
      ? task.brandBoxCounts
      : { [BRAND_NAMES[0]]: { "7KG": 100 } }
  );

  const toggleBrand = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      if (selectedBrands.length === 1) return; // at least one brand required
      const nextBrands = selectedBrands.filter((b) => b !== brand);
      const nextCounts = { ...brandBoxCounts };
      delete nextCounts[brand];
      setSelectedBrands(nextBrands);
      setBrandBoxCounts(nextCounts);
    } else {
      setSelectedBrands([...selectedBrands, brand]);
      setBrandBoxCounts({ ...brandBoxCounts, [brand]: { "7KG": 100 } });
    }
  };

  const handleBrandBoxCountChange = (brand: string, boxType: BoxType, val: string) => {
    const num = parseInt(val) || 0;
    setBrandBoxCounts({
      ...brandBoxCounts,
      [brand]: { ...(brandBoxCounts[brand] || {}), [boxType]: num },
    });
  };

  const toggleChemical = (chem: ChemicalOption) => {
    if (selectedChemicals.includes(chem)) {
      setSelectedChemicals(selectedChemicals.filter((c) => c !== chem));
    } else {
      setSelectedChemicals([...selectedChemicals, chem]);
    }
  };

  // Aggregate counts across all brands → requiredBoxCounts + selectedBoxTypes
  const requiredBoxCounts = (() => {
    const agg: Partial<Record<BoxType, number>> = {};
    for (const brand of selectedBrands) {
      const counts = brandBoxCounts[brand] || {};
      for (const [bt, n] of Object.entries(counts)) {
        agg[bt as BoxType] = (agg[bt as BoxType] || 0) + (n || 0);
      }
    }
    return agg;
  })();
  const selectedBoxTypes = ALL_BOX_TYPES.filter((bt) => (requiredBoxCounts[bt] || 0) > 0);

  const [vehicleSupplierId, setVehicleSupplierId] = useState(
    task.vehicleSupplierId || vehicleSuppliers[0]?.id || ""
  );
  const [labourTeam, setLabourTeam] = useState(task.teamName || HARVEST_TEAMS[0]);
  const [hasChemicalTreatment, setHasChemicalTreatment] = useState<boolean>(task.hasChemicalTreatment ?? true);
  const [selectedChemicals, setSelectedChemicals] = useState<ChemicalOption[]>(
    task.chemicals?.filter((c) => c in CHEMICAL_DEFAULT_QUANTITIES) || [...(Object.keys(CHEMICAL_DEFAULT_QUANTITIES) as ChemicalOption[])]
  );
  const [chemicalQuantities, setChemicalQuantities] = useState<Partial<Record<ChemicalOption, string>>>(
    task.chemicalQuantities && Object.keys(task.chemicalQuantities).length > 0
      ? task.chemicalQuantities
      : { ...CHEMICAL_DEFAULT_QUANTITIES }
  );
  const [pingIntervalHours, setPingIntervalHours] = useState(task.pingIntervalHours || 2);

  // Fixed consumables (Module 4): Faviloc 5 packets/vehicle, Rubber 1 packet/vehicle
  const FAVILOC_PACKETS = 5;
  const RUBBER_PACKETS = 1;

  // Totals + bundle plan (2-part: top=25/bundle, bottom=20/bundle; 16KG: 10/bundle)
  const totalRequired = Object.values(requiredBoxCounts).reduce(
    (a, b) => (a || 0) + (b || 0),
    0
  );
  const bundlePlan = calculateBundlePlan(requiredBoxCounts);
  // Ethylene pouches auto-calculated: 1 pouch = 100 pieces, 1 box needs 1 piece
  const ethylenePacksAuto = Math.ceil(totalRequired / 100);
  const yieldKg = Number(task.tonnage || 10) * 1000;
  const germinationPaperPcs = Math.round(yieldKg / 40);

  const selectedSupervisor = supervisors.find((s) => s.id === supervisorId);
  const selectedVehicleSupplier = vehicleSuppliers.find((v: VehicleSupplier) => v.id === vehicleSupplierId);

  const isValid =
    supervisorId &&
    totalRequired > 0 &&
    selectedBrands.length > 0 &&
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
      brandBoxCounts,
      brandName: selectedBrands[0],
      vehicleSupplierId,
      labourTeam,
      hasChemicalTreatment,
      chemicals: hasChemicalTreatment ? selectedChemicals : [],
      chemicalQuantities: hasChemicalTreatment ? chemicalQuantities : {},
      hasEthylenePaper: true,
      ethylenePacksCount: ethylenePacksAuto,
      germinationPaperPcs,
      topBundlesCount: bundlePlan.topBundles,
      bottomBundlesCount: bundlePlan.bottomBundles,
      completeBundlesCount: bundlePlan.completeBundles,
      favilocPackets: FAVILOC_PACKETS,
      rubberPackets: RUBBER_PACKETS,
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
                <h4 className="text-base font-bold text-slate-900">
                  {task.farmerName || (task as any).farmer?.name || "Farmer"}
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {task.address || (task as any).farmer?.address || "Farm Location"}
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
                <SelectTrigger className="w-full bg-white border-slate-200 text-slate-900 h-12 rounded-xl text-sm font-semibold px-4 shadow-2xs">
                  <span className="flex-1 text-left font-semibold text-slate-900 truncate">
                    {selectedSupervisor
                      ? `${selectedSupervisor.name} — ${ROLE_LABELS[selectedSupervisor.role] || selectedSupervisor.role}`
                      : "Select active supervisor..."}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl p-1.5">
                  {uniqueSupervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="cursor-pointer py-3 px-3.5 text-sm font-semibold">
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="font-semibold text-slate-900">{s.name}</span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {ROLE_LABELS[s.role] || s.role}
                        </span>
                      </div>
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

          {/* Brand Selection (Multi) & Per-Brand Box Quantities */}
          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Brand Categories & Box Quantities (Multi-Brand) <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {BRAND_NAMES.map((brand) => {
                const isSelected = selectedBrands.includes(brand);
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => toggleBrand(brand)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{brand}</span>
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

            {/* Per-brand, per-box-type counts */}
            {selectedBrands.map((brand) => (
              <div key={brand} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                    {brand} — Boxes Required
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    {Object.values(brandBoxCounts[brand] || {}).reduce((a, b) => (a || 0) + (b || 0), 0)} Boxes
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {ALL_BOX_TYPES.map((bt) => (
                    <div key={bt} className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">{BOX_TYPE_LABELS[bt]}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={brandBoxCounts[brand]?.[bt] || ""}
                        onChange={(e) => handleBrandBoxCountChange(brand, bt, e.target.value)}
                        placeholder="0"
                        className="bg-white border-slate-200 text-slate-900 font-bold h-10 rounded-xl text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Combined totals + auto bundle/pouch calculation */}
            {totalRequired > 0 && (
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                    Combined Pickup Plan (all brands)
                  </span>
                  <span className="text-xs font-black text-sky-900 bg-white px-2.5 py-0.5 rounded border border-sky-300">
                    Total: {totalRequired} Boxes
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold text-sky-900">
                  {bundlePlan.topBundles > 0 && (
                    <span className="bg-white border border-sky-200 rounded-lg px-2.5 py-1.5">
                      Top Bundles: {bundlePlan.topBundles} <span className="text-sky-600 font-medium">(25 tops each)</span>
                    </span>
                  )}
                  {bundlePlan.bottomBundles > 0 && (
                    <span className="bg-white border border-sky-200 rounded-lg px-2.5 py-1.5">
                      Bottom Bundles: {bundlePlan.bottomBundles} <span className="text-sky-600 font-medium">(20 bottoms each)</span>
                    </span>
                  )}
                  {bundlePlan.completeBundles > 0 && (
                    <span className="bg-white border border-sky-200 rounded-lg px-2.5 py-1.5">
                      16KG Bundles: {bundlePlan.completeBundles} <span className="text-sky-600 font-medium">(10 boxes each)</span>
                    </span>
                  )}
                  <span className="bg-white border border-sky-200 rounded-lg px-2.5 py-1.5">
                    Ethylene Pouches: {ethylenePacksAuto} <span className="text-sky-600 font-medium">(1 per 100 boxes)</span>
                  </span>
                  <span className="bg-white border border-sky-200 rounded-lg px-2.5 py-1.5">
                    Germination Paper: {germinationPaperPcs} pcs <span className="text-sky-600 font-medium">(yield ÷ 40)</span>
                  </span>
                  <span className="bg-white border border-sky-200 rounded-lg px-2.5 py-1.5">
                    Total Bundles: {bundlePlan.totalBundles}
                  </span>
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
                <SelectTrigger className="w-full bg-white border-slate-200 text-slate-900 h-12 rounded-xl text-sm font-semibold px-4 shadow-2xs">
                  <span className="flex-1 text-left font-semibold text-slate-900 truncate">
                    {selectedVehicleSupplier ? `${selectedVehicleSupplier.supplierName} (${selectedVehicleSupplier.vehicleNumber})` : "Choose vehicle supplier..."}
                  </span>
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
                <SelectTrigger className="w-full bg-white border-slate-200 text-slate-900 h-12 rounded-xl text-sm font-semibold px-4 shadow-2xs">
                  <span className="flex-1 text-left font-semibold text-slate-900 truncate">
                    {labourTeam || "Choose labour team squad..."}
                  </span>
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

          {/* Chemical & Ethylene Options */}
          <div className="space-y-4">
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
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Select Required Chemicals & Quantities</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(Object.keys(CHEMICAL_LABELS) as ChemicalOption[]).map((chemKey) => {
                      const isSelected = selectedChemicals.includes(chemKey);
                      return (
                        <div
                          key={chemKey}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-300"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleChemical(chemKey)}
                            className="flex items-center gap-2 flex-1 text-left"
                          >
                            <span className="text-slate-900">{CHEMICAL_LABELS[chemKey]}</span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              (std: {CHEMICAL_DEFAULT_QUANTITIES[chemKey]})
                            </span>
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border flex-shrink-0 ${isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"}`}>
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </button>
                          {isSelected && (
                            <Input
                              type="text"
                              value={chemicalQuantities[chemKey] || ""}
                              onChange={(e) =>
                                setChemicalQuantities({
                                  ...chemicalQuantities,
                                  [chemKey]: e.target.value,
                                })
                              }
                              placeholder="qty"
                              className="w-20 h-7 bg-white border-slate-200 text-slate-900 font-bold rounded-md text-xs px-2"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Ethylene Paper / Pouch — auto-calculated (1 pouch = 100 pcs, 1 box = 1 pc) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Ethylene Paper / Pouch (auto)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    1 pouch = 100 pieces • 1 box needs 1 piece • calculated from total boxes
                  </span>
                </div>
                <span className="text-xs font-black text-indigo-900 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 flex-shrink-0">
                  {ethylenePacksAuto} pouch{ethylenePacksAuto === 1 ? "" : "es"}
                </span>
              </div>
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
