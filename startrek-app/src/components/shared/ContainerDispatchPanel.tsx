"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────
 * Container Dispatch (Out-flow)
 *
 * Admin raises a container load request → cold storage sees exactly what to
 * load → confirms "Loading Complete" → admin/office chooses to Plug In
 * (N hours of cooling; dispatch hard-blocked until it elapses) or Dispatch
 * immediately (sealed, with papers).
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
  /** Admins create containers. */
  canCreate: boolean;
  /** Cold storage confirms loading and performs the final dispatch. */
  canLoad: boolean;
  /** Admin / office decide plug-in vs immediate dispatch after loading. */
  canDecide: boolean;
  /** Cold storage receipts containing real-time room allocations */
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

  // "New container" form
  const [containerNo, setContainerNo] = useState("");
  const [sealNumber, setSealNumber] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [mobMobile, setMobMobile] = useState("");
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

  // Plug-in dialog
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
    // Refresh cold storage receipts if not loaded yet
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
          items: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create container");

      store.addContainerDispatch(data.dispatch);
      toast.success(`Container ${data.dispatch.containerNo} load request sent to Cold Storage`, {
        description: `${clean.length} box line${clean.length > 1 ? "s" : ""} (${totalPlannedBoxes} boxes) queued for loading.`,
      });
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
        toast.success(`Container ${container.containerNo} loading confirmed`, {
          description: "Admin & Office overview notified — awaiting plug-in or dispatch decision.",
        });
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

  const buildMessage = (c: ContainerDispatch) =>
    `*CONTAINER LOAD / DISPATCH*\n\n*Container No:* ${c.containerNo}\n*Seal No:* ${
      c.sealNumber
    }\n*Vehicle No:* ${c.vehicleNo}\n*Mobile:* ${c.mobMobile}\n*Status:* ${
      STATUS_META[c.status].label
    }\n\n*To Fill:*\n${c.items
      .map((i) => `• ${BOX_TYPE_LABELS[i.boxType]} — ${i.brandName}: ${i.quantity} boxes`)
      .join("\n")}\n\n*Total:* ${c.items.reduce((s, i) => s + i.quantity, 0)} boxes`;

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
                    <p className="font-black text-slate-900 font-mono text-base">{c.containerNo}</p>
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
                  Specify container shipping logistics, then select packed produce directly from live Cold Storage inventory.
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
                disabled={saving || availableBrands.length === 0 || totalPlannedBoxes <= 0}
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
