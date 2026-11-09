"use client";

import { useState, useMemo, useEffect } from "react";
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
  PhoneCall,
  MessageSquare,
  Send,
  ExternalLink,
} from "lucide-react";
import {
  HarvestTask,
  HARVEST_TEAMS,
  BRAND_NAMES,
  CHEMICAL_LABELS,
  CHEMICAL_DEFAULT_QUANTITIES,
  calculateBundlePlan,
  calculateGerminationPaperKg,
  calculateBagsKg,
  ChemicalOption,
  BoxType,
  BOX_TYPE_LABELS,
  ROLE_LABELS,
  User,
  VehicleSupplier,
  BoxBrandStock,
  LabourTeam,
} from "@/types";
import { formatHarvestWorkOrderSMS, DEFAULT_OFFICE_NUMBER } from "@/lib/sms-formatter";
import { toast } from "sonner";

interface AssignHarvestModalProps {
  task: HarvestTask;
  supervisors: User[];
  vehicleSuppliers: VehicleSupplier[];
  boxBrands?: string[];
  brandStock?: BoxBrandStock[];
  labourTeams?: LabourTeam[];
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
    labourTeamPhone?: string;
    officeNumber?: string;
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
    bagsKg?: number;
    foamUnit?: number;
  }) => void;
  isReadOnly?: boolean;
}

const ALL_BOX_TYPES: BoxType[] = ["5KG", "7KG", "13KG", "13_5KG", "16KG"];

