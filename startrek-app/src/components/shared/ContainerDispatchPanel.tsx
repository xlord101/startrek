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
import { BOX_TYPE_LABELS, BoxType, ColdStorageReceipt, ContainerDispatch } from "@/types";
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
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────
 * Container Dispatch (Out-flow)
 *
 * Admin raises a container load request with Remarks and Dispatch Mode:
 * - Plug-in (Yes): sets departure dispatch time via 12-hour clock (container
 *   stays plugged in and cooling until departure time).
 * - Direct Dispatch: Cold storage admin is notified to dispatch immediately
 *   after loading completion without plug-in cooling delay.
 * ──────────────────────────────────────────────────────────────── */

const normalizeBoxType = (val?: string | null): BoxType | null => {
  if (!val) return null;
  const clean = val.replace(/^BOX_/, "").trim();
  if (clean in BOX_TYPE_LABELS) return clean as BoxType;
  return null;
};

const STATUS_META: Record<
  ContainerDispatch["status"],
  { label: string; className: string }
> = {
  PENDING_LOADING: {
    label: "Pending Loading",
    className: "bg-amber-50 text-amber-800 border-amber-300",
  },
  LOADED: {
    label: "Loaded — Awaiting Admin",
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
    label: "Dispatched (Sealed)",
    className: "bg-slate-100 text-slate-700 border-slate-300",
  },
};

type DraftItem = { boxType: BoxType | ""; brandName: string; quantity: string };

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

interface Props {
  canCreate: boolean;
  canLoad: boolean;
  canDecide: boolean;
  receipts?: ColdStorageReceipt[];
  title?: string;
  description?: string;
}

