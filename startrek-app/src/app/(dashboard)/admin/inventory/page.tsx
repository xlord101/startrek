"use client";

import { useState, useCallback, useMemo } from "react";
import { store, useStartrekStore } from "@/lib/store";
import { useLiveData } from "@/hooks/useLiveData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Warehouse,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Package,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  Truck,
  Layers,
  Boxes,
  FlaskConical,
} from "lucide-react";
import { InventoryReturnRequest, BOX_TYPE_LABELS, BoxType } from "@/types";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import {
  CHEMICAL_CONFIG,
  FIXED_CHEMICAL_KEYS,
  convertChemicalToBase,
  formatChemicalStock,
  formatChemicalUsageLabel,
  getDefaultInputUnit,
  isChemicalItem,
  normalizeChemicalKey,
  parseChemicalUsageToBase,
} from "@/lib/chemicals";
import {
  CORE_HARVEST_PACKING_KEYS,
  STANDARD_CONSUMABLE_LABELS,
  STANDARD_CONSUMABLE_UNITS,
  formatConsumableLabel,
  formatGermEthyleneStock,
  isGermEthylenePaper,
  isKgConsumable,
  normalizeConsumableItemType,
  normalizeExtraConsumables,
  roundStockQty,
  SHEETS_PER_BOX,
} from "@/lib/consumables";

function BrandStockCard({ row, onAdjust, onTopUp }: {
  row: { brandName: string; boxType: string; availableStock: number; issuedStock: number };
  onAdjust: (brandName: string, boxType: string, action: "REMOVE_BRAND_STOCK" | "RESET_BRAND_STOCK") => void;
  onTopUp: () => void;
}) {
  const bt = String(row.boxType).replace("BOX_", "");
  return (
    <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 space-y-3 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">{row.brandName}</span>
          <Badge variant="outline" className="bg-slate-50 text-slate-700 text-[10px] font-bold">
            {BOX_TYPE_LABELS[bt as BoxType] || bt}
          </Badge>
        </div>
        <div className="flex items-baseline justify-between pt-1 border-b border-slate-100 pb-2">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Available</span>
            <span className="text-2xl font-black text-emerald-700 font-heading">{row.availableStock}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium block">Issued</span>
            <span className="text-sm font-bold text-amber-700">{row.issuedStock}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <Button size="sm" variant="outline" onClick={onTopUp} className="flex-1 text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-xs font-bold h-7.5 gap-1 rounded-lg">
          <Plus className="w-3 h-3" /> Add
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAdjust(row.brandName, bt, "REMOVE_BRAND_STOCK")} className="text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-xs font-bold h-7.5 px-2.5 rounded-lg" title="Deduct stock">
          <Minus className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAdjust(row.brandName, bt, "RESET_BRAND_STOCK")} className="text-rose-600 border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold h-7.5 px-2 rounded-lg" title="Reset to 0">
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  );
}

function BrandNameModal({ value, onChange, onClose, onSave }: {
  value: string; onChange: (v: string) => void; onClose: () => void; onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Add Box Brand</h3>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. StarPremium Export Grade" className="bg-white border-slate-200 text-slate-900 font-bold h-10 rounded-xl text-sm" />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-sm">Cancel</Button>
          <Button onClick={onSave} className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm">Save Brand</Button>
        </div>
      </div>
    </div>
  );
}

function BrandStockModal({ form, onChange, brandNames, onClose, onSave }: {
  form: { brandName: string; boxType: string; qty: number };
  onChange: (f: { brandName: string; boxType: string; qty: number }) => void;
  brandNames: string[];
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Add Brand Stock</h3>
        <div className="space-y-1">
          <Label className="text-xs font-bold text-slate-700">Brand</Label>
          <Input value={form.brandName} onChange={(e) => onChange({ ...form, brandName: e.target.value })} placeholder="Brand name" list="brand-name-options" className="bg-white border-slate-200 text-slate-900 font-bold h-10 rounded-xl text-sm" />
          <datalist id="brand-name-options">
            {brandNames.map((n) => (<option key={n} value={n} />))}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Box size</Label>
            <Input value={form.boxType} onChange={(e) => onChange({ ...form, boxType: e.target.value.toUpperCase() })} placeholder="7KG" className="bg-white border-slate-200 text-slate-900 font-bold h-10 rounded-xl text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Qty</Label>
            <Input type="number" min="1" value={form.qty || ""} onChange={(e) => onChange({ ...form, qty: Number(e.target.value) })} placeholder="0" className="bg-white border-slate-200 text-slate-900 font-bold h-10 rounded-xl text-sm" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-sm">Cancel</Button>
          <Button onClick={onSave} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm">Add Stock</Button>
        </div>
      </div>
    </div>
  );
}

const CONSUMABLE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(STANDARD_CONSUMABLE_LABELS).map(([k, v]) => [`CONSUMABLE_${k}`, v])
);

function getConsumableLabel(itemType: string): string {
  return formatConsumableLabel(itemType);
}

function renderChemicalUsageBadges(
  task: {
    hasChemicalTreatment?: boolean | null;
    chemicals?: string[] | null;
    chemicalQuantities?: Record<string, string> | null;
  },
  badgeClassName = "bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-bold"
) {
  if (task?.hasChemicalTreatment === false || !Array.isArray(task?.chemicals)) return null;
  return task.chemicals.map((rawChem) => {
    const cleanKey = normalizeChemicalKey(rawChem);
    if (!cleanKey) return null;
    const usageStr =
      task.chemicalQuantities?.[cleanKey] ||
      task.chemicalQuantities?.[rawChem] ||
      CHEMICAL_CONFIG[cleanKey].standardUsageLabel;
    return (
      <Badge key={rawChem} variant="outline" className={badgeClassName}>
        {CHEMICAL_CONFIG[cleanKey].label}: {usageStr}
      </Badge>
    );
  });
}

