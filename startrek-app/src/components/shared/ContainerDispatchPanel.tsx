"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { store, useStartrekStore } from "@/lib/store";
import { BOX_TYPE_LABELS, BoxType, ColdStorageReceipt, ContainerDispatch, UserRole, ExportOrder } from "@/types";
import { shareReportMessage } from "@/lib/share";
import { cleanBrandName } from "@/lib/brand";
import { toast } from "sonner";
import {
  Ship,
  Plus,
  Trash2,
  PackageCheck,
  PlugZap,
  Send,
  Lock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Hash,
  Boxes,
  Clock,
  MessageSquare,
  Sparkles,
  Calendar as CalendarIcon,
  Play,
  AlertTriangle,
  Check,
  Search,
  Eye,
  X,
  Layers,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────
 * Container Dispatch (Out-flow)
 *
 * Streamlined ERP lifecycle:
 * - Admin raises load request (supports 'Same as Previous' quick fill).
 * - Cold storage clicks 'Start Filling' (notifies admins) → 'Work Done' (notifies admins).
 * - Plug-in cooling runs timer until scheduled departure date & time.
 * - Emergency Force Dispatch allows instant exit with admin alert.
 * - Direct Dispatch provides fast clearance once filling is done.
 * ──────────────────────────────────────────────────────────────── */

function formatDateTime(d?: string | Date | null): string {
  if (!d) return "—";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "—";
  return dateObj.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getHandsBreakdownForContainer(container: ContainerDispatch, receipts: ColdStorageReceipt[]) {
  const brandNames = new Set(container.items.map((i) => i.brandName.toLowerCase()));
  let h4 = 0;
  let h5 = 0;
  let h6 = 0;
  let h7 = 0;
  let h8 = 0;

  receipts.forEach((r) => {
    const rawBrand =
      r.qualityReport?.boxBrand ||
      r.billData?.orchardParticulars ||
      r.brandName ||
      "";
    const brand = cleanBrandName(rawBrand).toLowerCase();
    if (brandNames.has(brand) || brandNames.size === 0) {
      h4 += r.qualityReport?.box4H ?? r.billData?.box4H ?? 0;
      h5 += r.qualityReport?.box5H ?? r.billData?.box5H ?? 0;
      h6 += r.qualityReport?.box6H ?? r.billData?.box6H ?? 0;
      h7 += r.qualityReport?.box7H ?? r.billData?.box7H ?? 0;
      h8 += r.qualityReport?.box8H ?? r.billData?.box8H ?? 0;
    }
  });

  return { h4, h5, h6, h7, h8 };
}

const normalizeBoxType = (val?: string | null): BoxType | null => {
  if (!val) return null;
  const clean = val.replace(/^BOX_/, "").trim();
  if (clean in BOX_TYPE_LABELS) return clean as BoxType;
  return null;
};

const formatBoxType = (val?: string | null): string => {
  if (!val) return "13 kg";
  const clean = val.replace(/^BOX_/, "").trim();
  if (clean in BOX_TYPE_LABELS) return BOX_TYPE_LABELS[clean as BoxType];
  return `${clean.replace(/KG$/i, " kg")}`;
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const STATUS_META: Record<
  ContainerDispatch["status"],
  { label: string; className: string }
> = {
  PENDING_LOADING: {
    label: "Pending Loading",
    className: "bg-amber-50 text-amber-800 border-amber-300",
  },
  LOADING_IN_PROGRESS: {
    label: "Loading in Progress",
    className: "bg-blue-50 text-blue-800 border-blue-300 animate-pulse font-bold",
  },
  LOADED: {
    label: "Work Done",
    className: "bg-sky-50 text-sky-800 border-sky-300",
  },
  PLUGIN_COOLING: {
    label: "Plug-In Cooling",
    className: "bg-indigo-50 text-indigo-800 border-indigo-300",
  },
  READY_TO_DISPATCH: {
    label: "Ready to Dispatch",
    className: "bg-emerald-50 text-emerald-800 border-emerald-300",
  },
  DISPATCHED: {
    label: "Dispatched",
    className: "bg-slate-100 text-slate-700 border-slate-300",
  },
};

type DraftItem = { boxType: BoxType | ""; brandName: string; quantity: string };

export type ContainerEntry = {
  id: string;
  containerNo: string;
  sealNumber: string;
  vehicleNo: string;
  mobMobile: string;
};

function isPluginLocked(c: ContainerDispatch): boolean {
  if (c.status !== "PLUGIN_COOLING") return false;
  if (!c.pluginReadyAt) return true;
  return new Date(c.pluginReadyAt).getTime() > Date.now();
}

function formatCountdown(readyAt?: string | null): string {
  if (!readyAt) return "—";
  const diff = new Date(readyAt).getTime() - Date.now();
  if (diff <= 0) return "Cooling complete";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}m remaining`;
}

function ContainerProgressTracker({
  status,
  dispatchMode,
  pluginReadyAt,
}: {
  status: ContainerDispatch["status"];
  dispatchMode?: "PLUGIN" | "DIRECT" | null;
  targetDispatchTime?: string | null;
  pluginReadyAt?: string | null;
}) {
  const isStep2Active = status === "LOADING_IN_PROGRESS";
  const isStep2Done = ["LOADED", "PLUGIN_COOLING", "READY_TO_DISPATCH", "DISPATCHED"].includes(status);

  const isStep3Active = ["LOADED", "PLUGIN_COOLING", "READY_TO_DISPATCH"].includes(status);
  const isStep3Done = status === "DISPATCHED";

  const isStep4Done = status === "DISPATCHED";

  let progressPercent = 15;
  if (status === "LOADING_IN_PROGRESS") progressPercent = 45;
  else if (["LOADED", "PLUGIN_COOLING", "READY_TO_DISPATCH"].includes(status)) progressPercent = 78;
  else if (status === "DISPATCHED") progressPercent = 100;

  return (
    <div className="py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        <span>Delivery &amp; Loading Progress</span>
        <span className="font-mono text-emerald-700 font-extrabold">{progressPercent}%</span>
      </div>

      <div className="relative pt-2 pb-1">
        <div className="absolute top-5 left-4 right-4 h-1 bg-slate-200 -translate-y-1/2 z-0" />
        <div
          className="absolute top-5 left-4 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `calc(${progressPercent}% - 8px)` }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs ring-4 ring-emerald-50">
              ✓
            </div>
            <span className="text-[10px] font-bold text-slate-800 mt-1.5 text-center">Request Raised</span>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                isStep2Done
                  ? "bg-emerald-600 text-white ring-4 ring-emerald-50"
                  : isStep2Active
                  ? "bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse"
                  : "bg-slate-200 text-slate-500 border border-slate-300"
              }`}
            >
              {isStep2Done ? "✓" : isStep2Active ? "••" : "2"}
            </div>
            <span
              className={`text-[10px] font-bold mt-1.5 text-center ${
                isStep2Active ? "text-blue-700 font-black" : isStep2Done ? "text-slate-800" : "text-slate-400"
              }`}
            >
              Loading
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                isStep3Done
                  ? "bg-emerald-600 text-white ring-4 ring-emerald-50"
                  : isStep3Active
                  ? "bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse"
                  : "bg-slate-200 text-slate-500 border border-slate-300"
              }`}
            >
              {isStep3Done ? "✓" : isStep3Active ? "❄" : "3"}
            </div>
            <span
              className={`text-[10px] font-bold mt-1.5 text-center ${
                isStep3Active ? "text-indigo-700 font-black" : isStep3Done ? "text-slate-800" : "text-slate-400"
              }`}
            >
              Work Done / Plugged
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                isStep4Done
                  ? "bg-emerald-600 text-white ring-4 ring-emerald-50"
                  : "bg-slate-200 text-slate-500 border border-slate-300"
              }`}
            >
              {isStep4Done ? "✓" : "4"}
            </div>
            <span
              className={`text-[10px] font-bold mt-1.5 text-center ${
                isStep4Done ? "text-emerald-700 font-black" : "text-slate-400"
              }`}
            >
              Dispatched
            </span>
          </div>
        </div>
      </div>

      <div className="text-[11px] font-medium pt-1 text-slate-600 border-t border-slate-200/70 flex items-center justify-between">
        <span className="text-slate-500">Status:</span>
        <span className="font-bold text-slate-900">
          {status === "PENDING_LOADING" && "Awaiting Cold Storage team to start loading."}
          {status === "LOADING_IN_PROGRESS" && "Loading in progress at Cold Storage."}
          {status === "LOADED" && "Work done. Awaiting dispatch clearance."}
          {status === "PLUGIN_COOLING" && `Plugged in for cooling (${formatCountdown(pluginReadyAt)}).`}
          {status === "READY_TO_DISPATCH" && "Ready for departure."}
          {status === "DISPATCHED" && "Dispatched sealed with papers."}
        </span>
      </div>
    </div>
  );
}

