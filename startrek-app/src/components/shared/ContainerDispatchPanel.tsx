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
import { BOX_TYPE_LABELS, BRAND_NAMES, BoxType, ContainerDispatch } from "@/types";
import { shareReportMessage } from "@/lib/share";
import { toast } from "sonner";
import {
  Ship,
  Plus,
  Trash2,
  PackageCheck,
  PlugZap,
  Send,
  Clock,
  Lock,
  CheckCircle2,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────
 * Container Dispatch (Out-flow)
 *
 * Admin raises a container load request → cold storage sees exactly what to
 * load → confirms "Loading Complete" → admin/office chooses to Plug In
 * (N hours of cooling; dispatch hard-blocked until it elapses) or Dispatch
 * immediately (sealed, with papers).
 * ──────────────────────────────────────────────────────────────── */

const BOX_TYPE_OPTIONS = Object.keys(BOX_TYPE_LABELS) as BoxType[];

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
  title?: string;
  description?: string;
}
export function ContainerDispatchPanel({
  canCreate,
  canLoad,
  canDecide,
  title = "Container Dispatch (Out-flow)",
  description = "Load packed stock into export containers, then dispatch sealed with papers.",
}: Props) {
  const { containerDispatches } = useStartrekStore();

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
    // Re-read on mount so a refresh restores live container state
    fetchContainers();
    const id = window.setInterval(fetchContainers, 30_000);
    return () => window.clearInterval(id);
  }, [fetchContainers]);

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

  const handleCreate = async () => {
    const clean = items
      .map((i) => ({
        boxType: i.boxType,
        brandName: i.brandName,
        quantity: parseInt(i.quantity) || 0,
      }))
      .filter((i) => i.boxType && i.brandName && i.quantity > 0);

    if (!containerNo.trim() || !sealNumber.trim() || !vehicleNo.trim() || !mobMobile.trim()) {
      toast.error("Container No, Seal, Vehicle No and Mobile are all required.");
      return;
    }
    if (clean.length === 0) {
      toast.error("Add at least one box type with a brand and quantity.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/container-dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ containerNo, sealNumber, vehicleNo, mobMobile, items: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create container");

      store.addContainerDispatch(data.dispatch);
      toast.success(`Container ${data.dispatch.containerNo} load request sent to Cold Storage`, {
        description: `${clean.length} box line${clean.length > 1 ? "s" : ""} queued for loading.`,
      });
      setShowCreate(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create container");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (
    container: ContainerDispatch,
    action: "LOADING_COMPLETE" | "ALLOW_DISPATCH" | "DISPATCH"
  ) => {
    setBusyId(container.id);
    try {
      // DISPATCH lives on PUT (it performs the room-stock deduction inside a
      // transaction); the other actions are simple PATCH state transitions.
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
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Ship className="w-5 h-5 text-sky-700" /> {title}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{description}</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Container
          </Button>
        )}
      </div>

      {/* Notifications for admins / office */}
      {canDecide && (awaitingDecision.length > 0 || pendingLoad.length > 0) && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-900">
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
              ? "Add a container to tell Cold Storage exactly what to load."
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
                className="border-slate-200 bg-white rounded-2xl p-4 space-y-3 shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-slate-900 font-mono text-sm">{c.containerNo}</p>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Seal: <span className="font-mono">{c.sealNumber}</span> · Vehicle:{" "}
                      <span className="font-mono">{c.vehicleNo}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Mobile: <span className="font-mono">{c.mobMobile}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 border ${meta.className}`}>
                    {meta.label}
                  </Badge>
                </div>

                {/* What has to be loaded */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    To Fill
                  </span>
                  {c.items.map((i, idx) => (
                    <div key={i.id || idx} className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">
                        {BOX_TYPE_LABELS[i.boxType]} · {i.brandName}
                      </span>
                      <span className="font-mono font-black text-slate-900">{i.quantity} boxes</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                    <span className="font-bold text-slate-600">Total</span>
                    <span className="font-mono font-black text-emerald-700">{totalBoxes} boxes</span>
                  </div>
                </div>

                {locked && (
                  <p className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Plug-in cooling running —{" "}
                    {formatCountdown(c.pluginReadyAt)}
                  </p>
                )}
                {c.status === "PLUGIN_COOLING" && !locked && (
                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Cooling complete — ready to dispatch sealed
                    with papers.
                  </p>
                )}
                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                  {canLoad && c.status === "PENDING_LOADING" && (
                    <Button
                      size="sm"
                      disabled={busyId === c.id}
                      onClick={() => runAction(c, "LOADING_COMPLETE")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1.5 text-xs h-8"
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg gap-1.5 text-xs h-8"
                      >
                        <PlugZap className="w-3.5 h-3.5" /> Plug In
                      </Button>
                      <Button
                        size="sm"
                        disabled={busyId === c.id}
                        onClick={() => runAction(c, "ALLOW_DISPATCH")}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg gap-1.5 text-xs h-8"
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
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1.5 text-xs h-8"
                    >
                      <Send className="w-3.5 h-3.5" /> Dispatch Sealed With Papers
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => shareReportMessage(buildMessage(c), `Container ${c.containerNo}`)}
                    className="rounded-lg gap-1.5 text-xs h-8 border-slate-300 font-bold ml-auto"
                  >
                    <Send className="w-3.5 h-3.5" /> Share / Copy
                  </Button>
                </div>

                {c.dispatchedAt && (
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Dispatched: {new Date(c.dispatchedAt).toLocaleString("en-IN")}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Container Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Ship className="w-5 h-5 text-sky-700" /> Raise Container Load Request
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="containerNo" className="text-xs font-bold text-slate-700">Container Number *</Label>
                <Input
                  id="containerNo"
                  placeholder="e.g. MEDU1234567"
                  value={containerNo}
                  onChange={(e) => setContainerNo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sealNumber" className="text-xs font-bold text-slate-700">Seal Number *</Label>
                <Input
                  id="sealNumber"
                  placeholder="e.g. SL987654"
                  value={sealNumber}
                  onChange={(e) => setSealNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="vehicleNo" className="text-xs font-bold text-slate-700">Vehicle Number *</Label>
                <Input
                  id="vehicleNo"
                  placeholder="e.g. MH-12-AB-1234"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="mobMobile" className="text-xs font-bold text-slate-700">Driver Mobile (MOB) *</Label>
                <Input
                  id="mobMobile"
                  placeholder="e.g. +91 98765 43210"
                  value={mobMobile}
                  onChange={(e) => setMobMobile(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Load lines */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">Planned Load Lines *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setItems([...items, { boxType: "", brandName: "", quantity: "" }])}
                  className="h-7 text-xs rounded-lg gap-1 border-slate-300 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Line
                </Button>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-1/3">
                    <Select
                      value={it.boxType}
                      onValueChange={(val) => {
                        const next = [...items];
                        next[idx].boxType = val as BoxType;
                        setItems(next);
                      }}
                    >
                      <SelectTrigger className="h-9 bg-white text-xs">
                        <SelectValue placeholder="Box Size" />
                      </SelectTrigger>
                      <SelectContent>
                        {BOX_TYPE_OPTIONS.map((bt) => (
                          <SelectItem key={bt} value={bt} className="text-xs">
                            {BOX_TYPE_LABELS[bt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Input
                      placeholder="Brand Name (e.g. Orchard Banana)"
                      value={it.brandName}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx].brandName = e.target.value;
                        setItems(next);
                      }}
                      className="h-9 bg-white text-xs"
                    />
                  </div>

                  <div className="w-24">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={it.quantity}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx].quantity = e.target.value;
                        setItems(next);
                      }}
                      className="h-9 bg-white text-xs"
                    />
                  </div>

                  {items.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={handleCreate}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                {saving ? "Creating..." : "Submit Load Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plug-in Cooling Dialog */}
      <Dialog open={Boolean(pluginTarget)} onOpenChange={(open) => !open && setPluginTarget(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
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
                className="mt-1"
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