export function AssignHarvestModal({
  task,
  onClose,
  onAssign,
  supervisors,
  vehicleSuppliers,
  boxBrands,
  brandStock = [],
  labourTeams = [],
  isReadOnly = false,
}: AssignHarvestModalProps) {
  // Deduplicate harvesting supervisors by name
  const uniqueSupervisors = Array.from(
    new Map(supervisors.map((s) => [s.name.toLowerCase().trim(), s])).values()
  );

  const [supervisorId, setSupervisorId] = useState(task.supervisorId || uniqueSupervisors[0]?.id || "");
  const [isHighPriority, setIsHighPriority] = useState(task.isHighPriority || false);

  // Multi-brand packing plan (Module 4): each brand gets its own per-boxtype counts
  // Start empty so the admin actively selects brands — nothing pre-filled.
  // Prefill from an existing task is normalized: legacy brand names (pre-rework
  // hardcoded names like "StarPremium Export Grade") and unknown brands are
  // dropped, since only DB-managed brands exist in inventory.
  const dbBrands: string[] = boxBrands && boxBrands.length > 0 ? boxBrands : BRAND_NAMES;
  const canonicalBrand = (name: string): string | null => {
    const trimmed = (name || "").trim();
    if (!trimmed) return null;
    const match = dbBrands.find((b) => b.toLowerCase() === trimmed.toLowerCase());
    return match || null; // unknown/legacy brands are dropped, admin reselects
  };
  const validBoxTypes = new Set<string>(ALL_BOX_TYPES);
  const initialSelectedBrands = (() => {
    const fromTask = canonicalBrand(task.brandName || "");
    const fromCounts = Object.keys(task.brandBoxCounts || {})
      .map(canonicalBrand)
      .filter((b): b is string => !!b);
    return Array.from(new Set([fromTask, ...fromCounts].filter((b): b is string => !!b)));
  })();
  const initialBrandBoxCounts = (() => {
    const out: Record<string, Partial<Record<BoxType, number>>> = {};
    for (const [legacyBrand, counts] of Object.entries(task.brandBoxCounts || {})) {
      const brand = canonicalBrand(legacyBrand);
      if (!brand) continue; // drop legacy/unknown brand entirely
      const clean: Partial<Record<BoxType, number>> = {};
      for (const [bt, n] of Object.entries(counts || {})) {
        if (validBoxTypes.has(bt) && Number(n) > 0) clean[bt as BoxType] = Number(n);
      }
      if (Object.keys(clean).length > 0) out[brand] = clean;
    }
    return out;
  })();
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialSelectedBrands);
  const [brandBoxCounts, setBrandBoxCounts] = useState<Record<string, Partial<Record<BoxType, number>>>>(
    initialBrandBoxCounts
  );
  const [includeSurplus, setIncludeSurplus] = useState(true);

  const finalBrandBoxCounts = useMemo(() => {
    const finalCounts: Record<string, Partial<Record<BoxType, number>>> = {};
    let maxBrand = "";
    let maxBt = "";
    let maxCount = -1;

    for (const brand of selectedBrands) {
      finalCounts[brand] = { ...brandBoxCounts[brand] };
      for (const [bt, n] of Object.entries(finalCounts[brand] || {})) {
        const val = Number(n) || 0;
        if (val > maxCount) {
          maxCount = val;
          maxBrand = brand;
          maxBt = bt;
        }
      }
    }

    if (includeSurplus && maxBrand && maxBt && maxCount > 0) {
      finalCounts[maxBrand][maxBt as BoxType] = (finalCounts[maxBrand][maxBt as BoxType] || 0) + 50;
    }

    return finalCounts;
  }, [selectedBrands, brandBoxCounts, includeSurplus]);

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
      // Start at zero — the admin enters real quantities; no convenience defaults.
      setBrandBoxCounts((prev) => ({ ...prev, [brand]: prev[brand] || {} }));
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
      const counts = finalBrandBoxCounts[brand] || {};
      for (const [bt, n] of Object.entries(counts)) {
        agg[bt as BoxType] = (agg[bt as BoxType] || 0) + (Number(n) || 0);
      }
    }
    return agg;
  })();
  const selectedBoxTypes = ALL_BOX_TYPES.filter((bt) => (requiredBoxCounts[bt] || 0) > 0);

  const [vehicleSupplierId, setVehicleSupplierId] = useState(
    task.vehicleSupplierId || vehicleSuppliers[0]?.id || ""
  );

  const [labourTeamsList, setLabourTeamsList] = useState<LabourTeam[]>(labourTeams || []);
  const initialTeam = task.labourTeam || task.teamName || (labourTeams && labourTeams[0]?.teamName) || HARVEST_TEAMS[0];
  const initialPhone = task.labourTeamPhone || (labourTeams?.find((t) => t.teamName === initialTeam)?.contactNumber || "+91 98221 12345");

  const [labourTeam, setLabourTeam] = useState(initialTeam);
  const [labourTeamPhone, setLabourTeamPhone] = useState(initialPhone);
  const [officeNumber, setOfficeNumber] = useState(DEFAULT_OFFICE_NUMBER);
  const [sentSMSDialog, setSentSMSDialog] = useState<{ open: boolean; phone: string; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/labour-teams")
      .then((r) => r.json())
      .then((data) => {
        if (data.teams && data.teams.length > 0) {
          setLabourTeamsList(data.teams);
          const found = data.teams.find((t: LabourTeam) => t.teamName === labourTeam);
          if (found && !labourTeamPhone) {
            setLabourTeamPhone(found.contactNumber);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectLabourTeam = (val: string) => {
    setLabourTeam(val);
    const found = labourTeamsList.find((t) => t.teamName === val);
    if (found && found.contactNumber) {
      setLabourTeamPhone(found.contactNumber);
    }
  };

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
  // Germination paper (KG, form-only): 5/7KG boxes ÷ 45 ÷ 2, others ÷ 45
  const germinationPaperPcs = calculateGerminationPaperKg(requiredBoxCounts);
  
  const ethylenePouches = Math.ceil(totalRequired / 100);
  const bagsKg = calculateBagsKg(requiredBoxCounts);
  const foamUnit = 1;

  const selectedSupervisor = supervisors.find((s) => s.id === supervisorId);
  const selectedVehicleSupplier = vehicleSuppliers.find((v: VehicleSupplier) => v.id === vehicleSupplierId);

  // Live brand-wise availability lookup: { [brand]: { [boxType]: available } }
  const brandAvailability = (() => {
    const map: Record<string, Partial<Record<BoxType, number>>> = {};
    for (const row of brandStock) {
      if (!map[row.brandName]) map[row.brandName] = {};
      map[row.brandName][row.boxType] = row.availableStock;
    }
    return map;
  })();

  // Shortage check: every requested brand+boxType must fit inside live stock.
  // Unknown brands/sizes (no stock row yet) are treated as 0 available.
  const shortageLines: string[] = [];
  for (const brand of selectedBrands) {
    const counts = finalBrandBoxCounts[brand] || {};
    for (const [bt, n] of Object.entries(counts)) {
      const need = Number(n) || 0;
      if (need <= 0) continue;
      const have = brandAvailability[brand]?.[bt as BoxType] ?? 0;
      if (need > have) {
        shortageLines.push(`${brand} ${BOX_TYPE_LABELS[bt as BoxType] || bt}: need ${need}, in stock ${have}`);
      }
    }
  }

  const isValid =
    supervisorId &&
    totalRequired > 0 &&
    selectedBrands.length > 0 &&
    shortageLines.length === 0 &&
    vehicleSupplierId &&
    labourTeam &&
    labourTeamPhone &&
    (!hasChemicalTreatment || selectedChemicals.length > 0);

  const handleConfirm = () => {
    if (!isValid) {
      if (shortageLines.length > 0) {
        toast.error("Not enough brand stock in inventory", {
          description: shortageLines.slice(0, 3).join(" • ") + (shortageLines.length > 3 ? ` (+${shortageLines.length - 3} more)` : ""),
        });
      } else if (!labourTeamPhone) {
        toast.error("Labour team contact number is required for work order text dispatch");
      }
      return;
    }

    const workOrderText = formatHarvestWorkOrderSMS({
      farmerName: task.farmerName || (task as any).farmer?.name || "Farmer",
      farmerPhone: task.mobileNumber || (task as any).farmerPhone || "",
      farmerAddress: task.address || (task as any).address || "Farm Location",
      tonnage: task.tonnage,
      quality: task.quality,
      supervisorName: selectedSupervisor?.name,
      supervisorPhone: (selectedSupervisor as any)?.phone || (selectedSupervisor as any)?.mobileNumber,
      labourTeam,
      labourTeamPhone,
      vehicleNumber: selectedVehicleSupplier?.vehicleNumber,
      vehicleSupplierName: selectedVehicleSupplier?.supplierName,
      driverName: selectedVehicleSupplier?.driverName || undefined,
      driverPhone: selectedVehicleSupplier?.driverPhone || undefined,
      brandBoxCounts: finalBrandBoxCounts,
      requiredBoxCounts,
      totalBoxes: totalRequired,
      topBundles: bundlePlan.topBundles,
      bottomBundles: bundlePlan.bottomBundles,
      completeBundles: bundlePlan.completeBundles,
      totalBundles: bundlePlan.totalBundles,
      favilocPackets: FAVILOC_PACKETS,
      rubberPackets: RUBBER_PACKETS,
      foamUnit,
      germinationPaperPcs,
      bagsKg,
      ethylenePacksCount: ethylenePouches,
      hasChemicalTreatment,
      chemicals: hasChemicalTreatment ? selectedChemicals : [],
      chemicalQuantities: hasChemicalTreatment ? chemicalQuantities : {},
      officeNumber: officeNumber || DEFAULT_OFFICE_NUMBER,
    });

    toast.success("Harvest Scheduled & Work Order Text Dispatched!", {
      description: `Text dispatched to ${labourTeam} (${labourTeamPhone}) from office ${officeNumber || DEFAULT_OFFICE_NUMBER}.`,
    });

    onAssign({
      supervisorId,
      supervisorName: selectedSupervisor?.name || "Assigned Supervisor",
      isHighPriority,
      selectedBoxTypes,
      requiredBoxCounts,
      brandBoxCounts: finalBrandBoxCounts,
      brandName: selectedBrands[0],
      vehicleSupplierId,
      labourTeam,
      labourTeamPhone,
      officeNumber: officeNumber || DEFAULT_OFFICE_NUMBER,
      hasChemicalTreatment,
      chemicals: hasChemicalTreatment ? selectedChemicals : [],
      chemicalQuantities: hasChemicalTreatment ? chemicalQuantities : {},
      hasEthylenePaper: ethylenePouches > 0,
      ethylenePacksCount: ethylenePouches,
      germinationPaperPcs,
      topBundlesCount: bundlePlan.topBundles,
      bottomBundlesCount: bundlePlan.bottomBundles,
      completeBundlesCount: bundlePlan.completeBundles,
      favilocPackets: FAVILOC_PACKETS,
      rubberPackets: RUBBER_PACKETS,
      bagsKg,
      foamUnit,
      pingIntervalHours,
    });

    setSentSMSDialog({
      open: true,
      phone: labourTeamPhone,
      text: workOrderText,
    });
  };

  return (
    <>
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

            {/* Surplus Buffer Checkbox */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between col-span-1 sm:col-span-2">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">Include 50-Box Surplus Buffer</span>
                <span className="text-[11px] text-emerald-600 font-medium">Adds 50 extra boxes (with related consumables) for safety. Unused ones will be tracked in Returns.</span>
              </div>
              <input
                type="checkbox"
                checked={includeSurplus}
                onChange={(e) => setIncludeSurplus(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
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
              {(boxBrands && boxBrands.length > 0 ? boxBrands : BRAND_NAMES).map((brand) => {
                const isSelected = selectedBrands.includes(brand);
                const brandTotal = Object.values(brandBoxCounts[brand] || {}).reduce((a, b) => (a || 0) + (b || 0), 0);
                const brandHave = Object.values(brandAvailability[brand] || {}).reduce((a, b) => (a || 0) + (b || 0), 0);
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
                    <span className="flex flex-col items-start gap-0.5">
                      <span>{brand}</span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        In stock: {brandHave} {brandTotal > 0 ? `• need ${brandTotal}` : ""}
                      </span>
                    </span>
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
                    {Object.values(finalBrandBoxCounts[brand] || {}).reduce((a: number, b) => a + (Number(b) || 0), 0)} Boxes
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {ALL_BOX_TYPES.map((bt) => {
                    const need = Number(finalBrandBoxCounts[brand]?.[bt]) || 0;
                    const have = brandAvailability[brand]?.[bt] ?? 0;
                    const over = need > have;
                    return (
                    <div key={bt} className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">
                        {BOX_TYPE_LABELS[bt]}
                        <span className={`ml-1.5 font-semibold ${over ? "text-rose-600" : "text-slate-400"}`}>
                          (stock {have})
                        </span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={brandBoxCounts[brand]?.[bt] || ""}
                        onChange={(e) => handleBrandBoxCountChange(brand, bt, e.target.value)}
                        placeholder="0"
                        className={`bg-white font-bold h-10 rounded-xl text-sm ${over ? "border-rose-400 text-rose-700" : "border-slate-200 text-slate-900"}`}
                      />
                    </div>
                    );
                  })}
                </div>
                {shortageLines.filter((l) => l.startsWith(brand + " ")).map((l) => (
                  <p key={l} className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {l} — reduce this brand or add the rest to another brand
                  </p>
                ))}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs sm:text-sm font-bold text-sky-950">
                  {bundlePlan.topBundles > 0 && (
                    <span className="bg-white border border-sky-200 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Top Bundles:</span>
                      <span className="font-black text-sky-900">{bundlePlan.topBundles}</span>
                    </span>
                  )}
                  {bundlePlan.bottomBundles > 0 && (
                    <span className="bg-white border border-sky-200 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Bottom Bundles:</span>
                      <span className="font-black text-sky-900">{bundlePlan.bottomBundles}</span>
                    </span>
                  )}
                  {bundlePlan.completeBundles > 0 && (
                    <span className="bg-white border border-sky-200 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-slate-600 font-medium">16KG Bundles:</span>
                      <span className="font-black text-sky-900">{bundlePlan.completeBundles}</span>
                    </span>
                  )}
                  <span className="bg-white border border-sky-200 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Total Bundles:</span>
                    <span className="font-black text-sky-900">{bundlePlan.totalBundles}</span>
                  </span>
                  <span className="bg-white border border-sky-200 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Germination Paper:</span>
                    <span className="font-black text-sky-900">{germinationPaperPcs} kg</span>
                  </span>
                  <span className="bg-white border border-sky-200 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Bags:</span>
                    <span className="font-black text-sky-900">{bagsKg.toFixed(2)} kg</span>
                  </span>
                  <span className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-indigo-950 flex items-center justify-between">
                    <span className="text-indigo-700 font-medium">Ethylene Pouches:</span>
                    <span className="font-black text-indigo-900">{ethylenePouches} pouches</span>
                  </span>
                  <span className="bg-white border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 flex items-center justify-between">
                    <span className="text-emerald-700 font-medium">Faviloc:</span>
                    <span className="font-black text-emerald-900">{FAVILOC_PACKETS} pkts</span>
                  </span>
                  <span className="bg-white border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 flex items-center justify-between">
                    <span className="text-emerald-700 font-medium">Rubber:</span>
                    <span className="font-black text-emerald-900">{RUBBER_PACKETS} pkt</span>
                  </span>
                  <span className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-indigo-950 flex items-center justify-between">
                    <span className="text-indigo-700 font-medium">Foam:</span>
                    <span className="font-black text-indigo-900">{foamUnit} unit</span>
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
              <Label className="text-sm font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Select Labour Team Squad <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-amber-600" /> Auto Work Order Text
                </span>
              </Label>
              <Select value={labourTeam} onValueChange={(val: any) => handleSelectLabourTeam(val || "")}>
                <SelectTrigger className="w-full bg-white border-slate-200 text-slate-900 h-12 rounded-xl text-sm font-semibold px-4 shadow-2xs">
                  <span className="flex-1 text-left font-semibold text-slate-900 truncate">
                    {labourTeam || "Choose labour team squad..."}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto p-1.5">
                  {(labourTeamsList.length > 0
                    ? labourTeamsList
                    : HARVEST_TEAMS.map((team, idx) => ({
                        id: `team_${idx}`,
                        teamName: team,
                        leaderName: "Squad Leader",
                        contactNumber: "+91 98221 12345",
                        memberCount: 12,
                        isActive: true,
                      }))
                  ).map((team) => (
                    <SelectItem key={team.id || team.teamName} value={team.teamName} className="cursor-pointer py-3 px-3.5 text-sm font-semibold">
                      <div>
                        <span className="font-bold text-slate-900 block">{team.teamName}</span>
                        <span className="text-xs text-slate-500 font-normal">
                          Leader: {team.leaderName || "Leader"} • 📞 {team.contactNumber} ({team.memberCount || 10} members)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Labour Team Work Order Text Settings */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-amber-600" />
                Labour Team Contact Number (Work Order Text Dispatch) <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                Direct Text Dispatch Active
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="sm:col-span-2">
                <Input
                  type="tel"
                  value={labourTeamPhone}
                  onChange={(e) => setLabourTeamPhone(e.target.value)}
                  placeholder="Enter 10-digit mobile number, e.g. +91 98221 12345"
                  className="bg-white font-mono font-bold text-sm h-11 border-amber-300 text-slate-900 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-amber-800 block mb-0.5">From Office Line</Label>
                <Input
                  value={officeNumber}
                  onChange={(e) => setOfficeNumber(e.target.value)}
                  placeholder="Office number"
                  className="bg-white font-mono font-semibold text-xs h-11 border-amber-200 text-slate-700 rounded-xl"
                />
              </div>
            </div>
            <p className="text-[11px] text-amber-900/80 font-medium">
              Upon submitting, a complete text message with all filled details (farmer name & farm location, yield, supervisor, vehicle & driver, box specifications, and chemical treatments) will be dispatched from the office line to this labour contractor.
            </p>
          </div>

          {/* Chemical Options */}
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
          </div>

          {/* Ethylene Paper / Pouch Card */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/70 flex items-center justify-between">
            <div>
              <span className="text-xs sm:text-sm font-bold text-indigo-950 block">
                Ethylene Paper / Pouches
              </span>
              <span className="text-xs text-indigo-700 font-medium">
                Batch preservation pouches issued with boxes
              </span>
            </div>
            <span className="text-xs sm:text-sm font-black text-indigo-900 bg-white px-3.5 py-2 rounded-xl border border-indigo-200 shadow-2xs">
              {ethylenePouches} {ethylenePouches === 1 ? "Pouch" : "Pouches"}
            </span>
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

          {/* Automated Direct Text to Labour Team Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-amber-950">Direct Work Order Text to Labour Team</p>
                <p className="text-xs text-amber-700">Submitting will text the whole filled form from Office ({officeNumber || DEFAULT_OFFICE_NUMBER}) to {labourTeam} ({labourTeamPhone})</p>
              </div>
            </div>
            <Badge className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 flex-shrink-0">
              Direct SMS Active
            </Badge>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200 text-slate-700 font-bold h-12 text-sm px-5">
            {isReadOnly ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button
              onClick={handleConfirm}
              disabled={!isValid}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-12 px-6 text-sm sm:text-base shadow-md shadow-emerald-600/20 gap-2 flex-1 sm:flex-none"
            >
              <ShieldCheck className="w-5 h-5" />
              Schedule Harvest & Send Work Order Text
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Sent Work Order Text Dialog */}
    {sentSMSDialog && (
      <Dialog open={sentSMSDialog.open} onOpenChange={() => { setSentSMSDialog(null); onClose(); }}>
        <DialogContent className="sm:max-w-lg bg-white border-slate-200 shadow-2xl rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
              <MessageSquare className="w-5 h-5 text-emerald-600" /> Work Order Text Dispatched!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <p className="font-bold text-emerald-900">
                Work order text message dispatched from office line <span className="font-mono font-bold">{officeNumber}</span> to Labour Leader <span className="font-mono font-bold">{sentSMSDialog.phone}</span>.
              </p>
              <p className="text-emerald-700 text-[11px]">
                The complete filled form (farmer details, farm location, yield, supervisor, vehicle & driver, box specifications, and chemical treatments) has been sent and recorded.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Full Work Order Text Preview:</Label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-56 overflow-y-auto font-mono text-[11px] whitespace-pre-wrap text-slate-800 scrollbar-thin">
                {sentSMSDialog.text}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <a
                href={`sms:${sentSMSDialog.phone.replace(/[^\d+]/g, "")}?body=${encodeURIComponent(sentSMSDialog.text)}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" /> Open Direct SMS App
              </a>
              <a
                href={`https://wa.me/${sentSMSDialog.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(sentSMSDialog.text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Send via WhatsApp
              </a>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              onClick={() => { setSentSMSDialog(null); onClose(); }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-11"
            >
              Done & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