interface Props {
  canCreate: boolean;
  canLoad: boolean;
  canDecide: boolean;
  receipts?: ColdStorageReceipt[];
  title?: string;
  description?: string;
  initialOrderId?: string | null;
}

export function ContainerDispatchPanel({
  canCreate,
  canLoad,
  canDecide,
  receipts,
  title = "Container Dispatch",
  description = "Manage outbound export container filling, cooling, and dispatch.",
  initialOrderId,
}: Props) {
  const { containerDispatches, coldStorageReceipts, exportOrders } = useStartrekStore();
  const allReceipts: ColdStorageReceipt[] = receipts && receipts.length > 0 ? receipts : (coldStorageReceipts || []);

  const [activeOrders, setActiveOrders] = useState<ExportOrder[]>(exportOrders || []);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId || "");

  // Refresh active export orders
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        if (data?.orders) {
          setActiveOrders(data.orders);
          store.setExportOrders(data.orders);
        }
      }
    } catch (e) {
      console.error("Failed to fetch export orders in dispatch:", e);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId);
      setShowCreate(true);
    }
  }, [initialOrderId]);

  const selectedOrder = useMemo(() => {
    return activeOrders.find((o) => o.id === selectedOrderId);
  }, [activeOrders, selectedOrderId]);

  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.role) {
          setCurrentUserRole(data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  const isColdStorageAdmin = currentUserRole === "COLD_STORAGE_ADMIN";
  const isMainOrOfficeAdmin = currentUserRole === "MAIN_ADMIN" || currentUserRole === "OFFICE_ADMIN";
  // Cold storage admins alone perform on-ground filling and dispatching actions.
  // Main Admins & Office Admins see the live delivery progress pipeline.
  const canExecuteActions = isColdStorageAdmin || (canLoad && !isMainOrOfficeAdmin);

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Force dispatch emergency confirmation dialog target
  const [forceTarget, setForceTarget] = useState<ContainerDispatch | null>(null);

  // Search & Status filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "LOADING" | "PLUGGED" | "DISPATCHED">("ALL");

  // Detailed inspect modal target
  const [selectedContainer, setSelectedContainer] = useState<ContainerDispatch | null>(null);

  // Status counts for filter tabs
  const statusCounts = useMemo(() => {
    return {
      ALL: containerDispatches.length,
      PENDING: containerDispatches.filter((c) => c.status === "PENDING_LOADING").length,
      LOADING: containerDispatches.filter((c) => c.status === "LOADING_IN_PROGRESS").length,
      PLUGGED: containerDispatches.filter((c) =>
        ["LOADED", "PLUGIN_COOLING", "READY_TO_DISPATCH"].includes(c.status)
      ).length,
      DISPATCHED: containerDispatches.filter((c) => c.status === "DISPATCHED").length,
    };
  }, [containerDispatches]);

  // Filtered container list matching search and status filter
  const filteredContainers = useMemo(() => {
    return containerDispatches.filter((c) => {
      // 1. Status Filter
      if (statusFilter === "PENDING" && c.status !== "PENDING_LOADING") return false;
      if (statusFilter === "LOADING" && c.status !== "LOADING_IN_PROGRESS") return false;
      if (
        statusFilter === "PLUGGED" &&
        !["LOADED", "PLUGIN_COOLING", "READY_TO_DISPATCH"].includes(c.status)
      ) {
        return false;
      }
      if (statusFilter === "DISPATCHED" && c.status !== "DISPATCHED") return false;

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = (c.containerNo || "").toLowerCase().includes(q);
        const matchSeal = (c.sealNumber || "").toLowerCase().includes(q);
        const matchVeh = (c.vehicleNo || "").toLowerCase().includes(q);
        const matchMob = (c.mobMobile || "").toLowerCase().includes(q);
        const matchRemarks = (c.remarks || "").toLowerCase().includes(q);
        const matchItems = c.items.some(
          (it) =>
            it.brandName.toLowerCase().includes(q) ||
            BOX_TYPE_LABELS[it.boxType]?.toLowerCase().includes(q)
        );
        if (!matchNo && !matchSeal && !matchVeh && !matchMob && !matchRemarks && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [containerDispatches, statusFilter, searchQuery]);

  // "New container" multi-container form state
  const [containers, setContainers] = useState<ContainerEntry[]>([
    { id: "c-1", containerNo: "", sealNumber: "", vehicleNo: "", mobMobile: "" },
  ]);

  const handleAddContainer = () => {
    setContainers((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        containerNo: "",
        sealNumber: "",
        vehicleNo: "",
        mobMobile: "",
      },
    ]);
  };

  const handleRemoveContainer = (index: number) => {
    if (containers.length <= 1) return;
    setContainers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleContainerChange = (
    index: number,
    field: keyof ContainerEntry,
    val: string
  ) => {
    setContainers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const [remarks, setRemarks] = useState("");
  const [dispatchMode, setDispatchMode] = useState<"PLUGIN" | "DIRECT" | null>(null);

  // 12-Hour Clock & Calendar state
  const todayYMD = useMemo(() => toYMD(new Date()), []);
  const [departureDateType, setDepartureDateType] = useState<"TODAY" | "TOMORROW" | "CUSTOM">("TODAY");
  const [customDate, setCustomDate] = useState<string>(todayYMD);
  const [clockHour, setClockHour] = useState<number>(6);
  const [clockMinute, setClockMinute] = useState<number>(30);
  const [clockPeriod, setClockPeriod] = useState<"AM" | "PM">("PM");

  const [items, setItems] = useState<DraftItem[]>([
    { boxType: "", brandName: "", quantity: "" },
  ]);

  // Aggregate live stored stock by clean brand name and box type
  const inventoryStock = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const r of allReceipts) {
      if (r.allocations && r.allocations.length > 0) {
        for (const a of r.allocations) {
          const count = a.boxCount || 0;
          if (count > 0) {
            const brand = cleanBrandName(a.brandName);
            const rawType =
              normalizeBoxType(a.boxType as string) ||
              normalizeBoxType(r.boxType as string) ||
              "13KG";
            if (rawType) {
              if (!map[brand]) map[brand] = {};
              map[brand][rawType] = (map[brand][rawType] || 0) + count;
            }
          }
        }
      }
    }
    return map;
  }, [allReceipts]);

  // Selectable brands (combines live cold storage stock with standard KD brands for advance orders)
  const selectableBrands = useMemo(() => {
    const set = new Set<string>();
    // 1. Brands with live stock in cold rooms
    Object.keys(inventoryStock).forEach((b) => set.add(b));
    // 2. Standard KD brands
    [
      "Joy Banana",
      "Star",
      "New Premium",
      "Premium",
      "Golden Sparrow",
      "Green Gold Export",
      "Kiran Doke Royal",
    ].forEach((b) => set.add(b));
    // 3. Brands from receipts
    allReceipts.forEach((r) => {
      const raw =
        r.brandName ||
        r.qualityReport?.boxBrand ||
        r.billData?.orchardParticulars ||
        r.harvestTask?.brandName;
      if (raw) set.add(cleanBrandName(raw));
    });
    return Array.from(set).sort();
  }, [inventoryStock, allReceipts]);

  // Dynamically compute remaining available boxes for a specific line
  const getAvailableForLine = useCallback(
    (lineIdx: number, brandName: string, boxType: string) => {
      if (!brandName || !boxType) return 0;
      const totalStored = inventoryStock[brandName]?.[boxType] || 0;
      const usedInOtherLines = items.reduce((sum, line, idx) => {
        if (idx !== lineIdx && line.brandName === brandName && line.boxType === boxType) {
          return sum + (parseInt(line.quantity) || 0) * containers.length;
        }
        return sum;
      }, 0);
      return Math.max(0, totalStored - usedInOtherLines);
    },
    [inventoryStock, items, containers.length]
  );

  const totalPlannedBoxesPerContainer = useMemo(() => {
    return items.reduce((sum, it) => sum + (parseInt(it.quantity) || 0), 0);
  }, [items]);

  const totalPlannedBoxes = totalPlannedBoxesPerContainer * containers.length;

  // Lines where requested boxes exceed stored cold storage inventory (Advance Orders)
  const linesWithShortfall = useMemo(() => {
    return items
      .filter((it) => it.brandName && it.boxType && (parseInt(it.quantity) || 0) > 0)
      .map((it, idx) => {
        const stored = inventoryStock[it.brandName]?.[it.boxType] || 0;
        const totalReq = (parseInt(it.quantity) || 0) * containers.length;
        const shortfall = Math.max(0, totalReq - stored);
        return { ...it, idx, stored, totalReq, shortfall };
      })
      .filter((l) => l.shortfall > 0);
  }, [items, containers.length, inventoryStock]);

  const totalShortfallBoxes = useMemo(() => {
    return linesWithShortfall.reduce((s, l) => s + l.shortfall, 0);
  }, [linesWithShortfall]);

  // Target departure date derived from 12-hour clock and calendar selection
  const targetDispatchDate = useMemo(() => {
    if (dispatchMode !== "PLUGIN") return null;
    let d = new Date();
    if (departureDateType === "TOMORROW") {
      d.setDate(d.getDate() + 1);
    } else if (departureDateType === "CUSTOM" && customDate) {
      const [y, m, day] = customDate.split("-").map(Number);
      if (y && m && day) {
        d = new Date(y, m - 1, day);
      }
    }
    let h24 = clockHour % 12;
    if (clockPeriod === "PM") h24 += 12;
    d.setHours(h24, clockMinute, 0, 0);
    return d;
  }, [dispatchMode, departureDateType, customDate, clockHour, clockMinute, clockPeriod]);

  // Estimated cooling window calculation
  const coolingTimeDiff = useMemo(() => {
    if (!targetDispatchDate) return null;
    const diffMs = targetDispatchDate.getTime() - Date.now();
    if (diffMs <= 0) {
      return { isPast: true, hours: 0, minutes: 0 };
    }
    const hours = Math.floor(diffMs / 3_600_000);
    const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
    return { isPast: false, hours, minutes };
  }, [targetDispatchDate]);

  // Plug-in dialog (for legacy manual plug-ins if needed)
  const [pluginTarget, setPluginTarget] = useState<ContainerDispatch | null>(null);
  const [pluginHours, setPluginHours] = useState("4");

  // Ticks the countdown labels once a minute while a plug-in is cooling.
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasCooling = containerDispatches.some((c) => c.status === "PLUGIN_COOLING");
    if (!hasCooling) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [containerDispatches]);

  const fetchContainers = useCallback(() => {
    fetch("/api/container-dispatch")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.dispatches) store.setContainerDispatches(data.dispatches);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchContainers();
    if (allReceipts.length === 0) {
      fetch("/api/cold-storage")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.receipts) store.setColdStorageReceipts(data.receipts);
        })
        .catch(() => {});
    }
    const id = window.setInterval(fetchContainers, 30_000);
    return () => window.clearInterval(id);
  }, [fetchContainers, allReceipts.length]);

  const resetForm = () => {
    setContainers([
      { id: "c-1", containerNo: "", sealNumber: "", vehicleNo: "", mobMobile: "" },
    ]);
    setSelectedOrderId("");
    setRemarks("");
    setDispatchMode(null);
    setDepartureDateType("TODAY");
    setCustomDate(todayYMD);
    setClockHour(6);
    setClockMinute(30);
    setClockPeriod("PM");
    setItems([{ boxType: "", brandName: "", quantity: "" }]);
  };

  const handleBrandChange = (idx: number, newBrand: string) => {
    const next = [...items];
    next[idx] = {
      ...next[idx],
      brandName: newBrand,
      boxType: next[idx].boxType || "13KG",
    };
    setItems(next);
  };

  const handleBoxTypeChange = (idx: number, newBoxType: BoxType) => {
    const next = [...items];
    next[idx] = {
      ...next[idx],
      boxType: newBoxType,
    };
    setItems(next);
  };

  const handleQuantityChange = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = {
      ...next[idx],
      quantity: val,
    };
    setItems(next);
  };

  const handleCreate = async () => {
    for (let cIdx = 0; cIdx < containers.length; cIdx++) {
      const c = containers[cIdx];
      const prefix = containers.length > 1 ? `Container #${cIdx + 1}: ` : "";
      if (!c.containerNo.trim()) {
        toast.error(`${prefix}Enter Container Number.`);
        return;
      }
      if (!c.sealNumber.trim()) {
        toast.error(`${prefix}Enter Seal Number.`);
        return;
      }
      if (!c.vehicleNo.trim()) {
        toast.error(`${prefix}Enter Vehicle Number.`);
        return;
      }
      if (!c.mobMobile.trim()) {
        toast.error(`${prefix}Enter Driver Mobile Number.`);
        return;
      }
    }

    if (items.length === 0) {
      toast.error("Add at least one line with brand and quantity.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.brandName || !it.boxType) {
        toast.error(`Line #${i + 1}: Select Brand and Box Size.`);
        return;
      }
      const qty = parseInt(it.quantity) || 0;
      if (qty <= 0) {
        toast.error(`Line #${i + 1} (${it.brandName}): Enter quantity > 0.`);
        return;
      }
      // Note: Advance orders are allowed without stock limit.
      // Orders can be scheduled before produce arrives in cold storage.
    }

    if (!dispatchMode) {
      toast.error("Select Dispatch Mode: 'Plug-In (Yes)' or 'Direct Dispatch'.");
      return;
    }

    if (dispatchMode === "PLUGIN") {
      if (!targetDispatchDate) {
        toast.error("Specify departure time for plug-in cooling.");
        return;
      }
      if (coolingTimeDiff?.isPast) {
        toast.error("Scheduled departure time is in the past. Select a future time or date.");
        return;
      }
    }

    const cleanItems = items.map((i) => ({
      boxType: i.boxType as BoxType,
      brandName: i.brandName,
      quantity: parseInt(i.quantity) || 0,
    }));

    const cleanContainers = containers.map((c) => ({
      containerNo: c.containerNo.trim().toUpperCase(),
      sealNumber: c.sealNumber.trim().toUpperCase(),
      vehicleNo: c.vehicleNo.trim().toUpperCase(),
      mobMobile: c.mobMobile.trim(),
    }));

    setSaving(true);
    try {
      const res = await fetch("/api/container-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          containers: cleanContainers,
          remarks: remarks.trim(),
          dispatchMode,
          targetDispatchTime:
            dispatchMode === "PLUGIN" && targetDispatchDate
              ? targetDispatchDate.toISOString()
              : null,
          items: cleanItems,
          orderId: selectedOrderId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        if (res.status === 403) {
          throw new Error(data.error || "Permission denied (403 Forbidden).");
        }
        throw new Error(data.error || "Failed to create container");
      }

      if (Array.isArray(data.dispatches)) {
        for (const d of data.dispatches) {
          store.addContainerDispatch(d);
        }
      } else if (data.dispatch) {
        store.addContainerDispatch(data.dispatch);
      }

      if (dispatchMode === "DIRECT") {
        toast.success(
          cleanContainers.length > 1
            ? `Created ${cleanContainers.length} container load requests: DIRECT DISPATCH`
            : `Container ${cleanContainers[0].containerNo} request created: DIRECT DISPATCH`,
          {
            description:
              totalShortfallBoxes > 0
                ? `Advance order saved. Reminder: ${totalShortfallBoxes} boxes pending cold room receipt. Dispatches immediately once loading completes.`
                : "Cold Storage notified to dispatch immediately once loading completes.",
          }
        );
      } else {
        toast.success(
          cleanContainers.length > 1
            ? `Created ${cleanContainers.length} container load requests: PLUG-IN COOLING`
            : `Container ${cleanContainers[0].containerNo} request created: PLUG-IN COOLING`,
          {
            description:
              totalShortfallBoxes > 0
                ? `Advance order saved (${totalShortfallBoxes} boxes pending receipt). Cooling scheduled until departure at ${targetDispatchDate?.toLocaleTimeString(
                    "en-IN",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    }
                  )}.`
                : `Scheduled to cool until departure at ${targetDispatchDate?.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}.`,
          }
        );
      }

      setShowCreate(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create container");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContainer = async (c: ContainerDispatch) => {
    if (!confirm(`Cancel and delete container request ${c.containerNo}?`)) return;
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/container-dispatch?id=${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete container");
      store.removeContainerDispatch(c.id);
      toast.success(`Container ${c.containerNo} request deleted.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete container");
    } finally {
      setBusyId(null);
    }
  };

  // State transitions: START_LOADING, LOADING_COMPLETE, DISPATCH (normal or force)
  const runAction = async (
    container: ContainerDispatch,
    action: "START_LOADING" | "LOADING_COMPLETE" | "ALLOW_DISPATCH" | "DISPATCH",
    force?: boolean
  ) => {
    setBusyId(container.id);
    try {
      const res = await fetch("/api/container-dispatch", {
        method: action === "DISPATCH" ? "PUT" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, dispatchId: container.id, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      store.updateContainerDispatch(container.id, data.dispatch);
      if (action === "START_LOADING") {
        toast.success(`Container ${container.containerNo}: Filling started`, {
          description: "Main and Office admins notified.",
        });
      } else if (action === "LOADING_COMPLETE") {
        toast.success(`Container ${container.containerNo}: Work done`, {
          description: "Loading completed. Admins notified.",
        });
      } else if (action === "ALLOW_DISPATCH") {
        toast.success(`Dispatch permission granted for ${container.containerNo}`);
      } else if (force) {
        toast.warning(`Container ${container.containerNo}: Emergency force dispatched`, {
          description: "Stock deducted. Admins alerted.",
        });
      } else {
        toast.success(`Container ${container.containerNo} dispatched sealed with papers`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handlePlugin = async () => {
    if (!pluginTarget) return;
    const hours = parseInt(pluginHours);
    if (!hours || hours <= 0) {
      toast.error("Enter the plug-in duration in hours.");
      return;
    }

    setBusyId(pluginTarget.id);
    try {
      const res = await fetch("/api/container-dispatch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PLUG_IN",
          dispatchId: pluginTarget.id,
          pluginHours: hours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start plug-in cooling");

      store.updateContainerDispatch(pluginTarget.id, data.dispatch);
      toast.success(`Plug-in cooling started for ${data.dispatch.containerNo}`, {
        description: `Dispatch locked until ${new Date(
          data.dispatch.pluginReadyAt
        ).toLocaleString("en-IN")}.`,
      });
      setPluginTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start plug-in cooling");
    } finally {
      setBusyId(null);
    }
  };

  const buildMessage = (c: ContainerDispatch) => {
    const modeDesc =
      c.dispatchMode === "DIRECT"
        ? "DIRECT DISPATCH (Dispatch immediately after loading)"
        : c.dispatchMode === "PLUGIN" && c.targetDispatchTime
        ? `PLUG-IN COOLING (Departure: ${new Date(c.targetDispatchTime).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })})`
        : "STANDARD";

    return (
      `*CONTAINER LOAD & DISPATCH*\n\n` +
      `*Container No:* ${c.containerNo}\n` +
      `*Seal No:* ${c.sealNumber}\n` +
      `*Vehicle No:* ${c.vehicleNo}\n` +
      `*Mobile:* ${c.mobMobile}\n` +
      `*Status:* ${STATUS_META[c.status].label}\n` +
      `*Mode:* ${modeDesc}\n` +
      (c.remarks ? `*Remarks:* ${c.remarks}\n` : "") +
      `\n*Produce to Load:*\n` +
      c.items
        .map((i) => `• ${formatBoxType(i.boxType)} — ${i.brandName}: ${i.quantity} boxes`)
        .join("\n") +
      `\n\n*Total Load:* ${c.items.reduce((s, i) => s + i.quantity, 0)} boxes\n\n` +
      (c.dispatchMode === "DIRECT" ? `⚠️ *NOTE:* Direct dispatch authorized upon loading completion.` : "")
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 font-heading">
            <Ship className="w-5 h-5 text-sky-700" /> {title}
          </h3>
          <p className="text-xs text-slate-500 font-medium">{description}</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Container
          </Button>
        )}
      </div>

      {/* ─── SEARCH & PROCESS FILTER TABS ─── */}
      <Card className="border-slate-200 bg-white rounded-2xl p-3.5 sm:p-4 shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by Container No, Seal, Vehicle, Mobile, Brand, or Remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50/70 border-slate-200 h-10 rounded-xl text-xs font-semibold"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Process Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          {[
            { key: "ALL", label: "All Containers", count: statusCounts.ALL },
            { key: "PENDING", label: "Pending Loading", count: statusCounts.PENDING },
            { key: "LOADING", label: "Loading in Progress", count: statusCounts.LOADING },
            { key: "PLUGGED", label: "Work Done / Plugged", count: statusCounts.PLUGGED },
            { key: "DISPATCHED", label: "Dispatched", count: statusCounts.DISPATCHED },
          ].map((tab) => {
            const isSelected = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? "bg-slate-900 text-white font-black"
                      : "bg-slate-200/80 text-slate-700 font-bold"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ─── CONTAINER CARDS GRID ─── */}
      {containerDispatches.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white rounded-2xl p-8 text-center">
          <Ship className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-600">No containers raised yet</p>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {canCreate
              ? "Add a container to initiate produce loading from cold storage."
              : "No container load request has been raised."}
          </p>
        </Card>
      ) : filteredContainers.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white rounded-2xl p-8 text-center space-y-2">
          <Ship className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-600">No containers match your search or filter</p>
          <p className="text-xs text-slate-400">
            {searchQuery ? `No results found for "${searchQuery}".` : "No containers in this status."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
            }}
            className="text-xs font-bold rounded-xl h-8 mt-2"
          >
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredContainers.map((c) => {
            const meta = STATUS_META[c.status];
            const locked = isPluginLocked(c);
            const totalBoxes = c.items.reduce((s, i) => s + i.quantity, 0);
            const containerShortfall = c.items.reduce((short, item) => {
              const stored = inventoryStock[item.brandName]?.[item.boxType] || 0;
              return short + Math.max(0, item.quantity - stored);
            }, 0);
            const isDispatched = c.status === "DISPATCHED";

            /* ─── 1. COMPACT / COLLAPSED CARD FOR DISPATCHED CONTAINERS ─── */
            if (isDispatched) {
              return (
                <Card
                  key={c.id}
                  className="border-slate-200 bg-white rounded-2xl p-4 space-y-3 shadow-xs hover:border-slate-300 hover:shadow-card transition-all"
                >
                  {/* Prominent Dates Header */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Raised: <strong className="text-slate-700 font-mono">{formatDateTime(c.createdAt)}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Dispatched: <strong className="font-mono">{formatDateTime(c.dispatchedAt)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Header / Basic Identifiers */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-black text-slate-900 font-mono text-base">{c.containerNo}</p>
                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                          Dispatched
                        </Badge>
                        {c.dispatchMode === "DIRECT" && (
                          <Badge className="bg-sky-50 text-sky-800 border-sky-300 font-bold text-[10px]">
                            Direct
                          </Badge>
                        )}
                        {c.dispatchMode === "PLUGIN" && (
                          <Badge className="bg-indigo-50 text-indigo-800 border-indigo-300 font-bold text-[10px]">
                            Plug-In
                          </Badge>
                        )}
                        {c.forceDispatched && (
                          <Badge className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-[10px]">
                            Force Dispatched
                          </Badge>
                        )}
                        {c.order && (
                          <Badge className="bg-blue-50 text-blue-800 border-blue-300 font-bold text-[10px] flex items-center gap-1">
                            <PackageCheck className="w-3 h-3 text-blue-600" />
                            {c.order.orderNumber} ({c.order.buyerName})
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">
                        Seal: <span className="font-mono text-slate-800">{c.sealNumber}</span> · Vehicle:{" "}
                        <span className="font-mono text-slate-800">{c.vehicleNo}</span> · Driver:{" "}
                        <span className="font-mono text-slate-800">{c.mobMobile}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-700 font-mono block">
                        {totalBoxes} Boxes
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[120px] block">
                        {c.items.map((i) => i.brandName).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Quick Summary Strip */}
                  <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-xl text-xs text-slate-600 border border-slate-100">
                    <span className="text-[11px] font-medium truncate max-w-[70%]">
                      Lines: {c.items.map((i) => `${i.quantity} bx (${formatBoxType(i.boxType)} ${i.brandName})`).join(" • ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedContainer(c)}
                      className="text-sky-700 hover:text-sky-900 font-bold text-[11px] flex items-center gap-1 shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" /> Details &amp; Hands
                    </button>
                  </div>

                  {/* Compact Action Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedContainer(c)}
                      className="h-7 text-xs rounded-lg border-slate-300 font-bold gap-1 hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" /> View Details
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => shareReportMessage(buildMessage(c), `Container ${c.containerNo}`)}
                        className="h-7 text-xs rounded-lg border-slate-300 font-bold gap-1"
                      >
                        <Send className="w-3 h-3 text-slate-600" /> Share
                      </Button>
                      {canCreate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteContainer(c)}
                          className="h-7 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            }

            /* ─── 2. ACTIVE DETAILED CARD (PENDING / LOADING / PLUGGED) ─── */
            return (
              <Card
                key={c.id}
                className="border-slate-200 bg-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-card"
              >
                {/* Prominent Dates Header */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 font-medium">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Raised: <strong className="text-slate-700 font-mono">{formatDateTime(c.createdAt)}</strong>
                    </span>
                  </div>
                  {c.loadingStartedAt && (
                    <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                      <Play className="w-3 h-3 text-blue-600" />
                      <span>
                        Filling Started: <strong className="font-mono">{formatDateTime(c.loadingStartedAt)}</strong>
                      </span>
                    </div>
                  )}
                  {c.loadedAt && !c.loadingStartedAt && (
                    <div className="flex items-center gap-1.5 text-sky-700 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-sky-600" />
                      <span>
                        Work Done: <strong className="font-mono">{formatDateTime(c.loadedAt)}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-900 font-mono text-base">{c.containerNo}</p>
                      {c.dispatchMode === "DIRECT" && (
                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                          Direct Dispatch
                        </Badge>
                      )}
                      {c.dispatchMode === "PLUGIN" && (
                        <Badge className="bg-indigo-50 text-indigo-800 border-indigo-300 font-bold text-[10px] flex items-center gap-1">
                          <PlugZap className="w-3 h-3 text-indigo-600" /> Plug-In
                        </Badge>
                      )}
                      {c.forceDispatched && (
                        <Badge className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-[10px]">
                          Force Dispatched
                        </Badge>
                      )}
                      {containerShortfall > 0 && c.status === "PENDING_LOADING" && (
                        <Badge className="bg-amber-50 text-amber-900 border-amber-300 font-bold text-[10px] flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5 text-amber-600" /> Stock Pending ({containerShortfall} bx)
                        </Badge>
                      )}
                      {c.order && (
                        <Badge className="bg-blue-50 text-blue-800 border-blue-300 font-bold text-[10px] flex items-center gap-1">
                          <PackageCheck className="w-3 h-3 text-blue-600" />
                          Order: {c.order.orderNumber} ({c.order.buyerName})
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      Seal: <span className="font-mono text-slate-800">{c.sealNumber}</span> · Vehicle:{" "}
                      <span className="font-mono text-slate-800">{c.vehicleNo}</span> · Mobile:{" "}
                      <span className="font-mono text-slate-800">{c.mobMobile}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 border ${meta.className}`}>
                    {meta.label}
                  </Badge>
                </div>

                {/* Remarks */}
                {c.remarks && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-700">
                      Remarks:
                    </span>
                    <p className="mt-0.5 italic">{c.remarks}</p>
                  </div>
                )}

                {/* Produce load details */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200">
                    <span>Produce Breakdown</span>
                    <span>Quantity</span>
                  </div>
                  {c.items.map((i, idx) => (
                    <div key={i.id || idx} className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">
                        {formatBoxType(i.boxType)} · {i.brandName}
                      </span>
                      <span className="font-mono font-black text-slate-900">{i.quantity} boxes</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-xs">
                    <span className="font-bold text-slate-700">Total Planned</span>
                    <span className="font-mono font-black text-emerald-700">{totalBoxes} boxes</span>
                  </div>
                </div>

                {/* Departure schedule info */}
                {c.targetDispatchTime && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Departure:{" "}
                      <strong>
                        {new Date(c.targetDispatchTime).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </strong>
                    </span>
                  </div>
                )}

                {locked && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-700" /> Plug-in cooling: {formatCountdown(c.pluginReadyAt)}
                    </span>
                    {canExecuteActions && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setForceTarget(c)}
                        className="h-7 text-[11px] text-rose-700 hover:text-rose-900 hover:bg-rose-100/50 font-bold px-2 rounded-md"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-600 mr-1" /> Force Dispatch
                      </Button>
                    )}
                  </div>
                )}

                {c.status === "PLUGIN_COOLING" && !locked && (
                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Cooling complete — ready to dispatch sealed with papers.
                  </p>
                )}

                {/* ─── LIVE DELIVERY PROGRESS TRACKER (Main Admin & Office Admin View) ─── */}
                {!canExecuteActions && (
                  <ContainerProgressTracker
                    status={c.status}
                    dispatchMode={c.dispatchMode}
                    targetDispatchTime={c.targetDispatchTime}
                    pluginReadyAt={c.pluginReadyAt}
                  />
                )}

                {/* ─── WORKFLOW ACTION BUTTONS ─── */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  {/* Physical Warehouse Operations: Strictly for Cold Storage Admin */}
                  {canExecuteActions && c.status === "PENDING_LOADING" && (
                    <Button
                      size="sm"
                      disabled={busyId === c.id}
                      onClick={() => runAction(c, "START_LOADING")}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg gap-1.5 text-xs h-8 shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5" /> Start Loading
                    </Button>
                  )}

                  {canExecuteActions && c.status === "LOADING_IN_PROGRESS" && (
                    <Button
                      size="sm"
                      disabled={busyId === c.id}
                      onClick={() => runAction(c, "LOADING_COMPLETE")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1.5 text-xs h-8 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Work Done
                    </Button>
                  )}

                  {canExecuteActions && (c.status === "READY_TO_DISPATCH" || (c.status === "PLUGIN_COOLING" && !locked)) && (
                    <Button
                      size="sm"
                      disabled={busyId === c.id}
                      onClick={() => runAction(c, "DISPATCH")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1.5 text-xs h-8 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" /> Dispatch Sealed With Papers
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedContainer(c)}
                    className="rounded-lg gap-1 text-xs h-8 border-slate-300 font-bold hover:bg-slate-50"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" /> Details &amp; Hands
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => shareReportMessage(buildMessage(c), `Container ${c.containerNo}`)}
                    className="rounded-lg gap-1.5 text-xs h-8 border-slate-300 font-bold"
                  >
                    <Send className="w-3.5 h-3.5" /> Share
                  </Button>

                  {canCreate && c.status !== "DISPATCHED" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === c.id}
                      onClick={() => handleDeleteContainer(c)}
                      className="h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold gap-1 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── CREATE CONTAINER DIALOG ─── */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setShowCreate(open);
        }}
      >
        <DialogContent className="w-[96vw] max-w-4xl sm:max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2 font-heading">
              <Ship className="w-5 h-5 text-sky-700" /> Raise Container Load Request
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-3">
            {/* 0. Commercial Export Order Linkage (Optional) */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/90 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-blue-700" /> Fulfill Commercial Export Order (Optional)
                  </span>
                  <p className="text-[11px] text-blue-700/80 font-medium">
                    Link this dispatch to an existing export order to track live progress and auto-update order completion.
                  </p>
                </div>
                <Select
                  value={selectedOrderId || "NONE"}
                  onValueChange={(val: any) => {
                    const chosen = val === "NONE" ? "" : (val || "");
                    setSelectedOrderId(chosen);
                  }}
                >
                  <SelectTrigger className="bg-white border-blue-300 h-9 rounded-xl text-xs font-bold w-full sm:w-64 text-slate-800 shadow-2xs">
                    <SelectValue placeholder="Select Export Order (Optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="NONE">None — Ad-hoc Dispatch</SelectItem>
                    {activeOrders.map((ord) => (
                      <SelectItem key={ord.id} value={ord.id}>
                        {ord.orderNumber} • {ord.buyerName} ({ord.destination || "Export"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* If an order is selected, show details and quick fill button */}
              {selectedOrder && (
                <div className="p-2.5 rounded-lg bg-white border border-blue-200 text-xs space-y-2 animate-in fade-in-50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-blue-900 font-heading">{selectedOrder.orderNumber}</span>
                        <span className="text-slate-500">•</span>
                        <span className="font-bold text-slate-800">{selectedOrder.buyerName}</span>
                        {selectedOrder.destination && (
                          <Badge variant="outline" className="bg-slate-50 text-[10px] font-bold">
                            {selectedOrder.destination}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Order items:{" "}
                        {selectedOrder.items
                          .map((it) => `${it.quantity} bx (${formatBoxType(it.boxType)} ${it.brandName})`)
                          .join(", ")}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newItems = selectedOrder.items.map((it) => ({
                          brandName: it.brandName,
                          boxType: it.boxType,
                          quantity: String(Math.ceil(it.quantity / containers.length)),
                        }));
                        setItems(newItems);
                        toast.success("Autofilled load lines from order items");
                      }}
                      className="h-7 text-xs bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100 font-bold gap-1 rounded-lg"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Autofill Lines from Order
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 1. Transport Details (Multi-Container Bulk Support) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-sky-700" /> 1. Transport Details {containers.length > 1 && `(${containers.length} Containers in Batch)`}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddContainer}
                  className="h-7 text-xs rounded-lg gap-1 border-sky-300 text-sky-700 hover:bg-sky-50 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Container
                </Button>
              </div>

              <div className="space-y-3">
                {containers.map((c, cIdx) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 relative"
                  >
                    {containers.length > 1 && (
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 mb-1">
                        <span className="text-[11px] font-black text-slate-700 font-heading">
                          Container #{cIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveContainer(cIdx)}
                          className="text-rose-600 hover:text-rose-800 text-[11px] font-bold flex items-center gap-1 p-0.5 rounded hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Container No *</Label>
                        <Input
                          placeholder="e.g. MEDU1234567"
                          value={c.containerNo}
                          onChange={(e) => handleContainerChange(cIdx, "containerNo", e.target.value.toUpperCase())}
                          className="mt-1 h-9 bg-white font-mono uppercase text-xs font-bold shadow-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Seal No *</Label>
                        <Input
                          placeholder="e.g. SL987654"
                          value={c.sealNumber}
                          onChange={(e) => handleContainerChange(cIdx, "sealNumber", e.target.value.toUpperCase())}
                          className="mt-1 h-9 bg-white font-mono uppercase text-xs font-bold shadow-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Vehicle No *</Label>
                        <Input
                          placeholder="e.g. MH-12-AB-1234"
                          value={c.vehicleNo}
                          onChange={(e) => handleContainerChange(cIdx, "vehicleNo", e.target.value.toUpperCase())}
                          className="mt-1 h-9 bg-white font-mono uppercase text-xs font-bold shadow-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">Driver Mobile *</Label>
                        <Input
                          placeholder="e.g. +91 98765 43210"
                          value={c.mobMobile}
                          onChange={(e) => handleContainerChange(cIdx, "mobMobile", e.target.value)}
                          className="mt-1 h-9 bg-white font-mono text-xs font-bold shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Planned Load Lines */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">2. Planned Load Lines (Produce to Load)</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setItems([...items, { boxType: "13KG", brandName: selectableBrands[0] || "Joy Banana", quantity: "" }])}
                  className="h-7 text-xs rounded-lg gap-1 border-slate-300 font-bold hover:bg-slate-100"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Line
                </Button>
              </div>

              <div className="space-y-2.5">
                {items.map((it, idx) => {
                  const availableSizes: BoxType[] = ["7KG", "13KG", "13_5KG", "16KG"];
                  const maxAvailable = getAvailableForLine(idx, it.brandName, it.boxType);
                  const qtyNum = parseInt(it.quantity) || 0;
                  const totalQtyForLine = qtyNum * containers.length;
                  const isShortfall = it.brandName && it.boxType && qtyNum > 0 && totalQtyForLine > maxAvailable;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border space-y-2 transition-colors ${
                        isShortfall
                          ? "bg-amber-50/50 border-amber-300/80 shadow-xs"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600">Line #{idx + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setItems(items.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        {/* Brand */}
                        <div className="sm:col-span-5">
                          <Label className="text-[11px] font-semibold text-slate-700 block mb-1">Brand *</Label>
                          <Select
                            value={it.brandName}
                            onValueChange={(val) => handleBrandChange(idx, val || "")}
                          >
                            <SelectTrigger className="h-9 bg-white text-xs font-medium shadow-xs">
                              <SelectValue placeholder="Select Brand" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectableBrands.map((brand) => {
                                const brandTotal = Object.values(
                                  inventoryStock[brand] || {}
                                ).reduce((sum, v) => sum + v, 0);
                                return (
                                  <SelectItem key={brand} value={brand} className="text-xs">
                                    {brand} {brandTotal > 0 ? `(${brandTotal} in cold room)` : "(0 in stock — Advance Order)"}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Box Size */}
                        <div className="sm:col-span-4">
                          <Label className="text-[11px] font-semibold text-slate-700 block mb-1">Box Size *</Label>
                          <Select
                            value={it.boxType}
                            disabled={!it.brandName}
                            onValueChange={(val) => handleBoxTypeChange(idx, (val || "") as BoxType)}
                          >
                            <SelectTrigger className="h-9 bg-white text-xs font-medium shadow-xs">
                              <SelectValue placeholder={!it.brandName ? "Select Brand First" : "Select Size"} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSizes.map((size) => {
                                const stockForSize = inventoryStock[it.brandName]?.[size] || 0;
                                const sizeLabel =
                                  BOX_TYPE_LABELS[size] || `${size.replace(/^BOX_/, "").replace("_", ".")} kg`;
                                return (
                                  <SelectItem key={size} value={size} className="text-xs">
                                    {sizeLabel} {stockForSize > 0 ? `(${stockForSize} in stock)` : "(0 in stock — Pending Arrival)"}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Quantity with available indicator */}
                        <div className="sm:col-span-3">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <Label className="text-[11px] font-semibold text-slate-700">Qty / Container *</Label>
                            {it.brandName && it.boxType && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  maxAvailable > 0
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-amber-50 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {maxAvailable > 0 ? `In Stock: ${maxAvailable}` : "Stock: 0"}
                              </span>
                            )}
                          </div>
                          <Input
                            type="number"
                            min="1"
                            disabled={!it.brandName || !it.boxType}
                            placeholder="e.g. 500"
                            value={it.quantity}
                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                            className={`h-9 bg-white text-xs font-bold font-mono shadow-xs ${
                              isShortfall ? "border-amber-400 bg-amber-50/20 text-amber-950 focus-visible:ring-amber-400" : ""
                            }`}
                          />
                        </div>
                      </div>

                      {/* Advance Order Shortfall Notification per line */}
                      {isShortfall && (
                        <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50/90 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              Total needed: <strong>{totalQtyForLine}</strong> boxes across {containers.length} container(s) ({maxAvailable} in cold room).
                            </span>
                          </span>
                          <span className="font-bold text-[10px] text-amber-800 bg-amber-100/90 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                            Shortfall: {totalQtyForLine - maxAvailable} pending arrival
                          </span>
                        </div>
                      )}
                      {!isShortfall && qtyNum > 0 && containers.length > 1 && (
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">
                          Total across {containers.length} containers: <strong className="text-slate-800">{totalQtyForLine} boxes</strong> (In stock: {maxAvailable})
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 text-white">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">Total Planned Boxes</span>
                    {containers.length > 1 && (
                      <span className="text-[10px] text-slate-400">
                        {totalPlannedBoxesPerContainer} boxes × {containers.length} containers
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-lg font-black text-emerald-400">
                    {totalPlannedBoxes} <span className="text-xs font-normal text-slate-400">Boxes</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Remarks */}
            <div className="space-y-1">
              <Label htmlFor="remarks" className="text-xs font-semibold text-slate-700">
                Remarks (Optional)
              </Label>
              <Textarea
                id="remarks"
                placeholder="e.g. Inspect temperature at 13.5°C before sealing, handle with care..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="bg-white text-xs min-h-[56px] rounded-xl border-slate-200 shadow-xs"
              />
            </div>

            {/* 4. Dispatch Mode: Plug-In vs Direct */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Dispatch Mode *</span>
                {dispatchMode && (
                  <button
                    type="button"
                    onClick={() => setDispatchMode(null)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Plug-In (Yes) */}
                <button
                  type="button"
                  onClick={() => setDispatchMode("PLUGIN")}
                  disabled={dispatchMode === "DIRECT"}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    dispatchMode === "PLUGIN"
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-sm"
                      : dispatchMode === "DIRECT"
                      ? "border-slate-200 bg-slate-100/60 opacity-40 cursor-not-allowed"
                      : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                      <PlugZap className="w-4 h-4 text-indigo-600" /> Plug-In (Yes)
                    </span>
                    {dispatchMode === "PLUGIN" && (
                      <Badge className="bg-indigo-600 text-white text-[10px] font-bold">Selected</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Container cools at bay until scheduled departure time.
                  </p>
                </button>

                {/* Direct Dispatch */}
                <button
                  type="button"
                  onClick={() => setDispatchMode("DIRECT")}
                  disabled={dispatchMode === "PLUGIN"}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    dispatchMode === "DIRECT"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm"
                      : dispatchMode === "PLUGIN"
                      ? "border-slate-200 bg-slate-100/60 opacity-40 cursor-not-allowed"
                      : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-emerald-600" /> Direct Dispatch
                    </span>
                    {dispatchMode === "DIRECT" && (
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold">Selected</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Dispatch immediately once loading completes. Sends admin alert.
                  </p>
                </button>
              </div>

              {/* 12-Hour Clock + Calendar (Expands when Plug-in selected) */}
              {dispatchMode === "PLUGIN" && (
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-3.5 animate-in fade-in-50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-700" /> Scheduled Departure Time
                    </span>

                    {/* Date Selector: Today, Tomorrow, Calendar */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDepartureDateType("TODAY")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          departureDateType === "TODAY"
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-white border border-indigo-200 text-slate-700 hover:bg-indigo-50"
                        }`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setDepartureDateType("TOMORROW")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          departureDateType === "TOMORROW"
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-white border border-indigo-200 text-slate-700 hover:bg-indigo-50"
                        }`}
                      >
                        Tomorrow
                      </button>
                      <div className="flex items-center gap-1 bg-white border border-indigo-200 px-2 py-0.5 rounded-lg shadow-2xs">
                        <CalendarIcon className="w-3 h-3 text-slate-500" />
                        <input
                          type="date"
                          min={todayYMD}
                          value={customDate}
                          onChange={(e) => {
                            setCustomDate(e.target.value);
                            setDepartureDateType("CUSTOM");
                          }}
                          className={`text-xs font-semibold outline-none bg-transparent cursor-pointer ${
                            departureDateType === "CUSTOM" ? "text-indigo-700 font-bold" : "text-slate-600"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Digital Clock Display */}
                  <div className="flex items-center justify-center gap-2 py-2 bg-slate-900 text-white rounded-xl">
                    <div className="text-center px-3 py-1 bg-slate-800 rounded-lg border border-slate-700">
                      <span className="text-2xl font-black font-mono">
                        {clockHour.toString().padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-xl font-black text-indigo-400 animate-pulse">:</span>
                    <div className="text-center px-3 py-1 bg-slate-800 rounded-lg border border-slate-700">
                      <span className="text-2xl font-black font-mono">
                        {clockMinute.toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => setClockPeriod("AM")}
                        className={`px-2.5 py-1 rounded text-xs font-black ${
                          clockPeriod === "AM" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setClockPeriod("PM")}
                        className={`px-2.5 py-1 rounded text-xs font-black ${
                          clockPeriod === "PM" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>

                  {/* Hour Buttons */}
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setClockHour(h)}
                        className={`h-8 rounded-lg text-xs font-bold ${
                          clockHour === h
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>

                  {/* Minute Presets */}
                  <div className="flex items-center gap-1.5">
                    {[0, 15, 30, 45].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setClockMinute(m)}
                        className={`h-7 px-3 rounded-lg text-xs font-bold ${
                          clockMinute === m
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        :{m.toString().padStart(2, "0")}
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[11px] text-slate-500 font-semibold">Min:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={clockMinute}
                        onChange={(e) => setClockMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="h-7 w-14 bg-white font-mono text-xs font-bold text-center"
                      />
                    </div>
                  </div>

                  {/* Calculated cooling text */}
                  {coolingTimeDiff?.isPast ? (
                    <div className="p-2.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs flex items-center justify-between">
                      <span>Departure time is in the past. Select future time or tomorrow.</span>
                      <button
                        type="button"
                        onClick={() => setDepartureDateType("TOMORROW")}
                        className="font-bold underline text-amber-950 text-xs ml-2"
                      >
                        Set Tomorrow
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-indigo-900 font-semibold">
                      ❄️ Pre-cooling for ~{coolingTimeDiff?.hours}h {coolingTimeDiff?.minutes}m until{" "}
                      {targetDispatchDate?.toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}.
                    </p>
                  )}
                </div>
              )}

              {/* Direct dispatch banner */}
              {dispatchMode === "DIRECT" && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                  🚀 <strong>Direct Dispatch:</strong> Immediate dispatch alert will be dispatched to the Cold Storage Admin upon request creation.
                </div>
              )}

              {/* Advance Order Notice Banner when produce is yet to reach cold rooms */}
              {totalShortfallBoxes > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-900">
                      Advance Load Request Notice — Stock Pending Arrival
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                      Total order requires <strong>{totalPlannedBoxes} boxes</strong> across {containers.length} container(s), of which <strong>{totalShortfallBoxes} boxes</strong> are yet to arrive in cold storage.
                      Your container request will be <strong>accepted and saved</strong>; please ensure incoming harvest produce is verified and allocated to cold rooms before loading starts.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="rounded-xl text-xs font-bold h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving || totalPlannedBoxes <= 0 || !dispatchMode}
                onClick={handleCreate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9 px-5 gap-1.5 shadow-sm"
              >
                <Ship className="w-4 h-4" />
                {saving
                  ? "Creating..."
                  : totalShortfallBoxes > 0
                  ? `Submit Advance Order (${totalPlannedBoxes} bx)`
                  : `Submit (${totalPlannedBoxes} bx)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── EMERGENCY FORCE DISPATCH CONFIRMATION DIALOG ─── */}
      <Dialog open={Boolean(forceTarget)} onOpenChange={(open) => !open && setForceTarget(null)}>
        <DialogContent className="w-[96vw] max-w-lg sm:max-w-lg md:max-w-xl bg-white rounded-2xl p-6 sm:p-7 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-rose-900 flex items-center gap-2 font-heading">
              <AlertTriangle className="w-5 h-5 text-rose-600" /> Confirm Emergency Force Dispatch
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs text-slate-700">
            <p>
              Are you sure you want to force dispatch <strong>Container {forceTarget?.containerNo}</strong> before cooling completes?
            </p>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
              Cooling is still in progress ({formatCountdown(forceTarget?.pluginReadyAt)}). An emergency force dispatch record and alert will be delivered to Main and Office Admin dashboards.
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForceTarget(null)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busyId === forceTarget?.id}
                onClick={() => {
                  if (forceTarget) {
                    runAction(forceTarget, "DISPATCH", true);
                    setForceTarget(null);
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold gap-1.5"
              >
                Yes, Force Dispatch Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── LEGACY PLUG-IN DIALOG ─── */}
      <Dialog open={Boolean(pluginTarget)} onOpenChange={(open) => !open && setPluginTarget(null)}>
        <DialogContent className="w-[96vw] max-w-lg sm:max-w-lg md:max-w-xl bg-white rounded-2xl p-6 sm:p-7 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2 font-heading">
              <PlugZap className="w-5 h-5 text-indigo-700" /> Plug-In Cooling — {pluginTarget?.containerNo}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <Label htmlFor="pluginHours" className="text-xs font-bold text-slate-700">Cooling Duration (Hours) *</Label>
              <Input
                id="pluginHours"
                type="number"
                min="1"
                max="72"
                value={pluginHours}
                onChange={(e) => setPluginHours(e.target.value)}
                className="mt-1 h-9"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPluginTarget(null)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busyId === pluginTarget?.id}
                onClick={handlePlugin}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                Start Cooling
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── CONTAINER DETAILS & HANDS BREAKDOWN MODAL ─── */}
      {selectedContainer && (
        <Dialog
          open={Boolean(selectedContainer)}
          onOpenChange={(open) => {
            if (!open) setSelectedContainer(null);
          }}
        >
          <DialogContent className="w-[96vw] max-w-3xl sm:max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2 font-heading">
                <Ship className="w-5 h-5 text-sky-700" /> Container {selectedContainer.containerNo} Details
              </DialogTitle>
              <Badge
                variant="outline"
                className={`text-xs font-bold px-2.5 py-0.5 border ${
                  STATUS_META[selectedContainer.status]?.className || ""
                }`}
              >
                {STATUS_META[selectedContainer.status]?.label || selectedContainer.status}
              </Badge>
            </DialogHeader>

            <div className="space-y-5 pt-3">
              {/* Linked Commercial Order Details */}
              {selectedContainer.order && (
                <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                      <PackageCheck className="w-4 h-4 text-blue-700" /> Linked Commercial Export Order
                    </span>
                    <Badge className="bg-blue-600 text-white font-bold text-[10px]">
                      {selectedContainer.order.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 block">Order Number</span>
                      <strong className="text-slate-800 font-mono">{selectedContainer.order.orderNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Buyer / Client</span>
                      <strong className="text-slate-800">{selectedContainer.order.buyerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Destination</span>
                      <strong className="text-slate-800">{selectedContainer.order.destination || "—"}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. Basic Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Container No</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{selectedContainer.containerNo}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Seal No</span>
                  <span className="font-mono font-bold text-slate-900">{selectedContainer.sealNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle No</span>
                  <span className="font-mono font-bold text-slate-900">{selectedContainer.vehicleNo}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Driver Mobile</span>
                  <span className="font-mono font-bold text-slate-900">{selectedContainer.mobMobile}</span>
                </div>
              </div>

              {/* 2. Process Dates & Timestamps */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-600" /> Process Timeline &amp; Dates
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-semibold">Load Request Raised:</span>
                    <span className="font-mono font-bold text-slate-900">{formatDateTime(selectedContainer.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-semibold">Loading Started:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedContainer.loadingStartedAt ? formatDateTime(selectedContainer.loadingStartedAt) : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-semibold">Work Done / Loaded:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedContainer.loadedAt ? formatDateTime(selectedContainer.loadedAt) : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 font-semibold">Sealed &amp; Dispatched:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedContainer.dispatchedAt ? formatDateTime(selectedContainer.dispatchedAt) : "Pending Departure"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Produce Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-1 border-b border-slate-200">
                  <span>Produce Load Lines</span>
                  <span>Quantity</span>
                </div>
                {selectedContainer.items.map((i, idx) => (
                  <div key={i.id || idx} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {formatBoxType(i.boxType)} · {i.brandName}
                    </span>
                    <span className="font-mono font-black text-slate-900">{i.quantity} boxes</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-xs font-bold">
                  <span className="text-slate-700">Total Produce</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {selectedContainer.items.reduce((s, i) => s + i.quantity, 0)} boxes
                  </span>
                </div>
              </div>

              {/* 4. Number of Hands Breakdown (4H, 5H, 6H, 7H, 8H) */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-700" /> Number of Hands Classification (4H, 5H, 6H, 7H, 8H)
                  </span>
                  <Badge variant="outline" className="bg-white text-indigo-900 border-indigo-300 text-[10px] font-bold">
                    Cold Storage Stock Available
                  </Badge>
                </div>
                <p className="text-[11px] text-indigo-800">
                  Hand size distribution for brand(s) loaded into this container:
                </p>
                {(() => {
                  const handsData = getHandsBreakdownForContainer(selectedContainer, allReceipts);
                  return (
                    <div className="grid grid-cols-5 gap-2 text-center">
                      <div className="bg-white p-2 rounded-lg border border-indigo-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">4H</span>
                        <span className="text-sm font-black text-slate-900 font-mono">{handsData.h4}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-indigo-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">5H</span>
                        <span className="text-sm font-black text-slate-900 font-mono">{handsData.h5}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-indigo-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">6H</span>
                        <span className="text-sm font-black text-slate-900 font-mono">{handsData.h6}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-indigo-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">7H</span>
                        <span className="text-sm font-black text-slate-900 font-mono">{handsData.h7}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-indigo-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">8H</span>
                        <span className="text-sm font-black text-slate-900 font-mono">{handsData.h8}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 5. Remarks */}
              {selectedContainer.remarks && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                  <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-700">Remarks / Instructions:</span>
                  <p className="mt-0.5">{selectedContainer.remarks}</p>
                </div>
              )}

              {/* 6. Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => shareReportMessage(buildMessage(selectedContainer), `Container ${selectedContainer.containerNo}`)}
                  className="rounded-xl gap-1.5 text-xs h-9 border-slate-300 font-bold"
                >
                  <Send className="w-3.5 h-3.5 text-slate-700" /> Share via WhatsApp / Copy
                </Button>

                <Button
                  size="sm"
                  onClick={() => setSelectedContainer(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs h-9 px-4 font-bold"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
