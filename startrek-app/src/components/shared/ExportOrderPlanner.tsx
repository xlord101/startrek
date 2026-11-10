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

export function ExportOrderPlanner({
  receipts,
  onRaiseContainerForOrder,
}: PlannerProps) {
  const { coldStorageReceipts, containerDispatches, exportOrders } = useStartrekStore();
  const allReceipts = receipts && receipts.length > 0 ? receipts : (coldStorageReceipts || []);

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
    fetchOrders();
  }, [fetchOrders]);

  // Aggregate current live cold storage stock per (brand, boxType)
  const currentColdStock = useMemo(() => {
    const stockMap: Record<string, Record<string, number>> = {};
    allReceipts.forEach((r) => {
      const rawBrand =
        r.qualityReport?.boxBrand ||
        r.billData?.orchardParticulars ||
        r.brandName ||
        "Star";
      const brand = cleanBrandName(rawBrand);
      const rawParticular = String(r.billData?.orchardParticulars || "");
      const rawBoxType = String(r.boxType || "");
      const is7kg =
        rawBrand.includes("7") ||
        rawParticular.includes("7") ||
        rawBoxType.includes("7");
      const boxType: BoxType = is7kg ? "7KG" : "13KG";

      const verified = r.verifiedBoxCount || r.dispatchedTotalBoxes || 0;
      const damage = r.qualityReport?.damageBox || 0;
      const net = Math.max(0, verified - damage);

      if (!stockMap[brand]) stockMap[brand] = {};
      stockMap[brand][boxType] = (stockMap[brand][boxType] || 0) + net;
    });
    return stockMap;
  }, [allReceipts]);

  // Available selectable brands (including 0-stock ones)
  const allKnownBrands = [
    "Joy Banana",
    "Star",
    "Sunstar",
    "New Premium",
    "Premium",
    "Golden Sparrow",
    "Green Gold Export",
    "Kiran Doke Royal",
  ];

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
              (it) => it.brandName.toLowerCase() === item.brandName.toLowerCase() && it.boxType === item.boxType
            );
            return sum + (matchItem?.quantity || 0);
          }, 0);

        totalDispatched += disp;
        const rem = Math.max(0, item.quantity - disp);
        totalRemaining += rem;

        const liveStock = currentColdStock[item.brandName]?.[item.boxType] || 0;
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
      toast.error("Enter Buyer / Customer name");
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

      toast.success(`Export Order ${data.order.orderNumber} Registered!`, {
        description: `Order for ${data.order.buyerName} saved. Live stock gap prediction active.`,
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
      toast.success(`Order ${order.orderNumber} marked as ${nextStatus}!`);
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
*Order:* ${order.orderNumber}
*Buyer:* ${order.buyerName}
${order.destination ? `*Destination:* ${order.destination}\n` : ""}*Target Shipping:* ${order.targetDate ? new Date(order.targetDate).toLocaleDateString("en-IN") : "Flexible"}
*Status:* ${order.status === "COMPLETED" ? "✅ COMPLETED" : "⏳ IN FULFILLMENT"}

*Progress:* ${progress}% (${totalDisp} / ${totalOrd} boxes dispatched)
*Remaining to Ship:* ${rem} boxes

*ORDER LINES:*
${order.items.map((i) => `• ${BOX_TYPE_LABELS[i.boxType]} ${i.brandName}: ${i.quantity} boxes`).join("\n")}

*CONTAINERS DISPATCHED:*
${(order.dispatches || []).length > 0 ? (order.dispatches || []).map((d) => `• Container ${d.containerNo} (${d.status})`).join("\n") : "No containers dispatched yet"}`;

    shareReportMessage(text, `Order ${order.orderNumber}`);
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
            Harvest Deficit Gap
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600 font-mono font-heading">
              {kpiStats.totalShortfall}
            </span>
            <span className="text-xs text-amber-700 font-semibold">bx</span>
          </div>
          <span className="text-[10px] text-amber-700 font-bold block mt-1">
            {kpiStats.totalShortfall > 0 ? "Need to Harvest / Restock" : "Ready in Cold Room"}
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Containers Required
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-sky-700 font-mono font-heading">
              ~{kpiStats.predictedContainers}
            </span>
            <span className="text-xs text-sky-800 font-semibold">Reefers</span>
          </div>
          <span className="text-[10px] text-sky-700 font-semibold block mt-1">
            Based on ~1,500 bx/reefer
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
        <div className="space-y-4">
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

            return (
              <Card
                key={ord.id}
                className={`rounded-2xl border transition-all ${
                  isCompleted
                    ? "bg-slate-50/70 border-slate-200"
                    : "bg-white border-slate-200 shadow-card hover:border-slate-300"
                }`}
              >
                {/* Order Top Bar */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        {ord.orderNumber}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {ord.buyerName}
                      </h3>
                      {ord.destination && (
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold"
                        >
                          Port: {ord.destination}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-black uppercase ${
                          isCompleted
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-indigo-50 text-indigo-800 border-indigo-300"
                        }`}
                      >
                        {isCompleted ? "Completed" : "In Fulfillment"}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Order Date: {new Date(ord.orderDate).toLocaleDateString("en-IN")}
                      </span>
                      {ord.targetDate && (
                        <span className="flex items-center gap-1 text-indigo-700 font-semibold">
                          <Clock className="w-3 h-3 text-indigo-500" />
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
                        className="bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-2xs"
                      >
                        <Ship className="w-3.5 h-3.5" /> Dispatch Container
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => shareOrderWhatsApp(ord)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs h-8 px-2.5 rounded-lg gap-1"
                    >
                      <Send className="w-3 h-3 text-slate-500" /> WhatsApp
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStatus(ord)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 h-8 px-2"
                    >
                      {isCompleted ? "Re-open" : "Mark Done"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteOrder(ord.id)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 px-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-4 sm:px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-600">Fulfillment Progress</span>
                      <span className="font-mono text-emerald-700 font-black">
                        {progressPercent}% ({totalDispatched} / {totalOrdered} boxes)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-slate-500 font-semibold block">Remaining to Dispatch:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {remainingBoxes} <span className="text-xs font-bold text-slate-500">boxes</span>
                    </span>
                  </div>
                </div>

                {/* Smart Prediction & Produce Matrix Table */}
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-4">Produce Line</th>
                        <th className="py-2.5 px-3 font-mono">Ordered</th>
                        <th className="py-2.5 px-3 font-mono text-emerald-700">Dispatched</th>
                        <th className="py-2.5 px-3 font-mono text-slate-900">Remaining</th>
                        <th className="py-2.5 px-3 bg-slate-50">In Cold Room</th>
                        <th className="py-2.5 px-4">Stock Gap / Harvest Needed</th>
                        <th className="py-2.5 px-3 text-right">Containers Req.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {ord.items.map((it) => {
                        // Dispatched for this item in linked containers
                        const itDispatched = completedDispatches.reduce((sum, d) => {
                          const m = d.items.find(
                            (cIt) => cIt.brandName.toLowerCase() === it.brandName.toLowerCase() && cIt.boxType === it.boxType
                          );
                          return sum + (m?.quantity || 0);
                        }, 0);

                        const itRemaining = Math.max(0, it.quantity - itDispatched);
                        const coldStock = currentColdStock[it.brandName]?.[it.boxType] || 0;
                        const harvestDeficit = Math.max(0, itRemaining - coldStock);
                        const containersForLine = Math.ceil(itRemaining / capacity);

                        return (
                          <tr key={it.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-4 font-bold text-slate-900">
                              {BOX_TYPE_LABELS[it.boxType]} · {it.brandName}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                              {it.quantity}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                              {itDispatched}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-slate-900">
                              {itRemaining}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700 bg-slate-50/50">
                              {coldStock}
                            </td>
                            <td className="py-2.5 px-4">
                              {itRemaining === 0 ? (
                                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                  ✓ Line Fully Fulfilled
                                </Badge>
                              ) : harvestDeficit === 0 ? (
                                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready in Stock ({coldStock} available)
                                </Badge>
                              ) : (
                                <div className="space-y-0.5">
                                  <Badge className="bg-amber-50 text-amber-900 border-amber-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Shortfall of {harvestDeficit} bx
                                  </Badge>
                                  <span className="text-[10px] text-slate-400 block font-normal">
                                    Need {harvestDeficit} more boxes from incoming harvest
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-800">
                              {itRemaining > 0 ? `~${containersForLine} reefer` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>

                {/* Linked Containers Strip */}
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
                <Label className="text-xs font-semibold text-slate-700">Buyer / Customer Name *</Label>
                <Input
                  placeholder="e.g. Al-Madina Fruits Trading LLC"
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
                <Label className="text-xs font-semibold text-slate-700">Reefer Container Capacity (Boxes)</Label>
                <Input
                  type="number"
                  min="500"
                  max="3000"
                  value={containerCapacity}
                  onChange={(e) => setContainerCapacity(e.target.value)}
                  placeholder="e.g. 1500"
                  className="mt-1 h-9 bg-white text-xs font-mono font-bold shadow-xs"
                />
              </div>
            </div>

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
                  const currentStock = currentColdStock[line.brandName]?.[line.boxType] || 0;
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
                                  {BOX_TYPE_LABELS[s]}
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
                placeholder="e.g. Export pack with foam pads, temperature strictly 13.5°C before sealing..."
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