export default function InventoryAdminPage() {
  const { inventoryStock, consumableInventoryStock, boxBrands, brandStock, inventoryReturns, pendingMaterialRequests, dispatchedMaterialLogs } = useStartrekStore();

  const fetchInventory = useCallback(() => {
    return fetch("/api/inventory")
      .then((r) => {
        if (r.status === 401) window.location.href = '/login';
        return r.json();
      })
      .then((data) => {
        if (data.items) {
          store.setInventoryStock(data.items);
        }
        if (data.consumableItems) {
          store.setConsumableInventoryStock(data.consumableItems);
        }
        if (data.boxBrands) {
          store.setBoxBrands(data.boxBrands);
        }
        if (data.brandStock) {
          store.setBrandStock(data.brandStock);
        }
        if (data.returns) {
          store.setInventoryReturns(data.returns);
        }
        if (data.pendingRequests) {
          store.setPendingMaterialRequests(data.pendingRequests);
        }
        if (data.dispatchedLogs) {
          store.setDispatchedMaterialLogs(data.dispatchedLogs);
        }
      })
      .catch(() => {});
  }, []);

  // Focus/visibility-aware live refresh instead of blind 5s polling
  useLiveData([fetchInventory]);

  const [activeTab, setActiveTab] = useState<"BOXES" | "CONSUMABLES" | "DISPATCHES" | "RETURNS">("BOXES");

  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [showBrandStockModal, setShowBrandStockModal] = useState(false);
  const [brandForm, setBrandForm] = useState({ brandName: "", boxType: "7KG", qty: 0 });

  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const isWithinDateRange = useCallback((dateStr?: Date | string) => {
    if (!filterDateFrom && !filterDateTo) return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const time = d.getTime();
    if (filterDateFrom) {
      const [fy, fm, fd] = filterDateFrom.split("-").map(Number);
      const from = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
      if (time < from.getTime()) return false;
    }
    if (filterDateTo) {
      const [ty, tm, td] = filterDateTo.split("-").map(Number);
      const to = new Date(ty, tm - 1, td, 23, 59, 59, 999);
      if (time > to.getTime()) return false;
    }
    return true;
  }, [filterDateFrom, filterDateTo]);

  const refreshInventory = () => fetchInventory();

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) { toast.error("Enter a brand name"); return; }
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CREATE_BRAND", name: newBrandName.trim() }),
      });
      if (!res.ok) throw new Error("Create failed");
      toast.success(`Brand "${newBrandName.trim()}" added — now available in the harvest form.`);
      setShowBrandModal(false);
      setNewBrandName("");
      refreshInventory();
    } catch { toast.error("Failed to add brand"); }
  };

  const handleSetBrandActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SET_BRAND_ACTIVE", id, isActive }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(isActive ? "Brand activated" : "Brand deactivated");
      refreshInventory();
    } catch { toast.error("Failed to update brand"); }
  };

  const handleAddBrandStock = async () => {
    if (!brandForm.brandName.trim() || !brandForm.boxType || brandForm.qty <= 0) {
      toast.error("Enter brand, box size and a positive quantity");
      return;
    }
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_BRAND_STOCK", brandName: brandForm.brandName.trim(), boxType: brandForm.boxType, quantity: brandForm.qty }),
      });
      if (!res.ok) throw new Error("Add failed");
      toast.success(`Added ${brandForm.qty} × ${brandForm.boxType} to ${brandForm.brandName}`);
      setShowBrandStockModal(false);
      setBrandForm({ brandName: "", boxType: "7KG", qty: 0 });
      refreshInventory();
    } catch { toast.error("Failed to add brand stock"); }
  };

  const handleBrandStockAdjust = async (brandName: string, boxType: string, action: "REMOVE_BRAND_STOCK" | "RESET_BRAND_STOCK") => {
    const qty = action === "REMOVE_BRAND_STOCK" ? Number(window.prompt(`Deduct how many ${boxType} boxes from ${brandName}?`, "10")) : 0;
    if (action === "REMOVE_BRAND_STOCK" && (!qty || qty <= 0)) return;
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, brandName, boxType, quantity: qty || undefined }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Brand stock updated");
      refreshInventory();
    } catch { toast.error("Failed to update brand stock"); }
  };

  const [verifyTarget, setVerifyTarget] = useState<InventoryReturnRequest | null>(null);
  const [actualReturnedInput, setActualReturnedInput] = useState<number>(50);
  const [actualReturnedSheetsInput, setActualReturnedSheetsInput] = useState<number>(0);

  const [dispatchTarget, setDispatchTarget] = useState<any>(null);
  const [dispatchCounts, setDispatchCounts] = useState<Record<string, number>>({});
  const [dispatchConsumables, setDispatchConsumables] = useState<Record<string, number>>({});

  const handleOpenVerify = (req: InventoryReturnRequest) => {
    setVerifyTarget(req);
    setActualReturnedInput(req.expectedReturnBoxes || 0);
    setActualReturnedSheetsInput(req.expectedReturnSheets || 0);
  };

  const expected = verifyTarget ? verifyTarget.expectedReturnBoxes : 0;
  const wastageCalculated = expected - actualReturnedInput > 0 ? expected - actualReturnedInput : 0;
  const expectedSheets = verifyTarget ? (verifyTarget.expectedReturnSheets || 0) : 0;
  const wastageSheetsCalculated = expectedSheets - actualReturnedSheetsInput > 0 ? expectedSheets - actualReturnedSheetsInput : 0;

  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [stockActionMode, setStockActionMode] = useState<"ADD" | "REMOVE" | "RESET" | "DELETE">("ADD");
  const [addStockCategory, setAddStockCategory] = useState<"BOX" | "CONSUMABLE">("BOX");
  const [addStockType, setAddStockType] = useState<string>("BOX_7KG");
  const [addStockQtyStr, setAddStockQtyStr] = useState<string>("");
  const [addStockUnit, setAddStockUnit] = useState<string>("kg");
  const [customItemName, setCustomItemName] = useState<string>("");
  const [customItemUnit, setCustomItemUnit] = useState<string>("kg");

  const consumableDropdownOptions = useMemo(() => {
    const map = new Map<string, string>(Object.entries(CONSUMABLE_LABELS));
    for (const item of consumableInventoryStock || []) {
      const clean = normalizeConsumableItemType(item.itemType);
      if (!clean || clean === "CORNER_GUARDS") continue;
      const key = `CONSUMABLE_${clean}`;
      if (!map.has(key)) {
        map.set(key, `${formatConsumableLabel(clean)} (${item.unit || "units"})`);
      }
    }
    return Array.from(map.entries());
  }, [consumableInventoryStock]);

  const customInventoryItems = useMemo(() => {
    return (consumableInventoryStock || []).filter((item) => {
      const clean = normalizeConsumableItemType(item.itemType);
      return clean && !isChemicalItem(clean) && !CORE_HARVEST_PACKING_KEYS.has(clean) && clean !== "CORNER_GUARDS";
    });
  }, [consumableInventoryStock]);

  const openAddBoxStock = (type?: string, mode: "ADD" | "REMOVE" | "RESET" = "ADD") => {
    setStockActionMode(mode);
    setAddStockCategory("BOX");
    setAddStockType(type || "BOX_7KG");
    setAddStockQtyStr("");
    setShowAddStockModal(true);
  };

  const resolveConsumableDefaultUnit = (targetType: string) => {
    if (isChemicalItem(targetType)) return getDefaultInputUnit(targetType);
    const clean = normalizeConsumableItemType(targetType);
    if (isGermEthylenePaper(clean)) return "boxes";
    const dbMatch = (consumableInventoryStock || []).find(
      (c) => normalizeConsumableItemType(c.itemType) === clean
    );
    if (isKgConsumable(clean, dbMatch?.unit)) return "kg";
    return dbMatch?.unit || STANDARD_CONSUMABLE_UNITS[clean] || "units";
  };

  const openAddConsumableStock = (type?: string, mode: "ADD" | "REMOVE" | "RESET" | "DELETE" = "ADD") => {
    const targetType = type || "CONSUMABLE_C_CHEMICAL";
    const resolvedMode = mode === "DELETE" && isChemicalItem(targetType) ? "RESET" : mode;
    setStockActionMode(resolvedMode);
    setAddStockCategory("CONSUMABLE");
    setAddStockType(targetType);
    setAddStockQtyStr("");
    setCustomItemName("");
    setCustomItemUnit("kg");
    if (targetType === "__CREATE_NEW__") {
      setAddStockUnit("kg");
    } else {
      setAddStockUnit(resolveConsumableDefaultUnit(targetType));
    }
    setShowAddStockModal(true);
  };

  const handleConfirmStockAction = async () => {
    const parsedQty = parseFloat(addStockQtyStr);
    const isCreatingNew = addStockCategory === "CONSUMABLE" && addStockType === "__CREATE_NEW__";
    const effectiveType = isCreatingNew
      ? `CONSUMABLE_${normalizeConsumableItemType(customItemName)}`
      : addStockType;

    if (isCreatingNew && !normalizeConsumableItemType(customItemName)) {
      toast.error("Please enter a valid item name");
      return;
    }

    const isChem = addStockCategory === "CONSUMABLE" && isChemicalItem(effectiveType);
    const isPaper = addStockCategory === "CONSUMABLE" && isGermEthylenePaper(effectiveType);
    const effectiveUnit = isCreatingNew
      ? customItemUnit.trim() || "units"
      : isPaper
      ? addStockUnit || "boxes"
      : addStockUnit;
    const isKgItem = addStockCategory === "CONSUMABLE" && !isChem && !isPaper && isKgConsumable(effectiveType, effectiveUnit);

    if ((stockActionMode === "ADD" || stockActionMode === "REMOVE") && (!Number.isFinite(parsedQty) || parsedQty <= 0)) {
      toast.error("Please enter a valid positive quantity");
      return;
    }

    if (stockActionMode === "DELETE" && isChem) {
      toast.error("Fixed chemicals cannot be deleted. Only stock can be updated.");
      return;
    }

    try {
      const displayName =
        addStockCategory === "CONSUMABLE"
          ? isCreatingNew
            ? customItemName.trim()
            : getConsumableLabel(effectiveType)
          : effectiveType.replace("BOX_", "");

      if (stockActionMode === "DELETE" && addStockCategory === "CONSUMABLE") {
        const itemType = effectiveType.replace("CONSUMABLE_", "");
        const res = await fetch(`/api/inventory?category=CONSUMABLE&itemType=${itemType}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Delete failed");
        toast.success(`Removed ${displayName} from inventory.`);
      } else if (stockActionMode === "RESET") {
        const res = await fetch("/api/inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "RESET_STOCK",
            boxType: effectiveType,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Reset failed");
        toast.success(`Stock for ${displayName} reset to 0.`);
      } else if (stockActionMode === "REMOVE") {
        const unitLabel = isChem || isKgItem || isPaper ? effectiveUnit : "units";
        const res = await fetch("/api/inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "REMOVE_STOCK",
            boxType: effectiveType,
            quantity: parsedQty,
            unit: isChem || isKgItem || isPaper ? effectiveUnit : undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Reduction failed");
        const detailSuffix = isPaper && (effectiveUnit === "boxes" || effectiveUnit === "box")
          ? ` (${parsedQty * SHEETS_PER_BOX} sheets)`
          : "";
        toast.success(`Deducted ${parsedQty} ${unitLabel}${detailSuffix} from ${displayName}.`);
      } else {
        // ADD_STOCK
        const unitToSend = isCreatingNew
          ? effectiveUnit
          : isChem || isKgItem || isPaper
          ? effectiveUnit
          : undefined;
        const unitLabel = unitToSend || effectiveUnit || "units";
        const res = await fetch("/api/inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "ADD_STOCK",
            boxType: effectiveType,
            quantity: parsedQty,
            unit: unitToSend,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Restock failed");
        const detailSuffix = isPaper && (effectiveUnit === "boxes" || effectiveUnit === "box")
          ? ` (${parsedQty * SHEETS_PER_BOX} sheets)`
          : "";
        toast.success(`Added ${parsedQty} ${unitLabel}${detailSuffix} to ${displayName}.`);
      }

      setShowAddStockModal(false);
      fetchInventory();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update inventory stock");
    }
  };

  const handleConfirmRestock = async () => {
    if (!verifyTarget) return;

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_RETURN",
          returnId: verifyTarget.id,
          actualReturnedBoxes: actualReturnedInput,
          actualReturnedSheets: actualReturnedSheetsInput,
        }),
      });

      if (!res.ok) throw new Error("API error");

      store.verifyInventoryReturn(verifyTarget.id, actualReturnedInput, undefined, actualReturnedSheetsInput);

      toast.success("Boxes & Consumables Verified & Restocked!", {
        description: `${actualReturnedInput} boxes credited back to ${BOX_TYPE_LABELS[verifyTarget.boxType]}. ${actualReturnedSheetsInput > 0 ? `${actualReturnedSheetsInput} sheets restocked.` : ""}`,
      });
    } catch (e) {
      console.error("Failed to sync inventory return to db", e);
      toast.error("Failed to verify return with server");
    }

    setVerifyTarget(null);
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchTarget) return;

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISPATCH_MATERIALS",
          taskId: dispatchTarget.id,
          dispatchedCounts: dispatchCounts,
          dispatchedConsumables: dispatchConsumables,
        }),
      });

      if (!res.ok) throw new Error("API error");

      store.dispatchMaterials(dispatchTarget.id, dispatchCounts, dispatchConsumables);
      toast.success("Materials Dispatched & Inventory Updated!");
      fetchInventory();
    } catch (e) {
      console.error("Failed to dispatch materials", e);
      toast.error("Failed to dispatch materials with server");
    }

    setDispatchTarget(null);
  };

  const filteredPendingRequests = pendingMaterialRequests?.filter(req => isWithinDateRange(req.createdAt)) || [];
  const filteredDispatchedLogs = dispatchedMaterialLogs?.filter(log => isWithinDateRange(log.createdAt)) || [];
  const filteredReturns = inventoryReturns?.filter(req => isWithinDateRange(req.submittedAt || (req as any).createdAt)) || [];

  const totalAvailableBoxes = useMemo(() => {
    return (brandStock || []).reduce((acc, r) => acc + (r.availableStock || 0), 0);
  }, [brandStock]);

  const totalIssuedBoxes = useMemo(() => {
    return (brandStock || []).reduce((acc, r) => acc + (r.issuedStock || 0), 0);
  }, [brandStock]);

  const activeBrandsCount = useMemo(() => {
    return (boxBrands || []).length;
  }, [boxBrands]);

  const consumableItemsCount = useMemo(() => {
    return (consumableInventoryStock || []).length;
  }, [consumableInventoryStock]);

  const pendingRequestsCount = useMemo(() => {
    return filteredPendingRequests.length;
  }, [filteredPendingRequests]);

  const pendingReturnsCount = useMemo(() => {
    return filteredReturns.filter((r) => r.status === "PENDING_VERIFICATION").length;
  }, [filteredReturns]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-heading">
                Main Inventory &amp; Material Management
              </h1>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                Inventory Admin
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Corrugated boxes, packing consumables, harvest dispatches &amp; empty box returns
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <Card className="border-slate-200 bg-white shadow-2xs rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available Boxes</span>
              <Boxes className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-heading">{totalAvailableBoxes.toLocaleString()}</div>
            <span className="text-[10px] text-slate-400 font-medium block">{totalIssuedBoxes} currently issued</span>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Brands</span>
              <Package className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-heading">{activeBrandsCount} Brands</div>
            <span className="text-[10px] text-slate-400 font-medium block">Used in harvest tasks</span>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Consumables</span>
              <Layers className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-heading">{consumableItemsCount} Types</div>
            <span className="text-[10px] text-slate-400 font-medium block">Packing &amp; chemicals</span>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Dispatches</span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className={`text-xl font-black font-heading ${pendingRequestsCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {pendingRequestsCount} Pending
            </div>
            <span className="text-[10px] text-slate-400 font-medium block">Harvest material requests</span>
          </Card>

          <Card className="border-slate-200 bg-white shadow-2xs rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Box Returns</span>
              <RotateCcw className="w-4 h-4 text-indigo-600" />
            </div>
            <div className={`text-xl font-black font-heading ${pendingReturnsCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {pendingReturnsCount} To Verify
            </div>
            <span className="text-[10px] text-slate-400 font-medium block">Leftover empty boxes</span>
          </Card>
        </div>

        {/* Clean ERP Tab Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("BOXES")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "BOXES"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Boxes &amp; Brands</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CONSUMABLES")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "CONSUMABLES"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Consumables &amp; Chemicals</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DISPATCHES")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "DISPATCHES"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Material Dispatches</span>
            {pendingRequestsCount > 0 && (
              <Badge className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0 rounded-full">
                {pendingRequestsCount}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("RETURNS")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "RETURNS"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <RotateCcw className="w-4 h-4 text-indigo-400" />
            <span>Returns &amp; Wastage</span>
            {pendingReturnsCount > 0 && (
              <Badge className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0 rounded-full">
                {pendingReturnsCount}
              </Badge>
            )}
          </button>
        </div>
        {/* TAB 1: EMPTY BOXES & BRANDS */}
        {activeTab === "BOXES" && (
          <div className="space-y-6">
            {/* BRANDWISE-START: brand-wise empty box stock (live source for harvest form) */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Empty Box Stock by Brand &amp; Size
                </h2>
                <Button
                  size="sm"
                  onClick={() => { setBrandForm({ brandName: "", boxType: "7KG", qty: 0 }); setShowBrandStockModal(true); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs h-8 px-3 gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Brand Stock
                </Button>
              </div>
              {(brandStock?.length || 0) === 0 ? (
                <Card className="border-dashed border-slate-300 bg-white rounded-2xl p-5 text-sm text-slate-500">
                  No brand-wise box stock yet. Add stock per brand + size above — the harvest form reads these live numbers.
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {brandStock.map((row) => (
                    <BrandStockCard key={row.id} row={row} onAdjust={handleBrandStockAdjust} onTopUp={() => { setBrandForm({ brandName: row.brandName, boxType: String(row.boxType).replace("BOX_", ""), qty: 0 }); setShowBrandStockModal(true); }} />
                  ))}
                </div>
              )}
            </div>

            {/* BRANDMGMT-START: box brand management (brands show in harvest form) */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Box Brands (used in harvest form)
                </h2>
                <Button
                  size="sm"
                  onClick={() => { setNewBrandName(""); setShowBrandModal(true); }}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs h-8 px-3 gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Brand
                </Button>
              </div>
              <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4">
                {(boxBrands?.length || 0) === 0 ? (
                  <p className="text-sm text-slate-500">No brands yet — add your first box brand. New brands appear in the harvest assign form immediately.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {boxBrands.map((b) => (
                      <span key={b.id} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800">
                        {b.name}
                        <button className="text-slate-400 hover:text-rose-600 font-black" title="Deactivate brand" onClick={() => handleSetBrandActive(b.id, false)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {showBrandModal && (
              <BrandNameModal value={newBrandName} onChange={setNewBrandName} onClose={() => setShowBrandModal(false)} onSave={handleCreateBrand} />
            )}
            {showBrandStockModal && (
              <BrandStockModal form={brandForm} onChange={setBrandForm} brandNames={(boxBrands || []).map((b) => b.name)} onClose={() => setShowBrandStockModal(false)} onSave={handleAddBrandStock} />
            )}

            {/* Per-size totals are derived from brand-wise rows above — no separate unbranded stock exists */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Box Totals by Size (summed across brands) &amp; Bundle Readiness
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {(["5KG", "7KG", "13KG", "13_5KG", "16KG"] as BoxType[]).map((bt) => {
                  const rows = (brandStock || []).filter((r) => String(r.boxType).replace("BOX_", "") === bt);
                  const available = rows.reduce((a, r) => a + (r.availableStock || 0), 0);
                  const issued = rows.reduce((a, r) => a + (r.issuedStock || 0), 0);
                  const topBundles = bt === "16KG" ? 0 : Math.ceil(available / 25);
                  const bottomBundles = bt === "16KG" ? 0 : Math.ceil(available / 20);
                  const completeBundles = bt === "16KG" ? Math.ceil(available / 10) : 0;
                  return (
                    <Card key={bt} className="border-slate-200 bg-white shadow-card rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900">{BOX_TYPE_LABELS[bt] || bt}</span>
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 text-[10px] font-bold">
                            {rows.length} brand{rows.length === 1 ? "" : "s"}
                          </Badge>
                        </div>
                        <div className="flex items-baseline justify-between pt-1 border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-xs text-slate-400 font-medium block">Available Stock</span>
                            <span className="text-2xl font-black text-emerald-700 font-heading">
                              {available}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-400 font-medium block">Issued</span>
                            <span className="text-sm font-bold text-amber-700">{issued}</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl text-[11px] space-y-1">
                          {bt !== "16KG" ? (
                            <>
                              <div className="flex justify-between text-slate-600">
                                <span>Top (25s):</span>
                                <strong className="text-slate-900">{topBundles} bundles</strong>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>Bottom (20s):</span>
                                <strong className="text-slate-900">{bottomBundles} bundles</strong>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between text-slate-600">
                              <span>Complete (10s):</span>
                              <strong className="text-slate-900">{completeBundles} bundles</strong>
                            </div>
                          )}
                        </div>
                        {rows.length > 0 && (
                          <div className="bg-slate-50 p-2 rounded-xl text-[11px] space-y-1">
                            {rows.map((r) => (
                              <div key={r.id} className="flex justify-between text-slate-600">
                                <span className="truncate mr-2">{r.brandName}</span>
                                <strong className="text-slate-900 flex-shrink-0">{r.availableStock}</strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONSUMABLE PACKING MATERIALS & CHEMICALS */}
        {activeTab === "CONSUMABLES" && (
          <div className="space-y-6">
            {/* Fixed Chemicals Section */}
            <div>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-teal-600" />
                  <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Fixed Chemicals (4 Fixed Items — Stock Managed in L / kg only)
                  </h2>
                </div>
                <Button
                  size="sm"
                  onClick={() => openAddConsumableStock("CONSUMABLE_C_CHEMICAL", "ADD")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs h-8 px-3 gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Chemical / Consumable Stock
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FIXED_CHEMICAL_KEYS.map((chemKey) => {
                  const meta = CHEMICAL_CONFIG[chemKey];
                  const dbItem = consumableInventoryStock?.find(
                    (c) => normalizeChemicalKey(c.itemType) === chemKey
                  );
                  const avail = dbItem?.availableStock ?? 0;
                  const issued = dbItem?.issuedStock ?? 0;
                  return (
                    <Card
                      key={chemKey}
                      className="border-slate-200 bg-white shadow-card rounded-2xl p-4 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900">{meta.label}</span>
                          <Badge
                            variant="outline"
                            className="bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-bold shrink-0"
                          >
                            Usage: {meta.standardUsageLabel}
                          </Badge>
                        </div>
                        <div className="flex items-baseline justify-between gap-2 pt-1 border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-xs text-slate-400 font-medium block">Available Stock</span>
                            <span className="text-lg font-black text-emerald-700 font-heading">
                              {formatChemicalStock(chemKey, avail)}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs text-slate-400 font-medium block">Used</span>
                            <span className="text-sm font-bold text-amber-700">
                              {formatChemicalUsageLabel(chemKey, issued)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddConsumableStock(`CONSUMABLE_${chemKey}`, "ADD")}
                          className="flex-1 text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-xs font-bold h-7.5 gap-1 rounded-lg"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddConsumableStock(`CONSUMABLE_${chemKey}`, "REMOVE")}
                          className="text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-xs font-bold h-7.5 px-2.5 rounded-lg"
                          title="Deduct / Use Stock"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddConsumableStock(`CONSUMABLE_${chemKey}`, "RESET")}
                          className="text-rose-600 border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold h-7.5 px-2 rounded-lg"
                          title="Reset stock to 0"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Packing Consumables Section */}
            <div>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Packing Consumables &amp; Materials
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openAddConsumableStock("__CREATE_NEW__", "ADD")}
                  className="text-teal-700 border-teal-200 bg-teal-50/70 hover:bg-teal-100 font-bold rounded-lg text-xs h-8 px-3 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Packing Item
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {consumableInventoryStock
                  ?.filter((item) => !isChemicalItem(item.itemType) && normalizeConsumableItemType(item.itemType) !== "CORNER_GUARDS")
                  .map((item) => {
                    const label = getConsumableLabel(item.itemType);
                    const isPaper = isGermEthylenePaper(item.itemType);
                    const paperStock = isPaper ? formatGermEthyleneStock(item.availableStock) : null;
                    const paperIssued = isPaper ? formatGermEthyleneStock(item.issuedStock) : null;

                    return (
                      <Card
                        key={item.itemType}
                        className={`border-slate-200 bg-white shadow-card rounded-2xl p-4 space-y-3 flex flex-col justify-between ${
                          isPaper ? "border-purple-200 ring-1 ring-purple-100" : ""
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900">{label}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold shrink-0 ${
                                isPaper
                                  ? "bg-purple-50 text-purple-700 border-purple-200 font-black"
                                  : "bg-slate-50 text-slate-700"
                              }`}
                            >
                              {isPaper ? "350 sheets/box" : item.unit}
                            </Badge>
                          </div>
                          <div className="flex items-baseline justify-between pt-1 border-b border-slate-100 pb-2">
                            <div>
                              <span className="text-xs text-slate-400 font-medium block">Available Stock</span>
                              {isPaper && paperStock ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-baseline gap-1.5 flex-wrap">
                                    <span className="text-2xl font-black text-emerald-700 font-heading">
                                      {paperStock.fullBoxes}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700">
                                      {paperStock.fullBoxes === 1 ? "Box" : "Boxes"}
                                      {paperStock.looseSheets > 0 ? ` + ${paperStock.looseSheets} loose` : ""}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-medium text-slate-500 block">
                                    {paperStock.totalSheets.toLocaleString()} sheets total
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-baseline gap-1">
                                  <span className="text-2xl font-black text-emerald-700 font-heading">
                                    {roundStockQty(item.availableStock)}
                                  </span>
                                  <span className="text-xs font-bold text-slate-500">{item.unit}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-slate-400 font-medium block">Issued</span>
                              {isPaper && paperIssued ? (
                                <div>
                                  <span className="text-sm font-bold text-amber-700">
                                    {paperIssued.fullBoxes} bxs {paperIssued.looseSheets > 0 ? `+${paperIssued.looseSheets} sh` : ""}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    ({paperIssued.totalSheets} sheets)
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-baseline gap-1 justify-end">
                                  <span className="text-sm font-bold text-amber-700">{roundStockQty(item.issuedStock)}</span>
                                  <span className="text-[11px] text-slate-400">{item.unit}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAddConsumableStock(`CONSUMABLE_${item.itemType}`, "ADD")}
                            className="flex-1 text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-xs font-bold h-7.5 gap-1 rounded-lg"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAddConsumableStock(`CONSUMABLE_${item.itemType}`, "REMOVE")}
                            className="text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-xs font-bold h-7.5 px-2.5 rounded-lg"
                            title="Deduct / Use Stock"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAddConsumableStock(`CONSUMABLE_${item.itemType}`, "DELETE")}
                            className="text-rose-600 border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold h-7.5 px-2 rounded-lg"
                            title="Delete Item completely"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                {(!consumableInventoryStock ||
                  consumableInventoryStock.filter((item) => !isChemicalItem(item.itemType)).length === 0) && (
                  <div className="text-sm text-slate-500 italic p-4">No packing consumable stock added yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MATERIAL DISPATCH REQUESTS */}
        {activeTab === "DISPATCHES" && (
          <div className="space-y-6">
            {/* Date Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Date Range Filter</h4>
                <p className="text-xs text-slate-500">Filter pending material requests and confirmed dispatch history.</p>
              </div>
              <DateRangePicker
                startDate={filterDateFrom}
                endDate={filterDateTo}
                onChange={({ startDate: s, endDate: e }) => {
                  setFilterDateFrom(s);
                  setFilterDateTo(e);
                }}
              />
            </div>

            {/* Pending Material Dispatch Requests Table */}
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <Package className="w-4.5 h-4.5 text-orange-600" />
                  Pending Material Dispatch Requests (Harvest)
                </CardTitle>
                <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs font-bold px-2.5 py-0.5">
                  {filteredPendingRequests.length} Pending Dispatch
                </Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase pl-6 py-3">Farmer &amp; Supervisor</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Team &amp; Truck</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Materials Requested</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase pr-6 text-right py-3">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPendingRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-500 text-sm italic">
                          No pending material requests.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPendingRequests.map((req: any) => (
                        <TableRow key={req.id} className="border-b border-slate-100">
                          <TableCell className="pl-6 py-4">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{req.farmerName || req.farmer?.name}</p>
                              <p className="text-xs text-slate-500">Sup: {req.supervisorName || req.supervisor?.name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <p className="text-sm text-slate-800 font-medium">{req.labourTeam || 'N/A'}</p>
                            {req.vehicleSupplierId && <p className="text-xs text-slate-500 truncate max-w-[150px]">Truck: Allocated</p>}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-1">
                              {req.requiredBoxCounts && Object.entries(req.requiredBoxCounts).map(([bType, count]: any) => {
                                if (!count) return null;
                                return (
                                  <Badge key={bType} variant="outline" className="w-fit bg-slate-50 text-slate-800 text-[10px] font-bold">
                                    {BOX_TYPE_LABELS[bType as BoxType]}: {count}
                                  </Badge>
                                );
                              })}
                              {(req.germEthylenePaperSheets > 0 || req.hasEthylenePaper) && (
                                <Badge variant="outline" className="w-fit bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                                  Germ. Paper / Ethylene: {req.germEthylenePaperSheets || 350} sheets
                                </Badge>
                              )}
                              {req.bagsKg7 > 0 && (
                                <Badge variant="outline" className="w-fit bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
                                  7KG Bags: {roundStockQty(req.bagsKg7)} kg
                                </Badge>
                              )}
                              {req.bagsKg13 > 0 && (
                                <Badge variant="outline" className="w-fit bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
                                  13KG Bags: {roundStockQty(req.bagsKg13)} kg
                                </Badge>
                              )}
                              {!req.bagsKg7 && !req.bagsKg13 && req.bagsKg > 0 && (
                                <Badge variant="outline" className="w-fit bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
                                  Bags: {roundStockQty(req.bagsKg)} kg
                                </Badge>
                              )}
                              {req.favilocPackets > 0 && (
                                <Badge variant="outline" className="w-fit bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold">
                                  Faviloc: {req.favilocPackets} pkts
                                </Badge>
                              )}
                              {req.rubberPackets > 0 && (
                                <Badge variant="outline" className="w-fit bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold">
                                  Rubber: {req.rubberPackets} pkt
                                </Badge>
                              )}
                              {req.foamUnit > 0 && (
                                <Badge variant="outline" className="w-fit bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                                  Foam: {req.foamUnit} unit
                                </Badge>
                              )}
                              {normalizeExtraConsumables(req.extraConsumables).map((extra) => (
                                <Badge
                                  key={extra.itemType}
                                  variant="outline"
                                  className="w-fit bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-bold"
                                >
                                  {extra.label}: {extra.quantity} {extra.unit}
                                </Badge>
                              ))}
                              {renderChemicalUsageBadges(req, "w-fit bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-bold")}
                            </div>
                          </TableCell>
                          <TableCell className="pr-6 text-right py-4">
                            <Button
                              size="sm"
                              onClick={() => {
                                setDispatchTarget(req);
                                setDispatchCounts(req.requiredBoxCounts || {});
                                const prefill: Record<string, number> = {
                                  GERM_ETHYLENE_PAPER: Number(req.germEthylenePaperSheets) || 350,
                                  BAGS_7KG: roundStockQty(Number(req.bagsKg7) || 0),
                                  BAGS_13KG: roundStockQty(Number(req.bagsKg13) || 0),
                                  FOAM_PADS: Number(req.foamUnit) || 0,
                                  FAVILOC: Number(req.favilocPackets) || 0,
                                  RUBBER: Number(req.rubberPackets) || 0,
                                };
                                for (const extra of customInventoryItems) {
                                  prefill[normalizeConsumableItemType(extra.itemType)] = 0;
                                }
                                for (const extra of normalizeExtraConsumables(req.extraConsumables)) {
                                  prefill[extra.itemType] = extra.quantity;
                                }
                                if (req.hasChemicalTreatment !== false && Array.isArray(req.chemicals)) {
                                  for (const rawChem of req.chemicals) {
                                    const cleanKey = normalizeChemicalKey(rawChem);
                                    if (!cleanKey) continue;
                                    const rawVal =
                                      req.chemicalQuantities?.[cleanKey] ||
                                      req.chemicalQuantities?.[rawChem] ||
                                      CHEMICAL_CONFIG[cleanKey].standardUsageLabel;
                                    prefill[cleanKey] = parseChemicalUsageToBase(cleanKey, rawVal);
                                  }
                                }
                                setDispatchConsumables(prefill);
                              }}
                              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-xs"
                            >
                              <Package className="w-3.5 h-3.5" /> Dispatch Materials
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Confirmed Material Dispatch Log Table */}
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  Approved &amp; Confirmed Material Dispatch Log (Issued History)
                </CardTitle>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold px-2.5 py-0.5">
                  {filteredDispatchedLogs.length} Dispatched Logs
                </Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase pl-6 py-3">Farmer &amp; Supervisor</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Team &amp; Destination</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Dispatched Materials &amp; Quantities</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase pr-6 text-right py-3">Dispatch Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDispatchedLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-500 text-sm italic">
                          No dispatched material logs recorded for this filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDispatchedLogs.map((log: any) => (
                        <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="pl-6 py-4">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{log.farmerName || log.farmer?.name}</p>
                              <p className="text-xs text-slate-500">Sup: {log.supervisorName || log.supervisor?.name || 'Assigned'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <p className="text-sm text-slate-800 font-medium">{log.labourTeam || 'Harvest Team'}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[180px]">{log.destinationColdStorage || 'Cold Storage Transit'}</p>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {log.requiredBoxCounts && Object.entries(log.requiredBoxCounts).map(([bType, count]: any) => {
                                if (!count) return null;
                                return (
                                  <Badge key={bType} variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                                    {BOX_TYPE_LABELS[bType as BoxType] || bType}: {count} Box
                                  </Badge>
                                );
                              })}
                              {(log.germEthylenePaperSheets > 0 || (log.hasEthylenePaper && log.ethylenePacksCount > 0)) && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                                  Germ. Paper / Ethylene: {log.germEthylenePaperSheets || 350} sheets
                                </Badge>
                              )}
                              {log.bagsKg7 > 0 && (
                                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
                                  7KG Bags: {roundStockQty(log.bagsKg7)} kg
                                </Badge>
                              )}
                              {log.bagsKg13 > 0 && (
                                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
                                  13KG Bags: {roundStockQty(log.bagsKg13)} kg
                                </Badge>
                              )}
                              {!log.bagsKg7 && !log.bagsKg13 && log.bagsKg > 0 && (
                                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-bold">
                                  Bags: {roundStockQty(log.bagsKg)} kg
                                </Badge>
                              )}
                              {log.favilocPackets > 0 && (
                                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold">
                                  Faviloc: {log.favilocPackets} pkts
                                </Badge>
                              )}
                              {log.rubberPackets > 0 && (
                                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold">
                                  Rubber: {log.rubberPackets} pkt
                                </Badge>
                              )}
                              {log.foamUnit > 0 && (
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                                  Foam: {log.foamUnit} unit
                                </Badge>
                              )}
                              {normalizeExtraConsumables(log.extraConsumables).map((extra) => (
                                <Badge
                                  key={extra.itemType}
                                  variant="outline"
                                  className="bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-bold"
                                >
                                  {extra.label}: {extra.quantity} {extra.unit}
                                </Badge>
                              ))}
                              {renderChemicalUsageBadges(log)}
                            </div>
                          </TableCell>
                          <TableCell className="pr-6 text-right py-4">
                            <Badge className="bg-emerald-600 text-white font-bold text-[11px] px-2.5 py-0.5 gap-1">
                              <CheckCircle2 className="w-3 h-3" /> DISPATCHED
                            </Badge>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                              {new Date(log.updatedAt || log.createdAt).toLocaleDateString()} {new Date(log.updatedAt || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 4: EMPTY BOX RETURNS & WASTAGE RECONCILIATION */}
        {activeTab === "RETURNS" && (
          <div className="space-y-6">
            {/* Date Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Date Range Filter</h4>
                <p className="text-xs text-slate-500">Filter supervisor return verification queue and reconciliation history.</p>
              </div>
              <DateRangePicker
                startDate={filterDateFrom}
                endDate={filterDateTo}
                onChange={({ startDate: s, endDate: e }) => {
                  setFilterDateFrom(s);
                  setFilterDateTo(e);
                }}
              />
            </div>

            {/* Pending Supervisor Return Requests Table */}
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <RotateCcw className="w-4.5 h-4.5 text-indigo-600" />
                  Supervisor Empty Box Return Queue (Pending Reconciliation)
                </CardTitle>
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold px-2.5 py-0.5">
                  {filteredReturns.filter((r) => r.status === "PENDING_VERIFICATION").length} Pending Verification
                </Badge>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase pl-6 py-3">Farmer &amp; Supervisor</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Box Type</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Picked Up</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Loaded / Used</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Expected Return</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase pr-6 text-right py-3">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-slate-500 text-sm italic">
                          No return requests available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReturns.map((req) => (
                        <TableRow key={req.id} className="border-b border-slate-100">
                          <TableCell className="pl-6 py-4">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{req.farmerName}</p>
                              <p className="text-xs text-slate-500">Sup: {req.supervisorName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-white border-slate-200 text-slate-800 text-xs font-bold">
                              {BOX_TYPE_LABELS[req.boxType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 font-bold text-slate-900">{req.pickedUpBoxes}</TableCell>
                          <TableCell className="py-4 font-bold text-emerald-700">{req.loadedBoxes}</TableCell>
                          <TableCell className="py-4 font-bold text-amber-700">
                            <div>{req.expectedReturnBoxes} Boxes</div>
                            {(req.expectedReturnSheets || 0) > 0 && (
                              <div className="text-[11px] font-semibold text-purple-700">+{req.expectedReturnSheets} Sheets</div>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge
                              variant="outline"
                              className={`text-xs font-bold px-2.5 py-0.5 border ${
                                req.status === "PENDING_VERIFICATION"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {req.status === "PENDING_VERIFICATION" ? "PENDING VERIFICATION" : "RESTOCKED"}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-6 text-right py-4">
                            {req.status === "PENDING_VERIFICATION" ? (
                              <Button
                                size="sm"
                                onClick={() => handleOpenVerify(req)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-xs"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> Verify &amp; Restock
                              </Button>
                            ) : (
                              <span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Restocked
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dispatch Modal */}
        {dispatchTarget && (
          <Dialog open onOpenChange={() => setDispatchTarget(null)}>
            <DialogContent className="w-[96vw] max-w-xl sm:max-w-xl md:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-7">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-orange-700 text-lg font-bold">
                  <Package className="w-5 h-5" />
                  Issue & Dispatch Materials
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2 text-sm">
                <p className="text-slate-600">Please confirm the dispatch of the following materials for <strong>{dispatchTarget.farmerName || dispatchTarget.farmer?.name}</strong> (Supervisor: {dispatchTarget.supervisorName || dispatchTarget.supervisor?.name}).</p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-sm">
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Adjust Dispatch Quantities</h4>
                  <p className="text-xs text-slate-500 mb-2">Adjust quantities to account for overhead/damage.</p>
                  {dispatchTarget.requiredBoxCounts && Object.entries(dispatchTarget.requiredBoxCounts).map(([bType, count]: any) => {
                    if (!count) return null;
                    return (
                      <div key={bType} className="flex justify-between items-center text-slate-700">
                        <Label className="text-sm font-bold text-slate-700">{BOX_TYPE_LABELS[bType as BoxType]}</Label>
                        <Input
                          type="number"
                          value={dispatchCounts[bType] || 0}
                          onChange={(e) => setDispatchCounts({ ...dispatchCounts, [bType]: parseInt(e.target.value) || 0 })}
                          className="w-24 bg-white border-slate-300 text-slate-900 font-bold h-10 rounded-lg text-sm text-right"
                        />
                      </div>
                    );
                  })}
                  {(!dispatchTarget.requiredBoxCounts || Object.keys(dispatchTarget.requiredBoxCounts).length === 0) && (
                    <span className="text-slate-400 italic">No boxes requested.</span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-sm">
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Consumables &amp; Materials</h4>
                  {Array.from(
                    new Set([
                      "GERM_ETHYLENE_PAPER",
                      "BAGS_7KG",
                      "BAGS_13KG",
                      "FOAM_PADS",
                      "FAVILOC",
                      "RUBBER",
                      ...customInventoryItems.map((i) => normalizeConsumableItemType(i.itemType)),
                      ...normalizeExtraConsumables(dispatchTarget.extraConsumables).map((i) => i.itemType),
                    ])
                  ).map((cType) => (
                    <div key={cType} className="flex justify-between items-center text-slate-700">
                      <Label className="text-sm font-bold text-slate-700">{getConsumableLabel(cType)}</Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={dispatchConsumables[cType] ?? 0}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setDispatchConsumables({
                            ...dispatchConsumables,
                            [cType]: Number.isFinite(v) && v >= 0 ? v : 0,
                          });
                        }}
                        className="w-24 bg-white border-slate-300 text-slate-900 font-bold h-10 rounded-lg text-sm text-right"
                      />
                    </div>
                  ))}
                </div>

                {dispatchTarget.hasChemicalTreatment !== false && Array.isArray(dispatchTarget.chemicals) && dispatchTarget.chemicals.length > 0 && (
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2 text-sm">
                    <h4 className="font-bold text-teal-900 flex items-center gap-1.5">
                      <FlaskConical className="w-4 h-4 text-teal-700" />
                      Chemical Usage (Fixed Dispatch Deduction)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {renderChemicalUsageBadges(
                        dispatchTarget,
                        "bg-white text-teal-800 border-teal-200 text-xs font-bold px-2.5 py-1"
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setDispatchTarget(null)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button onClick={handleConfirmDispatch} className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Confirm Dispatch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Verification Modal */}
        {verifyTarget && (
          <Dialog open onOpenChange={() => setVerifyTarget(null)}>
            <DialogContent className="w-[96vw] max-w-xl sm:max-w-xl md:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-7">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-indigo-700 text-lg font-bold">
                  <ShieldCheck className="w-5 h-5" />
                  Verify Returned Empty Boxes & Reconcile
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <p><strong>Farmer:</strong> {verifyTarget.farmerName}</p>
                  <p><strong>Supervisor:</strong> {verifyTarget.supervisorName}</p>
                  <p><strong>Box Type:</strong> {BOX_TYPE_LABELS[verifyTarget.boxType]}</p>
                  <p><strong>Picked Up:</strong> {verifyTarget.pickedUpBoxes} | <strong>Loaded:</strong> {verifyTarget.loadedBoxes}</p>
                  <p className="text-amber-800 font-bold pt-1">Expected Return Boxes: {verifyTarget.expectedReturnBoxes} Boxes</p>
                  {(verifyTarget.expectedReturnSheets || 0) > 0 && (
                    <p className="text-purple-800 font-bold">
                      Expected Return Sheets: {verifyTarget.expectedReturnSheets} Sheets (Germination Paper / Ethylene Pouch)
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Actual Physically Returned Good Boxes</Label>
                  <Input
                    type="number"
                    value={actualReturnedInput}
                    onChange={(e) => setActualReturnedInput(parseInt(e.target.value) || 0)}
                    className="bg-white border-slate-300 text-slate-900 font-black h-12 rounded-xl text-base"
                  />
                </div>

                {((verifyTarget.expectedReturnSheets || 0) > 0 || actualReturnedSheetsInput > 0) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-purple-900">
                      Actual Physically Returned Sheets (Germination Paper / Ethylene Pouch)
                    </Label>
                    <Input
                      type="number"
                      value={actualReturnedSheetsInput}
                      onChange={(e) => setActualReturnedSheetsInput(parseInt(e.target.value) || 0)}
                      className="bg-white border-purple-300 text-purple-900 font-black h-12 rounded-xl text-base"
                    />
                  </div>
                )}

                {(wastageCalculated > 0 || wastageSheetsCalculated > 0) && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-rose-900 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-rose-600" /> Discrepancy Mismatch Detected
                    </p>
                    {wastageCalculated > 0 && (
                      <p className="text-rose-800">
                        <strong>{wastageCalculated} missing/damaged boxes</strong> will be recorded as <strong>Wastage Stock</strong>.
                      </p>
                    )}
                    {wastageSheetsCalculated > 0 && (
                      <p className="text-rose-800">
                        <strong>{wastageSheetsCalculated} missing sheets</strong> will be recorded as used/scrap.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setVerifyTarget(null)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button onClick={handleConfirmRestock} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Confirm Verification & Restock
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Inventory Stock & Item Manager Modal */}
        {showAddStockModal && (
          <Dialog open onOpenChange={() => setShowAddStockModal(false)}>
            <DialogContent className="w-[96vw] max-w-xl sm:max-w-xl md:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className={`flex items-center gap-2 text-lg font-bold ${
                  stockActionMode === "DELETE" || stockActionMode === "RESET"
                    ? "text-rose-700"
                    : stockActionMode === "REMOVE"
                    ? "text-amber-700"
                    : addStockCategory === "BOX"
                    ? "text-indigo-700"
                    : "text-emerald-700"
                }`}>
                  {stockActionMode === "DELETE" ? (
                    <Trash2 className="w-5 h-5" />
                  ) : stockActionMode === "RESET" ? (
                    <RotateCcw className="w-5 h-5" />
                  ) : stockActionMode === "REMOVE" ? (
                    <Minus className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  {stockActionMode === "DELETE"
                    ? "Delete Consumable Item"
                    : stockActionMode === "RESET"
                    ? "Reset Available Stock to Zero"
                    : stockActionMode === "REMOVE"
                    ? "Deduct / Write-off Stock"
                    : addStockCategory === "BOX"
                    ? "Add Corrugated Box Stock"
                    : "Add Consumable & Chemical Stock"}
                </DialogTitle>
              </DialogHeader>

              {/* Action Mode Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStockActionMode("ADD")}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    stockActionMode === "ADD"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  + Restock
                </button>
                <button
                  type="button"
                  onClick={() => setStockActionMode("REMOVE")}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    stockActionMode === "REMOVE"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  - Deduct
                </button>
                <button
                  type="button"
                  onClick={() => setStockActionMode("RESET")}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    stockActionMode === "RESET"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Zero (0)
                </button>
                {addStockCategory === "CONSUMABLE" && !isChemicalItem(addStockType) && (
                  <button
                    type="button"
                    onClick={() => setStockActionMode("DELETE")}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      stockActionMode === "DELETE"
                        ? "bg-rose-700 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Delete
                  </button>
                )}
              </div>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    {addStockCategory === "BOX" ? "Corrugated Box Type" : "Consumable / Chemical Item"}
                  </Label>
                  <select
                    value={addStockType}
                    onChange={(e) => {
                      const next = e.target.value;
                      setAddStockType(next);
                      if (next === "__CREATE_NEW__") {
                        setStockActionMode("ADD");
                        setAddStockUnit(customItemUnit || "kg");
                      } else if (isChemicalItem(next)) {
                        setAddStockUnit(getDefaultInputUnit(next));
                        if (stockActionMode === "DELETE") setStockActionMode("ADD");
                      } else {
                        setAddStockUnit(resolveConsumableDefaultUnit(next));
                      }
                    }}
                    className="w-full bg-white border border-slate-300 text-slate-900 font-bold h-12 rounded-xl text-base px-3"
                  >
                    {addStockCategory === "BOX" ? (
                      Object.entries(BOX_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))
                    ) : (
                      <>
                        {consumableDropdownOptions.map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                        {stockActionMode === "ADD" && (
                          <option value="__CREATE_NEW__">+ Create New Custom Consumable Item...</option>
                        )}
                      </>
                    )}
                  </select>
                </div>

                {addStockCategory === "CONSUMABLE" && addStockType === "__CREATE_NEW__" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-bold text-teal-950">New Consumable Item Name</Label>
                      <Input
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        placeholder="e.g. Packing Tape, Crate Liner"
                        className="bg-white border-teal-200 text-slate-900 font-bold h-11 rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-teal-950">Unit</Label>
                      <select
                        value={customItemUnit}
                        onChange={(e) => setCustomItemUnit(e.target.value)}
                        className="w-full bg-white border border-teal-200 text-slate-900 font-bold h-11 rounded-xl text-sm px-2.5"
                      >
                        <option value="kg">kg</option>
                        <option value="units">units</option>
                        <option value="rolls">rolls</option>
                        <option value="pkts">pkts</option>
                        <option value="sheets">sheets</option>
                        <option value="L">L</option>
                        <option value="gm">gm</option>
                        <option value="ml">ml</option>
                      </select>
                    </div>
                    <p className="sm:col-span-3 text-[11px] text-teal-800 font-medium">
                      Synced automatically to Schedule Harvest forms, Supervisor pickup views &amp; Inventory material dispatches.
                    </p>
                  </div>
                )}

                {stockActionMode !== "RESET" && stockActionMode !== "DELETE" ? (
                  (() => {
                    const effectiveType =
                      addStockType === "__CREATE_NEW__"
                        ? `CONSUMABLE_${normalizeConsumableItemType(customItemName)}`
                        : addStockType;
                    const chemKey = addStockCategory === "CONSUMABLE" ? normalizeChemicalKey(effectiveType) : null;
                    const chemMeta = chemKey ? CHEMICAL_CONFIG[chemKey] : null;
                    const isPaper = addStockCategory === "CONSUMABLE" && !chemMeta && isGermEthylenePaper(effectiveType);
                    const isKgItem =
                      addStockCategory === "CONSUMABLE" &&
                      !chemMeta &&
                      !isPaper &&
                      addStockType !== "__CREATE_NEW__" &&
                      isKgConsumable(effectiveType, addStockUnit);
                    const numericQty = parseFloat(addStockQtyStr);
                    const previewBase =
                      chemMeta && Number.isFinite(numericQty) && numericQty > 0
                        ? convertChemicalToBase(chemMeta.key, numericQty, addStockUnit)
                        : 0;
                    return (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-800">
                          {stockActionMode === "REMOVE" ? "Quantity to Deduct / Scrap" : "Quantity to Add"}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step={addStockCategory === "CONSUMABLE" ? "any" : "1"}
                            min="0"
                            value={addStockQtyStr}
                            onChange={(e) => setAddStockQtyStr(e.target.value)}
                            className="flex-1 bg-white border-slate-300 text-slate-900 font-black h-12 rounded-xl text-base"
                            placeholder={
                              chemMeta
                                ? "Enter quantity"
                                : isPaper
                                ? "e.g. 5 (boxes) or 350 (sheets)"
                                : isKgItem
                                ? "e.g. 2.2 or 5"
                                : "Enter quantity"
                            }
                          />
                          {(chemMeta || isKgItem || isPaper) && (
                            <select
                              value={addStockUnit}
                              onChange={(e) => setAddStockUnit(e.target.value)}
                              className="w-32 bg-slate-50 border border-slate-300 text-slate-900 font-bold h-12 rounded-xl text-xs px-2.5"
                            >
                              {chemMeta ? (
                                chemMeta.allowedInputUnits.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))
                              ) : isPaper ? (
                                <>
                                  <option value="boxes">boxes (350 sh)</option>
                                  <option value="sheets">loose sheets</option>
                                </>
                              ) : (
                                ["kg"].map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))
                              )}
                            </select>
                          )}
                        </div>
                        {chemMeta && (
                          <div className="p-2.5 bg-teal-50/80 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center justify-between gap-2">
                            <span>
                              {previewBase > 0
                                ? `${stockActionMode === "REMOVE" ? "Deducts" : "Adds"} ${formatChemicalStock(chemMeta.key, previewBase)}`
                                : `Enter stock in ${chemMeta.allowedInputUnits.join(" or ")}`}
                            </span>
                            <span className="font-bold text-teal-800 shrink-0">
                              Usage: {chemMeta.standardUsageLabel}
                            </span>
                          </div>
                        )}
                        {isPaper && (
                          <div className="p-2.5 bg-purple-50/80 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between gap-2">
                            <span>
                              {Number.isFinite(numericQty) && numericQty > 0
                                ? addStockUnit === "sheets"
                                  ? `${stockActionMode === "REMOVE" ? "Deducts" : "Adds"} ${Math.round(numericQty)} loose sheets`
                                  : `${stockActionMode === "REMOVE" ? "Deducts" : "Adds"} ${numericQty} box${
                                      numericQty === 1 ? "" : "es"
                                    } = ${(numericQty * SHEETS_PER_BOX).toLocaleString()} sheets (at 350 sheets/box)`
                                : "Factory stock arrives in boxes (350 sheets/box). Loose sheets from harvest returns merge automatically."}
                            </span>
                            <span className="font-bold text-purple-800 shrink-0">1 Box = 350 Sheets</span>
                          </div>
                        )}
                        {isKgItem && (
                          <div className="p-2.5 bg-sky-50/80 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-center justify-between gap-2">
                            <span>
                              {Number.isFinite(numericQty) && numericQty > 0
                                ? `${stockActionMode === "REMOVE" ? "Deducts" : "Adds"} ${
                                    addStockUnit === "gm" ? roundStockQty(numericQty / 1000) : roundStockQty(numericQty)
                                  } kg in Inventory`
                                : "Tracked & deducted from Inventory directly in kg"}
                            </span>
                            <span className="font-bold text-sky-800 shrink-0">Unit: kg</span>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 text-rose-800">
                    <p className="font-bold flex items-center gap-1.5 text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      {stockActionMode === "DELETE" ? "Permanent Deletion Warning" : "Stock Reset Confirmation"}
                    </p>
                    <p>
                      {stockActionMode === "DELETE"
                        ? "This will remove this item from the consumable inventory records completely."
                        : "This will set available physical stock for this item to 0."}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAddStockModal(false)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmStockAction} 
                  className={`text-white font-bold rounded-xl gap-1.5 ${
                    stockActionMode === "DELETE" || stockActionMode === "RESET"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : stockActionMode === "REMOVE"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : addStockCategory === "BOX"
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {stockActionMode === "DELETE" ? (
                    <>
                      <Trash2 className="w-4 h-4" /> Delete Item
                    </>
                  ) : stockActionMode === "RESET" ? (
                    <>
                      <RotateCcw className="w-4 h-4" /> Reset Stock to 0
                    </>
                  ) : stockActionMode === "REMOVE" ? (
                    <>
                      <Minus className="w-4 h-4" /> Deduct Stock
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Add Stock
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
