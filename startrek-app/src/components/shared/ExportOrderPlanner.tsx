"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ExportOrder,
  ExportOrderItem,
  BoxType,
  BOX_TYPE_LABELS,
  ColdStorageReceipt,
  ContainerDispatch,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cleanBrandName } from "@/lib/brand";
import { shareReportMessage } from "@/lib/share";
import { store, useStartrekStore } from "@/lib/store";
import { toast } from "sonner";
import {
  PackageCheck,
  Plus,
  Trash2,
  Ship,
  Search,
  Calendar,
  Clock,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Truck,
  Layers,
  Send,
  Eye,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface PlannerProps {
  receipts?: ColdStorageReceipt[];
  onRaiseContainerForOrder?: (order: ExportOrder) => void;
}

type DraftOrderLine = {
  brandName: string;
  boxType: BoxType;
  quantity: string;
};

export function normalizeBoxTypeKey(val?: string | null): string {
  if (!val) return "13KG";
  const s = String(val).toUpperCase().replace(/^BOX_/, "").replace(/\s+/g, "").trim();
  if (s === "13.5KG" || s === "13_5KG" || s.includes("13.5") || s.includes("13_5")) return "13_5KG";
  if (s === "13KG" || /\b13\s*KG\b/i.test(s) || s === "13") return "13KG";
  if (s === "7KG" || /\b7\s*KG\b/i.test(s) || s === "7") return "7KG";
  if (s === "5KG" || /\b5\s*KG\b/i.test(s) || s === "5") return "5KG";
  if (s === "16KG" || /\b16\s*KG\b/i.test(s) || s === "16") return "16KG";
  if (/^\d+(\.\d+)?$/.test(s)) {
    const num = parseFloat(s);
    if (num >= 11 && num <= 16) return "13KG";
    if (num >= 6.5 && num <= 8.5) return "7KG";
    if (num >= 4 && num <= 5.8) return "5KG";
  }
  return "13KG";
}

export function normalizeBrandKey(val?: string | null): string {
  if (!val) return "";
  return cleanBrandName(val).toLowerCase().trim();
}

export function formatBoxTypeLabel(val?: string | null): string {
  const norm = normalizeBoxTypeKey(val) as BoxType;
  return BOX_TYPE_LABELS[norm] || `${norm.replace(/KG$/i, " kg")}`;
}

export function getStockForBrandAndType(
  stockMap: Record<string, Record<string, number>>,
  brandName: string,
  boxType: string
): number {
  const normBrand = normalizeBrandKey(brandName);
  const normType = normalizeBoxTypeKey(boxType);

  for (const [storedBrand, types] of Object.entries(stockMap)) {
    if (normalizeBrandKey(storedBrand) === normBrand) {
      // 1. Direct match on normalized box type
      for (const [storedType, qty] of Object.entries(types)) {
        if (normalizeBoxTypeKey(storedType) === normType) {
          return qty;
        }
      }
      // 2. Compatibility check: 13KG and 13.5KG are both standard export cartons
      if (normType === "13KG" || normType === "13_5KG") {
        for (const [storedType, qty] of Object.entries(types)) {
          const st = normalizeBoxTypeKey(storedType);
          if (st === "13KG" || st === "13_5KG") {
            return qty;
          }
        }
      }
      // 3. Fallback: if only one package type exists in storage for this brand, use it
      const allQtys = Object.values(types);
      const totalBrandStock = allQtys.reduce((sum, q) => sum + q, 0);
      if (totalBrandStock > 0 && allQtys.length === 1) {
        return totalBrandStock;
      }
    }
  }
  return 0;
}

export function ExportOrderPlanner({
  receipts,
  onRaiseContainerForOrder,
}: PlannerProps) {
  const { coldStorageReceipts, containerDispatches, exportOrders, boxBrands, brandStock } = useStartrekStore();
  const receiptsList: ColdStorageReceipt[] = useMemo(() => {
    return receipts && receipts.length > 0 ? receipts : (coldStorageReceipts || []);
  }, [receipts, coldStorageReceipts]);

  const [orders, setOrders] = useState<ExportOrder[]>(exportOrders || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_PROGRESS" | "COMPLETED">("ALL");

  // Create Order Dialog State
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [destination, setDestination] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [containerCapacity, setContainerCapacity] = useState("1500");
  const [lines, setLines] = useState<DraftOrderLine[]>([
    { brandName: "Joy Banana", boxType: "13KG", quantity: "" },
  ]);

  // Refresh cold storage receipts
  const fetchColdStorage = useCallback(async () => {
    try {
      const res = await fetch("/api/cold-storage");
      if (res.ok) {
        const data = await res.json();
        if (data?.receipts) {
          store.setColdStorageReceipts(data.receipts);
        }
      }
    } catch (e) {
      console.error("Failed to fetch cold storage in ExportOrderPlanner:", e);
    }
  }, []);

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        if (data?.orders) {
          setOrders(data.orders);
          store.setExportOrders(data.orders);
        }
      }
    } catch (err) {
      console.error("Failed to fetch export orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      await Promise.allSettled([fetchOrders(), fetchColdStorage()]);
      if (active) setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [fetchOrders, fetchColdStorage]);

  // Aggregate current live cold storage stock per (brand, boxType)
  const currentColdStock = useMemo(() => {
    const stockMap: Record<string, Record<string, number>> = {};
    const listToProcess = receiptsList.length > 0 ? receiptsList : (coldStorageReceipts || []);

    listToProcess.forEach((r) => {
      // 1. If receipt has allocations in cold rooms
      if (r.allocations && r.allocations.length > 0) {
        for (const a of r.allocations) {
          const count = a.boxCount || 0;
          if (count > 0) {
            const brand = cleanBrandName(a.brandName);
            const numWeight =
              typeof r.qualityReport?.boxWeightKg === "number"
                ? r.qualityReport.boxWeightKg
                : parseFloat(String(r.qualityReport?.boxWeightKg || ""));
            let boxType = "13KG";
            if (!isNaN(numWeight) && numWeight > 0) {
              if (numWeight >= 11 && numWeight <= 16) boxType = "13KG";
              else if (numWeight >= 6.5 && numWeight <= 8.5) boxType = "7KG";
              else if (numWeight >= 4 && numWeight <= 5.8) boxType = "5KG";
            } else {
              boxType = normalizeBoxTypeKey(a.boxType || r.boxType);
            }
            if (!stockMap[brand]) stockMap[brand] = {};
            stockMap[brand][boxType] = (stockMap[brand][boxType] || 0) + count;
          }
        }
        return;
      }

      // 2. Fallback to verified receipt level
      const rawBrand =
        r.qualityReport?.boxBrand ||
        r.billData?.orchardParticulars ||
        r.brandName ||
        r.harvestTask?.brandName ||
        "Star";
      const brand = cleanBrandName(rawBrand);

      const numWeight =
        typeof r.qualityReport?.boxWeightKg === "number"
          ? r.qualityReport.boxWeightKg
          : parseFloat(String(r.qualityReport?.boxWeightKg || ""));
      let boxType = "13KG";
      if (!isNaN(numWeight) && numWeight > 0) {
        if (numWeight >= 11 && numWeight <= 16) {
          boxType = "13KG";
        } else if (numWeight >= 6.5 && numWeight <= 8.5) {
          boxType = "7KG";
        } else if (numWeight >= 4 && numWeight <= 5.8) {
          boxType = "5KG";
        }
      } else {
        const rawBoxType = r.boxType || r.harvestTask?.selectedBoxTypes?.[0];
        boxType = normalizeBoxTypeKey(rawBoxType as string);
      }

      const verified = r.verifiedBoxCount || r.dispatchedTotalBoxes || 0;
      const damage = r.qualityReport?.damageBox || 0;
      const net = Math.max(0, verified - damage);

      if (net > 0) {
        if (!stockMap[brand]) stockMap[brand] = {};
        stockMap[brand][boxType] = (stockMap[brand][boxType] || 0) + net;
      }
    });

    return stockMap;
  }, [receiptsList, coldStorageReceipts]);

  // Available selectable brands dynamically derived from cold storage stock and inventory box brands
  const allKnownBrands = useMemo(() => {
    const set = new Set<string>();
    // 1. Brands with live stock in cold rooms
    Object.keys(currentColdStock).forEach((b) => set.add(b));
    // 2. Dynamic Box Brands configured in Inventory
    (boxBrands || []).forEach((b) => set.add(b.name));
    // 3. Dynamic Box Brand Stock entries
    (brandStock || []).forEach((s) => {
      if (s.brandName) set.add(s.brandName);
    });
    // Fallback if empty
    if (set.size === 0) {
      set.add("Joy Banana");
      set.add("Star");
    }
    return Array.from(set).sort();
  }, [currentColdStock, boxBrands, brandStock]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    let totalOrdered = 0;
    let totalDispatched = 0;
    let totalRemaining = 0;
    let totalShortfall = 0;

    orders.forEach((ord) => {
      ord.items.forEach((item) => {
        totalOrdered += item.quantity;
        // Total dispatched for this item in containers linked to this order
        const disp = (ord.dispatches || [])
          .filter((d) => d.status === "DISPATCHED" || d.status === "READY_TO_DISPATCH")
          .reduce((sum, d) => {
            const matchItem = d.items.find(
              (it) =>
                normalizeBrandKey(it.brandName) === normalizeBrandKey(item.brandName) &&
                normalizeBoxTypeKey(it.boxType) === normalizeBoxTypeKey(item.boxType)
            );
            return sum + (matchItem?.quantity || 0);
          }, 0);

        totalDispatched += disp;
        const rem = Math.max(0, item.quantity - disp);
        totalRemaining += rem;

        const liveStock = getStockForBrandAndType(currentColdStock, item.brandName, item.boxType);
        const gap = Math.max(0, rem - liveStock);
        totalShortfall += gap;
      });
    });

    const activeCount = orders.filter((o) => o.status === "IN_PROGRESS").length;
    const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
    const overallProgress = totalOrdered > 0 ? ((totalDispatched / totalOrdered) * 100).toFixed(0) : "0";
    const predictedContainers = Math.ceil(totalRemaining / 1500);

    return {
      activeCount,
      completedCount,
      totalOrdered,
      totalDispatched,
      totalRemaining,
      totalShortfall,
      overallProgress,
      predictedContainers,
    };
  }, [orders, currentColdStock]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (statusFilter !== "ALL" && ord.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = ord.orderNumber.toLowerCase().includes(q);
        const matchBuyer = ord.buyerName.toLowerCase().includes(q);
        const matchDest = (ord.destination || "").toLowerCase().includes(q);
        const matchRemarks = (ord.remarks || "").toLowerCase().includes(q);
        const matchItems = ord.items.some((i) => i.brandName.toLowerCase().includes(q));
        if (!matchNum && !matchBuyer && !matchDest && !matchRemarks && !matchItems) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const handleCreateOrder = async () => {
    if (!buyerName.trim()) {
      toast.error("Enter Order Name / Client name");
      return;
    }
    const cleanItems = lines
      .map((l) => ({
        brandName: cleanBrandName(l.brandName),
        boxType: l.boxType,
        quantity: parseInt(l.quantity) || 0,
      }))
      .filter((l) => l.quantity > 0);

    if (cleanItems.length === 0) {
      toast.error("Add at least one line with a valid quantity");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerName: buyerName.trim(),
          destination: destination.trim(),
          targetDate: targetDate || null,
          remarks: remarks.trim(),
          containerCapacity: parseInt(containerCapacity) || 1500,
          items: cleanItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      toast.success(`Export Order "${data.order.buyerName}" Registered!`, {
        description: `Order "${data.order.buyerName}" saved. Live stock gap prediction active.`,
      });

      setShowCreate(false);
      resetCreateForm();
      fetchOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create order");
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setBuyerName("");
    setDestination("");
    setTargetDate("");
    setRemarks("");
    setContainerCapacity("1500");
    setLines([{ brandName: "Joy Banana", boxType: "13KG", quantity: "" }]);
  };

  const handleToggleStatus = async (order: ExportOrder) => {
    const nextStatus = order.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update order status");
      toast.success(`Order "${order.buyerName}" marked as ${nextStatus}!`);
      fetchOrders();
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete order");
      toast.success("Order deleted successfully");
      fetchOrders();
    } catch (e) {
      toast.error("Failed to delete order");
    }
  };

  const shareOrderWhatsApp = (order: ExportOrder) => {
    const totalOrd = order.items.reduce((s, i) => s + i.quantity, 0);
    const totalDisp = (order.dispatches || [])
      .filter((d) => d.status === "DISPATCHED" || d.status === "READY_TO_DISPATCH")
      .reduce((sum, d) => sum + d.items.reduce((s, it) => s + it.quantity, 0), 0);
    const rem = Math.max(0, totalOrd - totalDisp);
    const progress = totalOrd > 0 ? ((totalDisp / totalOrd) * 100).toFixed(0) : "0";

    const text = `*KD EXPORT — ORDER FULFILLMENT REPORT*
*Order Name:* ${order.buyerName}
${order.destination ? `*Destination:* ${order.destination}\n` : ""}*Target Shipping:* ${order.targetDate ? new Date(order.targetDate).toLocaleDateString("en-IN") : "Flexible"}
*Status:* ${order.status === "COMPLETED" ? "✅ COMPLETED" : "⏳ IN FULFILLMENT"}

*Progress:* ${progress}% (${totalDisp} / ${totalOrd} boxes dispatched)
*Remaining to Ship:* ${rem} boxes

*ORDER LINES:*
${order.items.map((i) => `• ${formatBoxTypeLabel(i.boxType)} ${i.brandName}: ${i.quantity} boxes`).join("\n")}

*CONTAINERS DISPATCHED:*
${(order.dispatches || []).length > 0 ? (order.dispatches || []).map((d) => `• Container ${d.containerNo} (${d.status})`).join("\n") : "No containers dispatched yet"}`;

    shareReportMessage(text, `Order ${order.buyerName}`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 font-heading flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-indigo-700" />
            Export Orders &amp; Stock Fulfillment Planner
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Smart prediction engine: compares customer orders against live cold storage stock and calculates container capacity
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> Create Export Order
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            className="h-9 px-2.5 rounded-xl border-slate-300 text-slate-600 hover:text-slate-900"
            title="Refresh order metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Active Orders
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 font-heading">
              {kpiStats.activeCount}
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">
              ({kpiStats.completedCount} completed)
            </span>
          </div>
          <span className="text-[10px] text-indigo-700 font-bold block mt-1">
            In Fulfillment
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Ordered
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 font-mono font-heading">
              {kpiStats.totalOrdered}
            </span>
            <span className="text-xs text-slate-400 font-semibold">bx</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block mt-1">
            Across All Lines
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Dispatched Produce
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-mono font-heading">
              {kpiStats.totalDispatched}
            </span>
            <span className="text-xs text-emerald-700 font-bold">
              ({kpiStats.overallProgress}%)
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
            Fulfilled via Containers
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Shortfall (Boxes Needed)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600 font-mono font-heading">
              {kpiStats.totalShortfall}
            </span>
            <span className="text-xs text-amber-700 font-semibold">bx</span>
          </div>
          <span className="text-[10px] text-amber-700 font-bold block mt-1">
            {kpiStats.totalShortfall > 0 ? "⚠️ Need to Harvest / Restock" : "✅ 100% Ready in Cold Storage"}
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Containers Needed
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-sky-700 font-mono font-heading">
              ~{kpiStats.predictedContainers}
            </span>
            <span className="text-xs text-sky-800 font-semibold">Reefers</span>
          </div>
          <span className="text-[10px] text-sky-700 font-semibold block mt-1">
            Standard ~1,500 bx / reefer
          </span>
        </Card>
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search orders by Order #, Buyer Name, Destination, Brand..."
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

          <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-xl">
            {[
              { key: "ALL", label: "All Orders", count: orders.length },
              { key: "IN_PROGRESS", label: "In Fulfillment", count: kpiStats.activeCount },
              { key: "COMPLETED", label: "Completed", count: kpiStats.completedCount },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === tab.key
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Orders List & Prediction Matrices */}
      {filteredOrders.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white rounded-2xl p-10 text-center space-y-2">
          <PackageCheck className="w-9 h-9 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No export orders found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No orders matching "${searchQuery}".`
              : "Create an export order to track incoming harvest stock against buyer volume."}
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs h-8 px-4 mt-2"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Create First Order
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((ord) => {
            const totalOrdered = ord.items.reduce((s, i) => s + i.quantity, 0);
            const capacity = ord.containerCapacity || 1500;

            // Total dispatched across containers linked to this order
            const linkedDispatches = ord.dispatches || [];
            const completedDispatches = linkedDispatches.filter(
              (d) => d.status === "DISPATCHED" || d.status === "READY_TO_DISPATCH"
            );
            const totalDispatched = completedDispatches.reduce(
              (sum, d) => sum + d.items.reduce((s, it) => s + it.quantity, 0),
              0
            );

            const remainingBoxes = Math.max(0, totalOrdered - totalDispatched);
            const progressPercent =
              totalOrdered > 0 ? Math.min(100, Math.round((totalDispatched / totalOrdered) * 100)) : 0;
            const isCompleted = ord.status === "COMPLETED";

            // Detailed per-line calculations
            const lineStats = ord.items.map((it) => {
              const itDispatched = completedDispatches.reduce((sum, d) => {
                const m = d.items.find(
                  (cIt) =>
                    normalizeBrandKey(cIt.brandName) === normalizeBrandKey(it.brandName) &&
                    normalizeBoxTypeKey(cIt.boxType) === normalizeBoxTypeKey(it.boxType)
                );
                return sum + (m?.quantity || 0);
              }, 0);

              const itRemaining = Math.max(0, it.quantity - itDispatched);
              const coldStock = getStockForBrandAndType(currentColdStock, it.brandName, it.boxType);
              const harvestDeficit = Math.max(0, itRemaining - coldStock);
              const containersForLine = Math.ceil(itRemaining / capacity);

              return {
                it,
                itDispatched,
                itRemaining,
                coldStock,
                harvestDeficit,
                containersForLine,
              };
            });

            const totalOrderColdStock = lineStats.reduce((sum, l) => sum + Math.min(l.coldStock, l.itRemaining), 0);
            const totalOrderShortfall = lineStats.reduce((sum, l) => sum + l.harvestDeficit, 0);
            const totalContainersReq = Math.ceil(remainingBoxes / capacity);

            return (
              <Card
                key={ord.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isCompleted
                    ? "bg-slate-50/70 border-slate-200"
                    : "bg-white border-slate-200 shadow-card hover:border-slate-300"
                }`}
              >
                {/* ─── ORDER HEADER ─── */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading">
                        {ord.buyerName}
                      </h3>
                      {ord.destination && (
                        <Badge
                          variant="outline"
                          className="bg-slate-50 text-slate-700 border-slate-300 text-xs font-bold"
                        >
                          Port: {ord.destination}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs font-black uppercase ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-indigo-50 text-indigo-800 border-indigo-300"
                        }`}
                      >
                        {isCompleted ? "Completed" : "In Fulfillment"}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 font-medium mt-1.5 flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Order Date: {new Date(ord.orderDate).toLocaleDateString("en-IN")}
                      </span>
                      {ord.targetDate && (
                        <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          Target Departure: {new Date(ord.targetDate).toLocaleDateString("en-IN")}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!isCompleted && onRaiseContainerForOrder && (
                      <Button
                        size="sm"
                        onClick={() => onRaiseContainerForOrder(ord)}
                        className="bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs h-9 px-3.5 rounded-xl gap-1.5 shadow-xs"
                      >
                        <Ship className="w-3.5 h-3.5" /> Dispatch Container
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => shareOrderWhatsApp(ord)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 px-3 rounded-xl gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-500" /> WhatsApp
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStatus(ord)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 h-9 px-3 rounded-xl"
                    >
                      {isCompleted ? "Re-open" : "Mark Done"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteOrder(ord.id)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-9 px-2.5 rounded-xl"
                      title="Delete order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* ─── 4 BIG PROMINENT METRIC CARDS (NO SMALL SUBSCRIPTS!) ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100">
                  {/* Total Ordered */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Ordered
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-slate-900 font-mono font-heading">
                        {totalOrdered.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-600 font-bold">boxes</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                      Client order volume
                    </span>
                  </div>

                  {/* Available in Cold Storage */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      In Cold Room Stock
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-emerald-600 font-mono font-heading">
                        {totalOrderColdStock.toLocaleString()}
                      </span>
                      <span className="text-xs text-emerald-700 font-bold">boxes</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                      Live verified stock
                    </span>
                  </div>

                  {/* Shortfall / Required Boxes to Harvest */}
                  <div
                    className={`p-3.5 rounded-xl border shadow-2xs ${
                      totalOrderShortfall > 0
                        ? "bg-amber-50/90 border-amber-300 ring-2 ring-amber-300/30"
                        : "bg-emerald-50/80 border-emerald-300"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider block ${
                        totalOrderShortfall > 0 ? "text-amber-800" : "text-emerald-800"
                      }`}
                    >
                      {totalOrderShortfall > 0 ? "⚠️ Required to Harvest" : "✓ Stock Status"}
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span
                        className={`text-2xl sm:text-3xl font-black font-mono font-heading ${
                          totalOrderShortfall > 0 ? "text-amber-950" : "text-emerald-950"
                        }`}
                      >
                        {totalOrderShortfall > 0 ? totalOrderShortfall.toLocaleString() : "0"}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          totalOrderShortfall > 0 ? "text-amber-900" : "text-emerald-900"
                        }`}
                      >
                        boxes needed
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold block mt-0.5 ${
                        totalOrderShortfall > 0 ? "text-amber-800" : "text-emerald-700"
                      }`}
                    >
                      {totalOrderShortfall > 0
                        ? "Shortfall pending from harvest"
                        : "100% stock ready in cold room"}
                    </span>
                  </div>

                  {/* Containers Required */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Containers Needed
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-sky-800 font-mono font-heading">
                        ~{totalContainersReq}
                      </span>
                      <span className="text-xs text-sky-900 font-bold">
                        Container{totalContainersReq === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span className="text-[10px] text-sky-700 font-semibold block mt-0.5">
                      At {capacity.toLocaleString()} bx / container
                    </span>
                  </div>
                </div>

                {/* ─── PROGRESS STRIP ─── */}
                <div className="px-4 sm:px-5 py-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">Dispatched:</span>
                      <span className="font-mono text-emerald-700 font-black">
                        {progressPercent}% ({totalDispatched.toLocaleString()} / {totalOrdered.toLocaleString()} boxes)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs">
                    <span className="text-slate-500 font-semibold block">Remaining to Dispatch:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {remainingBoxes.toLocaleString()} <span className="text-xs font-bold text-slate-500">boxes</span>
                    </span>
                  </div>
                </div>

                {/* ─── PRODUCE LINES BREAKDOWN (CLEAN & SPACIOUS) ─── */}
                <div className="p-4 sm:p-5 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Produce Items in this Order ({lineStats.length})
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      Reefer Container Size: <strong>{capacity.toLocaleString()} boxes</strong>
                    </span>
                  </div>

                  <div className="space-y-3">
                    {lineStats.map(
                      ({ it, itDispatched, itRemaining, coldStock, harvestDeficit, containersForLine }) => (
                        <div
                          key={it.id}
                          className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3 hover:border-slate-300 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm sm:text-base font-black text-slate-900 font-heading">
                                {it.brandName}
                              </span>
                              <Badge
                                variant="outline"
                                className="bg-white text-slate-800 border-slate-300 text-xs font-bold"
                              >
                                {formatBoxTypeLabel(it.boxType)}
                              </Badge>
                            </div>

                            {/* Shortfall vs Ready Banner */}
                            {itRemaining === 0 ? (
                              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-bold gap-1 w-fit">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Line Fully Dispatched
                              </Badge>
                            ) : harvestDeficit > 0 ? (
                              <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-xs font-black px-3 py-1 gap-1.5 w-fit shadow-2xs">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                Shortfall: {harvestDeficit.toLocaleString()} boxes needed to harvest
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-950 border-emerald-300 text-xs font-black px-3 py-1 gap-1.5 w-fit shadow-2xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Stock Ready ({coldStock.toLocaleString()} available covers all{" "}
                                {itRemaining.toLocaleString()} bx)
                              </Badge>
                            )}
                          </div>

                          {/* 4 Quantities Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                                Ordered
                              </span>
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                {it.quantity.toLocaleString()} bx
                              </span>
                            </div>
                            <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                              <span className="text-[10px] font-semibold text-emerald-700 uppercase block">
                                In Cold Room
                              </span>
                              <span className="font-mono font-bold text-emerald-800 text-sm">
                                {coldStock > 0 ? `${coldStock.toLocaleString()} bx` : "0 bx"}
                              </span>
                            </div>
                            <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-200">
                              <span className="text-[10px] font-semibold text-blue-700 uppercase block">
                                Dispatched
                              </span>
                              <span className="font-mono font-bold text-blue-800 text-sm">
                                {itDispatched.toLocaleString()} bx
                              </span>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                                Remaining
                              </span>
                              <span className="font-mono font-black text-slate-900 text-sm">
                                {itRemaining.toLocaleString()} bx
                              </span>
                            </div>
                          </div>

                          {/* Shortfall Harvest Callout */}
                          {harvestDeficit > 0 && itRemaining > 0 && (
                            <div className="p-3 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span>
                                Cold storage currently has{" "}
                                <strong className="text-slate-900">{coldStock.toLocaleString()} boxes</strong>. You need{" "}
                                <strong className="text-amber-900 underline decoration-amber-500 font-black text-sm">
                                  {harvestDeficit.toLocaleString()} more boxes
                                </strong>{" "}
                                from upcoming orchard harvest to fulfill this line.
                              </span>
                              <span className="text-xs font-mono font-bold text-sky-800 shrink-0 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                                ~{containersForLine} Container{containersForLine === 1 ? "" : "s"}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* ─── LINKED CONTAINERS STRIP ─── */}
                {linkedDispatches.length > 0 && (
                  <div className="p-3 sm:px-5 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Dispatched Containers:
                    </span>
                    {linkedDispatches.map((d) => (
                      <Badge
                        key={d.id}
                        variant="outline"
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 ${
                          d.status === "DISPATCHED"
                            ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                            : "bg-blue-50 text-blue-900 border-blue-300"
                        }`}
                      >
                        {d.containerNo} ({d.items.reduce((s, i) => s + i.quantity, 0)} bx) · {d.status}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── CREATE NEW EXPORT ORDER DIALOG ─── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="w-[96vw] max-w-3xl sm:max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-7 shadow-2xl border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2 font-heading">
              <PackageCheck className="w-5 h-5 text-indigo-700" /> Create Commercial Export Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {/* Buyer & Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Order Name / Client *</Label>
                <Input
                  placeholder="e.g. Dubai Export Order - 3000 Boxes"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="mt-1 h-9 bg-white text-xs font-bold shadow-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Destination Port / Country</Label>
                <Input
                  placeholder="e.g. Jebel Ali Port, Dubai, UAE"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="mt-1 h-9 bg-white text-xs font-medium shadow-xs"
                />
              </div>
            </div>

            {/* Target Date & Container Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Target Shipping Date</Label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1 h-9 bg-white text-xs font-semibold shadow-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Boxes per Container (Single Container Capacity)
                </Label>
                <Input
                  type="number"
                  min="500"
                  max="3000"
                  value={containerCapacity}
                  onChange={(e) => setContainerCapacity(e.target.value)}
                  placeholder="1500"
                  className="mt-1 h-9 bg-white text-xs font-mono font-bold shadow-xs"
                />
                <span className="text-[10px] text-slate-500 font-medium block mt-1">
                  Standard 40ft reefer container holds ~1,500 boxes.
                </span>
              </div>
            </div>

            {/* Dynamic Container Calculation Preview */}
            {(() => {
              const draftTotal = lines.reduce((s, l) => s + (parseInt(l.quantity) || 0), 0);
              const cap = parseInt(containerCapacity) || 1500;
              const reqContainers = draftTotal > 0 ? Math.ceil(draftTotal / cap) : 0;

              return (
                <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
                      Container Calculation Preview
                    </span>
                    <span className="text-sm font-black text-slate-900 font-heading">
                      Total Order: {draftTotal.toLocaleString()} boxes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-semibold">
                      ÷ {cap.toLocaleString()} bx / container =
                    </span>
                    <Badge className="bg-sky-900 text-white font-mono font-black text-xs px-2.5 py-1">
                      ~{reqContainers} Container{reqContainers === 1 ? "" : "s"} Needed
                    </Badge>
                  </div>
                </div>
              );
            })()}

            {/* Produce Order Lines */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-800">
                  Produce Order Lines (Select Brands &amp; Box Sizes)
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setLines([...lines, { brandName: "Joy Banana", boxType: "13KG", quantity: "" }])
                  }
                  className="h-7 text-xs rounded-lg gap-1 border-slate-300 font-bold hover:bg-slate-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Line
                </Button>
              </div>

              <div className="space-y-2.5">
                {lines.map((line, idx) => {
                  const availableSizes: BoxType[] = ["7KG", "13KG", "13_5KG", "16KG"];
                  const currentStock = getStockForBrandAndType(currentColdStock, line.brandName, line.boxType);
                  const qty = parseInt(line.quantity) || 0;
                  const deficit = Math.max(0, qty - currentStock);

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600">Line #{idx + 1}</span>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setLines(lines.filter((_, i) => i !== idx))}
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
                            value={line.brandName}
                            onValueChange={(val: any) => {
                              const copy = [...lines];
                              copy[idx].brandName = val || "";
                              setLines(copy);
                            }}
                          >
                            <SelectTrigger className="h-9 bg-white text-xs font-medium shadow-xs">
                              <SelectValue placeholder="Select Brand" />
                            </SelectTrigger>
                            <SelectContent>
                              {allKnownBrands.map((b) => (
                                <SelectItem key={b} value={b} className="text-xs">
                                  {b}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Box Size */}
                        <div className="sm:col-span-4">
                          <Label className="text-[11px] font-semibold text-slate-700 block mb-1">Box Size *</Label>
                          <Select
                            value={line.boxType}
                            onValueChange={(val: any) => {
                              const copy = [...lines];
                              copy[idx].boxType = (val as BoxType) || "13KG";
                              setLines(copy);
                            }}
                          >
                            <SelectTrigger className="h-9 bg-white text-xs font-medium shadow-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSizes.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {formatBoxTypeLabel(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-3">
                          <Label className="text-[11px] font-semibold text-slate-700 block mb-1">
                            Ordered Qty (bx) *
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="e.g. 1500"
                            value={line.quantity}
                            onChange={(e) => {
                              const copy = [...lines];
                              copy[idx].quantity = e.target.value;
                              setLines(copy);
                            }}
                            className="h-9 bg-white font-mono text-xs font-bold shadow-xs"
                          />
                        </div>
                      </div>

                      {/* Live Stock Comparison Notice */}
                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                        <span>
                          Current in cold room: <strong>{currentStock} boxes</strong>
                        </span>
                        {qty > 0 && (
                          <span
                            className={`font-semibold ${
                              deficit > 0 ? "text-amber-700" : "text-emerald-700"
                            }`}
                          >
                            {deficit > 0
                              ? `Deficit: ${deficit} bx to arrive from harvest`
                              : "✓ Fully available in cold storage"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Remarks / Instructions (Optional)</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Export pack with foam, temperature strictly 13.5°C before sealing..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="mt-1 bg-white text-xs"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                className="rounded-xl text-xs font-bold h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={handleCreateOrder}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold h-9 px-5 gap-1.5 shadow-sm"
              >
                {saving ? "Saving Order..." : "Register Export Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