export function ContainerDispatchPanel({
  canCreate,
  canLoad,
  canDecide,
  receipts,
  title = "Container Dispatch (Out-flow)",
  description = "Load packed stock into export containers, then dispatch sealed with papers.",
}: Props) {
  const { containerDispatches, coldStorageReceipts } = useStartrekStore();
  const allReceipts: ColdStorageReceipt[] = receipts && receipts.length > 0 ? receipts : (coldStorageReceipts || []);

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // "New container" form state
  const [containerNo, setContainerNo] = useState("");
  const [sealNumber, setSealNumber] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [mobMobile, setMobMobile] = useState("");
  const [remarks, setRemarks] = useState("");
  const [dispatchMode, setDispatchMode] = useState<"PLUGIN" | "DIRECT" | null>(null);

  // 12-Hour Clock state for plug-in cooling target departure
  const [clockHour, setClockHour] = useState<number>(6);
  const [clockMinute, setClockMinute] = useState<number>(30);
  const [clockPeriod, setClockPeriod] = useState<"AM" | "PM">("PM");
  const [departureDay, setDepartureDay] = useState<"TODAY" | "TOMORROW">("TODAY");

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

  // List of brands that have at least 1 box stored in cold storage
  const availableBrands = useMemo(() => {
    return Object.keys(inventoryStock).filter((brand) => {
      return Object.values(inventoryStock[brand]).some((cnt) => cnt > 0);
    });
  }, [inventoryStock]);

  // Dynamically compute remaining available boxes for a specific line
  const getAvailableForLine = useCallback(
    (lineIdx: number, brandName: string, boxType: string) => {
      if (!brandName || !boxType) return 0;
      const totalStored = inventoryStock[brandName]?.[boxType] || 0;
      const usedInOtherLines = items.reduce((sum, line, idx) => {
        if (idx !== lineIdx && line.brandName === brandName && line.boxType === boxType) {
          return sum + (parseInt(line.quantity) || 0);
        }
        return sum;
      }, 0);
      return Math.max(0, totalStored - usedInOtherLines);
    },
    [inventoryStock, items]
  );

  const totalPlannedBoxes = useMemo(() => {
    return items.reduce((sum, it) => sum + (parseInt(it.quantity) || 0), 0);
  }, [items]);

  // Target departure date derived from 12-hour clock
  const targetDispatchDate = useMemo(() => {
    if (dispatchMode !== "PLUGIN") return null;
    const d = new Date();
    if (departureDay === "TOMORROW") {
      d.setDate(d.getDate() + 1);
    }
    let h24 = clockHour % 12;
    if (clockPeriod === "PM") h24 += 12;
    d.setHours(h24, clockMinute, 0, 0);
    return d;
  }, [dispatchMode, departureDay, clockHour, clockMinute, clockPeriod]);

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

  const pendingLoad = useMemo(
    () => containerDispatches.filter((c) => c.status === "PENDING_LOADING"),
    [containerDispatches]
  );
  const awaitingDecision = useMemo(
    () => containerDispatches.filter((c) => c.status === "LOADED"),
    [containerDispatches]
  );

  const resetForm = () => {
    setContainerNo("");
    setSealNumber("");
    setVehicleNo("");
    setMobMobile("");
    setRemarks("");
    setDispatchMode(null);
    setClockHour(6);
    setClockMinute(30);
    setClockPeriod("PM");
    setDepartureDay("TODAY");
    setItems([{ boxType: "", brandName: "", quantity: "" }]);
  };

  const handleBrandChange = (idx: number, newBrand: string) => {
    const next = [...items];
    next[idx] = {
      brandName: newBrand,
      boxType: "",
      quantity: "",
    };
    setItems(next);
  };

  const handleBoxTypeChange = (idx: number, newBoxType: BoxType) => {
    const next = [...items];
    next[idx] = {
      ...next[idx],
      boxType: newBoxType,
      quantity: "",
    };
    setItems(next);
  };

  const handleQuantityChange = (idx: number, val: string, maxAvail: number) => {
    const next = [...items];
    next[idx] = {
      ...next[idx],
      quantity: val,
    };
    setItems(next);
  };

  const handleCreate = async () => {
    if (!containerNo.trim() || !sealNumber.trim() || !vehicleNo.trim() || !mobMobile.trim()) {
      toast.error("Container No, Seal, Vehicle No and Mobile are all required.");
      return;
    }

    if (items.length === 0) {
      toast.error("Add at least one line with a brand and quantity.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.brandName || !it.boxType) {
        toast.error(`Line #${i + 1}: Please select both Brand Name and Box Size.`);
        return;
      }
      const qty = parseInt(it.quantity) || 0;
      if (qty <= 0) {
        toast.error(`Line #${i + 1} (${it.brandName}): Enter a valid quantity greater than 0.`);
        return;
      }
      const maxAvail = getAvailableForLine(i, it.brandName, it.boxType);
      if (qty > maxAvail) {
        toast.error(
          `Line #${i + 1} (${it.brandName}): Quantity ${qty} exceeds available stock of ${maxAvail} boxes.`
        );
        return;
      }
    }

    if (!dispatchMode) {
      toast.error("Please choose a Dispatch Mode: 'Plug-In (Yes)' or 'Direct Dispatch'.");
      return;
    }

    if (dispatchMode === "PLUGIN") {
      if (!targetDispatchDate) {
        toast.error("Please specify a departure dispatch time for plug-in cooling.");
        return;
      }
      if (coolingTimeDiff?.isPast) {
        toast.error(
          "Scheduled departure time is in the past. Please select a future time or toggle 'Tomorrow'."
        );
        return;
      }
    }

    const clean = items.map((i) => ({
      boxType: i.boxType as BoxType,
      brandName: i.brandName,
      quantity: parseInt(i.quantity) || 0,
    }));

    setSaving(true);
    try {
      const res = await fetch("/api/container-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          containerNo: containerNo.trim().toUpperCase(),
          sealNumber: sealNumber.trim().toUpperCase(),
          vehicleNo: vehicleNo.trim().toUpperCase(),
          mobMobile: mobMobile.trim(),
          remarks: remarks.trim(),
          dispatchMode,
          targetDispatchTime:
            dispatchMode === "PLUGIN" && targetDispatchDate
              ? targetDispatchDate.toISOString()
              : null,
          items: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create container");

      store.addContainerDispatch(data.dispatch);

      if (dispatchMode === "DIRECT") {
        toast.success(`Container ${data.dispatch.containerNo} load request sent: DIRECT DISPATCH`, {
          description: "Notification dispatched to Cold Storage Admin to dispatch immediately once loaded.",
        });
      } else {
        const timeStr = `${clockHour}:${clockMinute.toString().padStart(2, "0")} ${clockPeriod} (${
          departureDay === "TODAY" ? "Today" : "Tomorrow"
        })`;
        toast.success(`Container ${data.dispatch.containerNo} load request sent: PLUG-IN COOLING`, {
          description: `Container scheduled to cool until departure at ${timeStr}.`,
        });
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
    if (!confirm(`Are you sure you want to cancel and delete container request ${c.containerNo}?`)) {
      return;
    }
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

  const runAction = async (
    container: ContainerDispatch,
    action: "LOADING_COMPLETE" | "ALLOW_DISPATCH" | "DISPATCH"
  ) => {
    setBusyId(container.id);
    try {
      const res = await fetch("/api/container-dispatch", {
        method: action === "DISPATCH" ? "PUT" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, dispatchId: container.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      store.updateContainerDispatch(container.id, data.dispatch);
      if (action === "LOADING_COMPLETE") {
        if (container.dispatchMode === "DIRECT") {
          toast.success(`Container ${container.containerNo} loaded: DIRECT DISPATCH READY`, {
            description: "Ready for immediate sealed dispatch with papers.",
          });
        } else if (container.dispatchMode === "PLUGIN") {
          toast.success(`Container ${container.containerNo} loading confirmed: PLUG-IN STARTED`, {
            description: "Container is cooling at bay until scheduled departure time.",
          });
        } else {
          toast.success(`Container ${container.containerNo} loading confirmed`, {
            description: "Admin & Office overview notified — awaiting plug-in or dispatch decision.",
          });
        }
      } else if (action === "ALLOW_DISPATCH") {
        toast.success(`Dispatch permission sent for ${container.containerNo}`, {
          description: "Cold Storage is told to dispatch it sealed, with papers.",
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
        description: `Dispatch stays locked until ${new Date(
          data.dispatch.pluginReadyAt
        ).toLocaleString("en-IN")}. Cold storage is notified when it is ready.`,
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
        ? "🚀 DIRECT DISPATCH (Dispatch immediately after loading — No cooling required)"
        : c.dispatchMode === "PLUGIN" && c.targetDispatchTime
        ? `❄️ PLUG-IN COOLING (Departure scheduled: ${new Date(c.targetDispatchTime).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })})`
        : "STANDARD";

    return (
      `*CONTAINER LOAD & DISPATCH REQUEST*\n\n` +
      `*Container No:* ${c.containerNo}\n` +
      `*Seal No:* ${c.sealNumber}\n` +
      `*Vehicle No:* ${c.vehicleNo}\n` +
      `*Mobile:* ${c.mobMobile}\n` +
      `*Status:* ${STATUS_META[c.status].label}\n` +
      `*Dispatch Mode:* ${modeDesc}\n` +
      (c.remarks ? `*Remarks:* ${c.remarks}\n` : "") +
      `\n*Produce to Load:*\n` +
      c.items
        .map((i) => `• ${BOX_TYPE_LABELS[i.boxType]} — ${i.brandName}: ${i.quantity} boxes`)
        .join("\n") +
      `\n\n*Total Load:* ${c.items.reduce((s, i) => s + i.quantity, 0)} boxes\n\n` +
      (c.dispatchMode === "DIRECT"
        ? `⚠️ *URGENT NOTE FOR COLD STORAGE:* Dispatch immediately sealed with papers once loading completes!`
        : "")
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 font-heading">
            <Ship className="w-5 h-5 text-sky-700" /> {title}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{description}</p>
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

      {/* Notifications for admins / office */}
      {canDecide && (awaitingDecision.length > 0 || pendingLoad.length > 0) && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-900 space-y-1">
          {awaitingDecision.length > 0 && (
            <p>
              ● {awaitingDecision.length} container{awaitingDecision.length > 1 ? "s" : ""} loaded by
              Cold Storage — choose <strong>Plug In</strong> or <strong>Dispatch Now</strong>.
            </p>
          )}
          {pendingLoad.length > 0 && (
            <p className="text-sky-700 font-medium">
              ● {pendingLoad.length} container{pendingLoad.length > 1 ? "s" : ""} awaiting loading at
              Cold Storage.
            </p>
          )}
        </div>
      )}

      {containerDispatches.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white rounded-2xl p-8 text-center">
          <Ship className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-600">No containers raised yet</p>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {canCreate
              ? "Add a container to tell Cold Storage exactly what to load from stored inventory."
              : "No container load request has been raised yet."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {containerDispatches.map((c) => {
            const meta = STATUS_META[c.status];
            const locked = isPluginLocked(c);
            const totalBoxes = c.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <Card
                key={c.id}
                className="border-slate-200 bg-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
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
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      Seal: <span className="font-mono text-slate-800">{c.sealNumber}</span> · Vehicle:{" "}
                      <span className="font-mono text-slate-800">{c.vehicleNo}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Mobile: <span className="font-mono text-slate-800">{c.mobMobile}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 border ${meta.className}`}>
                    {meta.label}
                  </Badge>
                </div>

                {/* Remarks if present */}
                {c.remarks && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-700">
                      Remarks:
                    </span>
                    <p className="mt-0.5 italic">{c.remarks}</p>
                  </div>
                )}

                {/* What has to be loaded */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200">
                    <span>Produce Breakdown</span>
                    <span>Quantity</span>
                  </div>
                  {c.items.map((i, idx) => (
                    <div key={i.id || idx} className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">
                        {BOX_TYPE_LABELS[i.boxType]} · {i.brandName}
                      </span>
                      <span className="font-mono font-black text-slate-900">{i.quantity} boxes</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-xs">
                    <span className="font-bold text-slate-700">Total Load</span>
                    <span className="font-mono font-black text-emerald-700">{totalBoxes} boxes</span>
                  </div>
                </div>

                {/* Departure schedule info */}
                {c.targetDispatchTime && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Scheduled Departure:{" "}
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
                  <p className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Plug-in cooling running — {formatCountdown(c.pluginReadyAt)}
                  </p>
                )}
                {c.status === "PLUGIN_COOLING" && !locked && (
                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Cooling complete — ready to dispatch sealed with papers.
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  {canLoad && c.status === "PENDING_LOADING" && (
                    <Button
                      size="sm"
                      disabled={busyId === c.id}
                      onClick={() => runAction(c, "LOADING_COMPLETE")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1.5 text-xs h-8 shadow-xs"
                    >
                      <PackageCheck className="w-3.5 h-3.5" /> Loading Complete
                    </Button>
                  )}

                  {canDecide && c.status === "LOADED" && (
                    <>
                      <Button
                        size="sm"
                        disabled={busyId === c.id}
                        onClick={() => {
                          setPluginTarget(c);
                          setPluginHours("4");
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg gap-1.5 text-xs h-8 shadow-xs"
                      >
                        <PlugZap className="w-3.5 h-3.5" /> Plug In
                      </Button>
                      <Button
                        size="sm"
                        disabled={busyId === c.id}
                        onClick={() => runAction(c, "ALLOW_DISPATCH")}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg gap-1.5 text-xs h-8 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" /> Dispatch Now
                      </Button>
                    </>
                  )}

                  {canLoad && c.status === "READY_TO_DISPATCH" && (
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
                    onClick={() => shareReportMessage(buildMessage(c), `Container ${c.containerNo}`)}
                    className="rounded-lg gap-1.5 text-xs h-8 border-slate-300 font-bold"
                  >
                    <Send className="w-3.5 h-3.5" /> Share / Copy
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

                {c.dispatchedAt && (
                  <p className="text-[11px] text-slate-500 font-semibold pt-1">
                    Dispatched: {new Date(c.dispatchedAt).toLocaleString("en-IN")}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── CREATE CONTAINER DIALOG (RESPONSIVE & BOOTSTRAP-SIZED FOR PC & LAPTOPS) ─── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="w-[96vw] max-w-5xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2.5 font-heading">
                  <Ship className="w-6 h-6 text-sky-700" /> Raise Container Load Request
                </DialogTitle>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Specify transport details, select produce from cold storage inventory, and configure dispatch mode.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-3">
            {/* 1. Logistics Details */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                1. Container & Transport Logistics
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <Label htmlFor="containerNo" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-400" /> Container Number *
                  </Label>
                  <Input
                    id="containerNo"
                    placeholder="e.g. MEDU1234567"
                    value={containerNo}
                    onChange={(e) => setContainerNo(e.target.value.toUpperCase())}
                    className="mt-1 h-10 bg-white font-mono uppercase text-xs font-bold shadow-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="sealNumber" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" /> Seal Number *
                  </Label>
                  <Input
                    id="sealNumber"
                    placeholder="e.g. SL987654"
                    value={sealNumber}
                    onChange={(e) => setSealNumber(e.target.value.toUpperCase())}
                    className="mt-1 h-10 bg-white font-mono uppercase text-xs font-bold shadow-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="vehicleNo" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-400" /> Vehicle Number *
                  </Label>
                  <Input
                    id="vehicleNo"
                    placeholder="e.g. MH-12-AB-1234"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                    className="mt-1 h-10 bg-white font-mono uppercase text-xs font-bold shadow-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="mobMobile" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" /> Driver Mobile (MOB) *
                  </Label>
                  <Input
                    id="mobMobile"
                    placeholder="e.g. +91 98765 43210"
                    value={mobMobile}
                    onChange={(e) => setMobMobile(e.target.value)}
                    className="mt-1 h-10 bg-white font-mono text-xs font-bold shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Planned Load Lines from Stored Inventory */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                    2. Planned Load Lines (Cold Storage Inventory) *
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Select brand & box size from actual cold room inventory. Available stock is auto-fetched.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={availableBrands.length === 0}
                  onClick={() => setItems([...items, { boxType: "", brandName: "", quantity: "" }])}
                  className="h-8 text-xs rounded-xl gap-1.5 border-slate-300 font-bold hover:bg-slate-100"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Line
                </Button>
              </div>

              {availableBrands.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">No Produce Currently Allocated in Cold Rooms</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      All cold rooms are currently empty. Please verify gate intake and allocate produce to rooms before raising container load requests.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((it, idx) => {
                    const availableSizes = it.brandName
                      ? Object.keys(inventoryStock[it.brandName] || {}).filter(
                          (s) => (inventoryStock[it.brandName][s] || 0) > 0
                        )
                      : [];
                    const maxAvailable = getAvailableForLine(idx, it.brandName, it.boxType);
                    const qtyNum = parseInt(it.quantity) || 0;
                    const hasExceeded = qtyNum > maxAvailable;

                    return (
                      <div
                        key={idx}
                        className="p-3.5 sm:p-4 rounded-xl bg-slate-50/90 border border-slate-200 hover:border-slate-300 transition-colors space-y-3"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
                          <span className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-sky-600" /> Line #{idx + 1}
                          </span>
                          {items.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setItems(items.filter((_, i) => i !== idx))}
                              className="h-7 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove Line
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-start">
                          {/* Brand Dropdown */}
                          <div className="sm:col-span-5">
                            <Label className="text-xs font-bold text-slate-700 block mb-1">
                              Brand Name *
                            </Label>
                            <Select
                              value={it.brandName}
                              onValueChange={(val) => handleBrandChange(idx, val || "")}
                            >
                              <SelectTrigger className="h-10 bg-white text-xs font-semibold shadow-xs">
                                <SelectValue placeholder="Select Stored Brand" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableBrands.map((brand) => {
                                  const brandTotal = Object.values(
                                    inventoryStock[brand] || {}
                                  ).reduce((sum, v) => sum + v, 0);
                                  return (
                                    <SelectItem
                                      key={brand}
                                      value={brand}
                                      className="text-xs font-medium"
                                    >
                                      {brand} ({brandTotal} boxes in stock)
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Box Size Dropdown */}
                          <div className="sm:col-span-4">
                            <Label className="text-xs font-bold text-slate-700 block mb-1">
                              Box Size *
                            </Label>
                            <Select
                              value={it.boxType}
                              disabled={!it.brandName}
                              onValueChange={(val) => handleBoxTypeChange(idx, (val || "") as BoxType)}
                            >
                              <SelectTrigger className="h-10 bg-white text-xs font-semibold shadow-xs">
                                <SelectValue
                                  placeholder={
                                    !it.brandName ? "Select Brand First" : "Select Box Size"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {availableSizes.map((size) => {
                                  const stockForSize = inventoryStock[it.brandName]?.[size] || 0;
                                  const sizeLabel =
                                    BOX_TYPE_LABELS[size as BoxType] ||
                                    `${size.replace("_", ".")} kg`;
                                  return (
                                    <SelectItem
                                      key={size}
                                      value={size}
                                      className="text-xs font-medium"
                                    >
                                      {sizeLabel} ({stockForSize} boxes in stock)
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Quantity Input with Available Boxes count right above it */}
                          <div className="sm:col-span-3">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <Label className="text-xs font-bold text-slate-700">
                                Quantity *
                              </Label>
                              {it.brandName && it.boxType ? (
                                <span
                                  className={`font-black px-2 py-0.5 rounded-md text-[10px] ${
                                    maxAvailable > 0
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      : "bg-rose-50 text-rose-800 border border-rose-200"
                                  }`}
                                >
                                  Avail: {maxAvailable} bx
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px] italic">
                                  Select brand & size
                                </span>
                              )}
                            </div>
                            <Input
                              type="number"
                              min="1"
                              max={maxAvailable}
                              disabled={!it.brandName || !it.boxType || maxAvailable <= 0}
                              placeholder={
                                maxAvailable > 0 ? `Max ${maxAvailable}` : "0"
                              }
                              value={it.quantity}
                              onChange={(e) =>
                                handleQuantityChange(idx, e.target.value, maxAvailable)
                              }
                              className={`h-10 bg-white text-xs font-bold font-mono shadow-xs ${
                                hasExceeded
                                  ? "border-rose-500 focus-visible:ring-rose-500 text-rose-600 bg-rose-50/30"
                                  : ""
                              }`}
                            />
                            {hasExceeded && (
                              <p className="text-[10px] text-rose-600 font-bold mt-1">
                                Cannot exceed {maxAvailable} available boxes
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Summary Bar */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 text-white mt-3 shadow-sm">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block text-slate-300">
                        Total Planned Load
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {items.length} line{items.length > 1 ? "s" : ""} configured
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-2xl font-black text-emerald-400">
                        {totalPlannedBoxes}
                      </span>
                      <span className="text-xs text-slate-300 font-bold ml-1.5">Boxes</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Remarks Box below the lines */}
            <div className="space-y-1.5">
              <Label htmlFor="remarks" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" /> Remarks & Loading Instructions (Optional)
              </Label>
              <Textarea
                id="remarks"
                placeholder="e.g. Maintain temperature at 13.5°C before sealing, load export pallets in front bay, verify seal numbers..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="bg-white text-xs font-medium min-h-[64px] rounded-xl border-slate-200 shadow-xs"
              />
            </div>

            {/* 4. Dispatch Mode: Plug-In (Yes) vs Direct Dispatch */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> 3. Dispatch Mode Decision *
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Choose whether this container requires pre-cooling (plug-in) or direct immediate dispatch.
                  </p>
                </div>
                {dispatchMode && (
                  <button
                    type="button"
                    onClick={() => setDispatchMode(null)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline font-semibold"
                  >
                    Reset choice
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Button 1: Plug-In (Yes) */}
                <button
                  type="button"
                  onClick={() => setDispatchMode("PLUGIN")}
                  disabled={dispatchMode === "DIRECT"}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    dispatchMode === "PLUGIN"
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-sm cursor-default"
                      : dispatchMode === "DIRECT"
                      ? "border-slate-200 bg-slate-100/60 opacity-40 cursor-not-allowed"
                      : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-xs text-indigo-900 flex items-center gap-2">
                      <PlugZap className="w-4 h-4 text-indigo-600" /> Plug-In (Yes)
                    </span>
                    {dispatchMode === "PLUGIN" && (
                      <Badge className="bg-indigo-600 text-white text-[10px] font-black">Active</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Container will be plugged in and cooled at the cold storage bay until the scheduled departure time.
                  </p>
                </button>

                {/* Button 2: Direct Dispatch */}
                <button
                  type="button"
                  onClick={() => setDispatchMode("DIRECT")}
                  disabled={dispatchMode === "PLUGIN"}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    dispatchMode === "DIRECT"
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm cursor-default"
                      : dispatchMode === "PLUGIN"
                      ? "border-slate-200 bg-slate-100/60 opacity-40 cursor-not-allowed"
                      : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-xs text-emerald-900 flex items-center gap-2">
                      <Send className="w-4 h-4 text-emerald-600" /> Direct Dispatch
                    </span>
                    {dispatchMode === "DIRECT" && (
                      <Badge className="bg-emerald-600 text-white text-[10px] font-black">Active</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Immediate dispatch upon loading. Cold Storage Admin receives an immediate dispatch instruction notification.
                  </p>
                </button>
              </div>

              {/* 12-Hour Clock Interface (Expands when Plug-in is selected) */}
              {dispatchMode === "PLUGIN" && (
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-4 animate-in fade-in-50 duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                    <div>
                      <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-indigo-700" /> Scheduled Dispatch Departure Time (12-Hour Clock)
                      </span>
                      <p className="text-[11px] text-indigo-700/80 font-medium">
                        Container will remain plugged in and cooling till this exact departure time.
                      </p>
                    </div>
                    {/* Departure Day toggle */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-indigo-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setDepartureDay("TODAY")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          departureDay === "TODAY"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setDepartureDay("TOMORROW")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          departureDay === "TOMORROW"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Tomorrow
                      </button>
                    </div>
                  </div>

                  {/* Digital Clock Visual Display */}
                  <div className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-2xl shadow-inner">
                    <div className="text-center px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 min-w-[70px]">
                      <span className="text-3xl font-black font-mono tracking-wider">
                        {clockHour.toString().padStart(2, "0")}
                      </span>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 mt-0.5">Hour</span>
                    </div>
                    <span className="text-3xl font-black text-indigo-400 animate-pulse">:</span>
                    <div className="text-center px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 min-w-[70px]">
                      <span className="text-3xl font-black font-mono tracking-wider">
                        {clockMinute.toString().padStart(2, "0")}
                      </span>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 mt-0.5">Min</span>
                    </div>
                    <div className="flex flex-col gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => setClockPeriod("AM")}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                          clockPeriod === "AM"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setClockPeriod("PM")}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                          clockPeriod === "PM"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>

                  {/* Hour Buttons (1 to 12) */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      Select Hour (1 - 12):
                    </span>
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setClockHour(h)}
                          className={`h-9 rounded-xl text-xs font-black transition-all ${
                            clockHour === h
                              ? "bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-xs"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Minute Presets & Custom Minute Input */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                      Select Minutes:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {[0, 15, 30, 45].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setClockMinute(m)}
                          className={`h-9 px-4 rounded-xl text-xs font-black transition-all ${
                            clockMinute === m
                              ? "bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-xs"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          :{m.toString().padStart(2, "0")}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-xs text-slate-600 font-bold">Exact Min:</span>
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={clockMinute}
                          onChange={(e) => {
                            const val = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                            setClockMinute(val);
                          }}
                          className="h-9 w-16 bg-white font-mono text-xs font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cooling Duration Calculation Banner */}
                  {coolingTimeDiff?.isPast ? (
                    <div className="p-3 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-2">
                      <span className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                        Selected departure time ({clockHour}:{clockMinute.toString().padStart(2, "0")}{" "}
                        {clockPeriod} Today) is in the past.
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setDepartureDay("TOMORROW")}
                        className="h-7 text-xs bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg"
                      >
                        Switch to Tomorrow
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-indigo-100/60 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2 font-medium">
                      <PlugZap className="w-4 h-4 text-indigo-700 shrink-0" />
                      <span>
                        Container will remain <strong>plugged in and cooling for ~{coolingTimeDiff?.hours}h{" "}
                        {coolingTimeDiff?.minutes}m</strong> until scheduled departure at{" "}
                        <strong>
                          {clockHour}:{clockMinute.toString().padStart(2, "0")} {clockPeriod} (
                          {departureDay === "TODAY" ? "Today" : "Tomorrow"})
                        </strong>
                        .
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Direct Dispatch Notification Banner */}
              {dispatchMode === "DIRECT" && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 animate-in fade-in-50 duration-200">
                  <div className="flex items-start gap-2.5">
                    <Send className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-emerald-950">
                        Direct Dispatch Notification to Cold Storage Admin
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                        Submitting will send a high-priority dispatch alert to the Cold Storage Admin:{" "}
                        <strong>
                          “Container {containerNo || "—"} ({vehicleNo || "—"}): DISPATCH IMMEDIATELY once loaded. No plug-in cooling required.”
                        </strong>
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-[11px] font-mono text-emerald-900">
                    🔔 Notification: Direct dispatch confirmed. Once loading is complete, container will be promoted immediately for sealed exit with papers.
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="rounded-xl text-xs font-bold h-10 px-5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving || availableBrands.length === 0 || totalPlannedBoxes <= 0 || !dispatchMode}
                onClick={handleCreate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-10 px-6 gap-2 shadow-sm"
              >
                <Ship className="w-4 h-4" />
                {saving
                  ? "Creating..."
                  : `Submit Load Request (${totalPlannedBoxes} bx)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── PLUG-IN COOLING DIALOG ─── */}
      <Dialog open={Boolean(pluginTarget)} onOpenChange={(open) => !open && setPluginTarget(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2 font-heading">
              <PlugZap className="w-5 h-5 text-indigo-700" /> Plug-In Cooling — {pluginTarget?.containerNo}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Enter the required cooling duration in hours. The container dispatch button will be <strong>hard-locked</strong> until this cooling window finishes.
            </p>

            <div>
              <Label htmlFor="pluginHours" className="text-xs font-bold text-slate-700">Cooling Duration (Hours) *</Label>
              <Input
                id="pluginHours"
                type="number"
                min="1"
                max="72"
                value={pluginHours}
                onChange={(e) => setPluginHours(e.target.value)}
                className="mt-1 h-10"
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
                Start Plug-In Cooling
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
