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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Truck,
  CheckCircle2,
  Package,
  Layers,
  Plus,
  Trash2,
  ShieldCheck,
  MapPin,
  Tag,
  Clock,
  Printer,
  Search,
  SlidersHorizontal,
  Boxes,
  ThermometerSnowflake,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Check,
} from "lucide-react";
import {
  ColdStorageReceipt,
  COLD_STORAGE_ROOMS,
  BRAND_NAMES,
} from "@/types";
import { toast } from "sonner";

export default function ColdStorageAdminPage() {
  const { coldStorageReceipts } = useStartrekStore();

  const fetchColdStorage = useCallback(() => {
    fetch("/api/cold-storage")
      .then((r) => {
        if (r.status === 401) window.location.href = "/login";
        return r.json();
      })
      .then((data) => {
        if (data.receipts) {
          store.setColdStorageReceipts(data.receipts);
        }
      })
      .catch(() => {});
  }, []);

  // Focus/visibility-aware live refresh
  useLiveData([fetchColdStorage]);

  // Tab State
  const [activeTab, setActiveTab] = useState<"RECEIVING" | "STOCK_MATRIX" | "ROOMS">("RECEIVING");

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DISPATCHED" | "VERIFIED_RECEIVED" | "ALLOCATED_TO_ROOMS">("ALL");

  // Official KD Cold Storage Quality Report Modal State
  const [qualityReportTarget, setQualityReportTarget] = useState<ColdStorageReceipt | null>(null);
  const [reportOuterQuality, setReportOuterQuality] = useState<"GOOD" | "FAIR" | "POOR">("GOOD");
  const [reportPackingQuality, setReportPackingQuality] = useState<"EXPORT" | "DOMESTIC" | "DEFECTIVE">("EXPORT");
  const [reportHandsCount, setReportHandsCount] = useState<string>("5-7 hands");
  const [reportFingerLength, setReportFingerLength] = useState<string>("18cm / 38mm");
  const [reportBoxWeight, setReportBoxWeight] = useState<string>("13.5");
  const [reportHandDamage, setReportHandDamage] = useState<"NONE" | "LOW" | "HIGH">("NONE");
  const [reportLatexSpots, setReportLatexSpots] = useState<boolean>(false);
  const [reportRedRust, setReportRedRust] = useState<boolean>(false);
  const [reportFlowerRemoved, setReportFlowerRemoved] = useState<boolean>(true);
  const [reportOverallQuality, setReportOverallQuality] = useState<"A_GRADE_EXPORT" | "B_GRADE" | "REJECTED">("A_GRADE_EXPORT");
  const [reportDamageBoxes, setReportDamageBoxes] = useState<string>("5");

  const handleOpenQualityReport = (receipt: ColdStorageReceipt) => {
    setQualityReportTarget(receipt);
  };

  const handleSaveQualityReport = async () => {
    if (!qualityReportTarget) return;

    const qr: any = {
      date: new Date().toLocaleDateString("en-IN"),
      vehicleNo: qualityReportTarget.vehicleNo,
      lineName: qualityReportTarget.billData?.lineName || "Line 1",
      supervisorName: qualityReportTarget.billData?.supervisorName || "Supervisor",
      vendorName: qualityReportTarget.billData?.vendorName || "KD Vendor",
      outerBoxQuality: reportOuterQuality,
      packingQuality: reportPackingQuality,
      numberOfHands: reportHandsCount,
      fingerLengthDiameter: reportFingerLength,
      boxWeightKg: parseFloat(reportBoxWeight) || 13.5,
      damageOnHand: reportHandDamage,
      latexSpots: reportLatexSpots,
      redRust: reportRedRust,
      flowerRemoved: reportFlowerRemoved,
      overallQuality: reportOverallQuality as any,
      damageBox: parseInt(reportDamageBoxes) || 0,
      boxBrand: qualityReportTarget.billData?.orchardParticulars || "StarPremium",
    };

    try {
      const res = await fetch("/api/cold-storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "QUALITY_REPORT",
          receiptId: qualityReportTarget.id,
          qualityReport: qr,
        }),
      });

      if (!res.ok) throw new Error("Failed to save quality report");

      store.saveKDColdStorageQualityReport(qualityReportTarget.id, qr);

      toast.success("KD Cold Storage Quality Report Saved!", {
        description: `Official report logged for Truck ${qualityReportTarget.vehicleNo}. Grade: ${reportOverallQuality}.`,
      });
    } catch (e) {
      console.error("Error saving quality report:", e);
      toast.error("Failed to sync quality report to database");
    }

    setQualityReportTarget(null);
  };

  const [verifyTarget, setVerifyTarget] = useState<ColdStorageReceipt | null>(null);
  const [verifiedCountInput, setVerifiedCountInput] = useState<number>(1107);

  // Multi-Brand Room Allocation Modal
  const [allocateTarget, setAllocateTarget] = useState<ColdStorageReceipt | null>(null);
  const [roomMaxCapacity, setRoomMaxCapacity] = useState<number>(500);
  const [allocations, setAllocations] = useState<
    { roomNumber: string; brandName: string; boxCount: number }[]
  >([]);

  const handleOpenVerify = (receipt: ColdStorageReceipt) => {
    setVerifyTarget(receipt);
    setVerifiedCountInput(receipt.dispatchedTotalBoxes);
  };

  const handleConfirmVerify = async () => {
    if (!verifyTarget) return;

    try {
      const res = await fetch("/api/cold-storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY",
          receiptId: verifyTarget.id,
          verifiedBoxCount: verifiedCountInput,
        }),
      });

      if (!res.ok) throw new Error("Failed to verify");

      store.verifyColdStorageReceipt(verifyTarget.id, verifiedCountInput);

      toast.success("Box Count Verified!", {
        description: `Verified ${verifiedCountInput} boxes received from Truck ${verifyTarget.vehicleNo}. Ready for Room Allocation.`,
      });
    } catch (e) {
      console.error("Error verifying:", e);
      toast.error("Failed to sync verification to database");
    }

    setVerifyTarget(null);
  };

  const handleOpenAllocate = (receipt: ColdStorageReceipt) => {
    setAllocateTarget(receipt);
    const totalToAllocate = receipt.verifiedBoxCount || receipt.dispatchedTotalBoxes || 0;
    const defaultBrand = receipt.billData?.orchardParticulars || receipt.brandName || BRAND_NAMES[0];

    if (receipt.allocations && receipt.allocations.length > 0) {
      setAllocations(
        receipt.allocations.map((a) => ({
          roomNumber: a.roomNumber,
          brandName: a.brandName,
          boxCount: a.boxCount,
        }))
      );
    } else {
      // Initialize with exact boxes received
      setAllocations([
        {
          roomNumber: COLD_STORAGE_ROOMS[0],
          brandName: defaultBrand,
          boxCount: totalToAllocate,
        },
      ]);
    }
  };

  // Helper to auto-distribute received boxes across rooms based on max room capacity
  const handleAutoDistributeByCapacity = (cap: number) => {
    if (!allocateTarget) return;
    const totalToAllocate = allocateTarget.verifiedBoxCount || allocateTarget.dispatchedTotalBoxes || 0;
    const defaultBrand = allocateTarget.billData?.orchardParticulars || allocateTarget.brandName || BRAND_NAMES[0];

    const newAllocs: { roomNumber: string; brandName: string; boxCount: number }[] = [];
    let remaining = totalToAllocate;
    let roomIdx = 0;

    while (remaining > 0 && roomIdx < COLD_STORAGE_ROOMS.length) {
      const roomCapacity = cap > 0 ? cap : 500;
      const countForThisRoom = Math.min(remaining, roomCapacity);
      newAllocs.push({
        roomNumber: COLD_STORAGE_ROOMS[roomIdx],
        brandName: defaultBrand,
        boxCount: countForThisRoom,
      });
      remaining -= countForThisRoom;
      roomIdx++;
    }

    if (remaining > 0 && newAllocs.length > 0) {
      newAllocs[newAllocs.length - 1].boxCount += remaining;
    }

    setAllocations(newAllocs.length > 0 ? newAllocs : [{ roomNumber: COLD_STORAGE_ROOMS[0], brandName: defaultBrand, boxCount: totalToAllocate }]);
    toast.info("Auto-distributed boxes across rooms", {
      description: `Split ${totalToAllocate} boxes using ${cap} boxes/room limit.`,
    });
  };

  const handleAddAllocationRow = () => {
    if (!allocateTarget) return;
    const totalToAllocate = allocateTarget.verifiedBoxCount || allocateTarget.dispatchedTotalBoxes || 0;
    const currentAllocated = allocations.reduce((s, a) => s + a.boxCount, 0);
    const unallocated = Math.max(0, totalToAllocate - currentAllocated);
    const defaultBrand = allocateTarget.billData?.orchardParticulars || allocateTarget.brandName || BRAND_NAMES[0];
    const nextRoom = COLD_STORAGE_ROOMS[allocations.length % COLD_STORAGE_ROOMS.length] || COLD_STORAGE_ROOMS[0];

    setAllocations([
      ...allocations,
      { roomNumber: nextRoom, brandName: defaultBrand, boxCount: unallocated },
    ]);
  };

  const handleRemoveAllocationRow = (idx: number) => {
    setAllocations(allocations.filter((_, i) => i !== idx));
  };

  const handleConfirmAllocation = async () => {
    if (!allocateTarget) return;

    try {
      const res = await fetch("/api/cold-storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ALLOCATE",
          receiptId: allocateTarget.id,
          allocations,
        }),
      });

      if (!res.ok) throw new Error("Failed to allocate rooms");

      store.allocateColdStorageRooms(allocateTarget.id, allocations);

      toast.success("Rooms Allocated & Logged!", {
        description: `Successfully allocated inventory to KD rooms across brands.`,
      });
    } catch (e) {
      console.error("Error allocating rooms:", e);
      toast.error("Failed to sync room allocation to database");
    }

    setAllocateTarget(null);
  };

  // ─── AGGREGATED BRAND & ROOM STOCK INTELLIGENCE ────────────────────────
  const allAllocations = useMemo(() => {
    return coldStorageReceipts.flatMap((r) => r.allocations || []);
  }, [coldStorageReceipts]);

  const totalBoxesInStorage = useMemo(() => {
    return allAllocations.reduce((s, a) => s + (a.boxCount || 0), 0);
  }, [allAllocations]);

  const totalTonnageInStorage = useMemo(() => {
    return ((totalBoxesInStorage * 13.5) / 1000).toFixed(2);
  }, [totalBoxesInStorage]);

  // Brand Stock Summary Map
  const brandStockSummary = useMemo(() => {
    const summary: Record<string, { totalBoxes: number; rooms: Record<string, number> }> = {};
    for (const alloc of allAllocations) {
      if (!alloc.brandName || !alloc.boxCount) continue;
      const b = alloc.brandName;
      if (!summary[b]) {
        summary[b] = { totalBoxes: 0, rooms: {} };
      }
      summary[b].totalBoxes += alloc.boxCount;
      const r = alloc.roomNumber || "Cold Room 1 (Export)";
      summary[b].rooms[r] = (summary[b].rooms[r] || 0) + alloc.boxCount;
    }
    return summary;
  }, [allAllocations]);

  // Room Occupancy Summary Map
  const roomOccupancySummary = useMemo(() => {
    const summary: Record<string, { totalBoxes: number; brands: Record<string, number> }> = {};
    for (const room of COLD_STORAGE_ROOMS) {
      summary[room] = { totalBoxes: 0, brands: {} };
    }
    for (const alloc of allAllocations) {
      if (!alloc.roomNumber || !alloc.boxCount) continue;
      const r = alloc.roomNumber;
      if (!summary[r]) {
        summary[r] = { totalBoxes: 0, brands: {} };
      }
      summary[r].totalBoxes += alloc.boxCount;
      const b = alloc.brandName || "Standard";
      summary[r].brands[b] = (summary[r].brands[b] || 0) + alloc.boxCount;
    }
    return summary;
  }, [allAllocations]);

  // Filtered Receipts for Receiving & Search
  const filteredReceipts = useMemo(() => {
    return coldStorageReceipts.filter((rec) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        rec.farmerName?.toLowerCase().includes(searchLower) ||
        rec.vehicleNo?.toLowerCase().includes(searchLower) ||
        rec.driverName?.toLowerCase().includes(searchLower) ||
        rec.billData?.orchardParticulars?.toLowerCase().includes(searchLower) ||
        rec.billData?.location?.toLowerCase().includes(searchLower) ||
        rec.allocations?.some(
          (a) =>
            a.brandName?.toLowerCase().includes(searchLower) ||
            a.roomNumber?.toLowerCase().includes(searchLower)
        );

      const matchesBrand =
        brandFilter === "ALL" ||
        rec.billData?.orchardParticulars === brandFilter ||
        rec.brandName === brandFilter ||
        rec.allocations?.some((a) => a.brandName === brandFilter);

      const matchesRoom =
        roomFilter === "ALL" ||
        rec.allocations?.some((a) => a.roomNumber === roomFilter);

      const matchesStatus =
        statusFilter === "ALL" || rec.status === statusFilter;

      return matchesSearch && matchesBrand && matchesRoom && matchesStatus;
    });
  }, [coldStorageReceipts, searchTerm, brandFilter, roomFilter, statusFilter]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-2xs gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center font-bold">
            <ThermometerSnowflake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-heading">
                Cold Storage Hub & Multi-Brand Inventory
              </h1>
              <Badge className="bg-cyan-50 text-cyan-800 border-cyan-200 text-[10px] font-bold">
                KD Cold Storage
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Live stock visibility by brand and room, inbound truck intake, and export order readiness
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("RECEIVING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "RECEIVING"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Truck className="w-3.5 h-3.5" /> Inbound Receiving ({coldStorageReceipts.length})
          </button>
          <button
            onClick={() => setActiveTab("STOCK_MATRIX")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "STOCK_MATRIX"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-indigo-600" /> Brand Stock View
          </button>
          <button
            onClick={() => setActiveTab("ROOMS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "ROOMS"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-600" /> Room Layouts
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* TOP METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Banana Stock</span>
              <span className="text-2xl font-black text-slate-900 font-heading block mt-0.5">
                {totalBoxesInStorage} <span className="text-xs font-semibold text-slate-400">Boxes</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" /> ~{totalTonnageInStorage} Tons Stored
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
          </Card>

          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Active Brands in Storage</span>
              <span className="text-2xl font-black text-indigo-700 font-heading block mt-0.5">
                {Object.keys(brandStockSummary).length} <span className="text-xs font-semibold text-slate-400">Brands</span>
              </span>
              <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                Multi-brand partitioned
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
          </Card>

          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Cold Rooms Operating</span>
              <span className="text-2xl font-black text-cyan-700 font-heading block mt-0.5">
                3 <span className="text-xs font-semibold text-slate-400">Rooms</span>
              </span>
              <span className="text-[11px] text-cyan-700 font-bold block mt-0.5">
                13.5°C Optimal Temp
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </Card>

          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Pending Intake Gates</span>
              <span className="text-2xl font-black text-amber-700 font-heading block mt-0.5">
                {coldStorageReceipts.filter(r => r.status !== "ALLOCATED_TO_ROOMS").length} <span className="text-xs font-semibold text-slate-400">Trucks</span>
              </span>
              <span className="text-[11px] text-amber-700 font-bold block mt-0.5">
                Awaiting Gate Verification
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
          </Card>
        </div>

        {/* ─── TAB 1: INBOUND RECEIVING & GATE VERIFICATION ────────────── */}
        {activeTab === "RECEIVING" && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search by Farmer, Brand, Room, Vehicle No, or Location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-slate-50/70 border-slate-200 h-10 rounded-xl text-xs font-semibold"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Select value={brandFilter} onValueChange={(val: any) => setBrandFilter(val || "ALL")}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 h-10 rounded-xl text-xs font-bold w-full md:w-44">
                      <SelectValue placeholder="Brand Filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="ALL">All Brands</SelectItem>
                      {BRAND_NAMES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 h-10 rounded-xl text-xs font-bold w-full md:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="DISPATCHED">In-Transit</SelectItem>
                      <SelectItem value="VERIFIED_RECEIVED">Verified Gate</SelectItem>
                      <SelectItem value="ALLOCATED_TO_ROOMS">Allocated in Room</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Incoming Dispatches Table */}
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <Truck className="w-4.5 h-4.5 text-cyan-600" />
                  Inbound Truck Gate Intakes & Quality Verification Log
                </CardTitle>
                <Badge className="bg-cyan-100 text-cyan-900 border-cyan-300 text-xs font-bold px-2.5 py-0.5">
                  {filteredReceipts.length} Shipments Listed
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase pl-6 py-3">Farmer & Village</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Vehicle & Driver</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Boxes Dispatched</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Hand Breakdown</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Assigned Rooms & Brands</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 uppercase pr-6 text-right py-3">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-slate-400 font-semibold">
                          No shipments matching your search or filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReceipts.map((rec) => (
                        <TableRow key={rec.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="pl-6 py-4">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{rec.farmerName}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" /> {rec.billData?.location || "Solapur"}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <div>
                              <span className="font-bold text-slate-900 text-xs block">{rec.vehicleNo}</span>
                              <span className="text-[11px] text-slate-500 block">{rec.driverName} ({rec.driverPhone})</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <span className="font-black text-slate-900 text-base">{rec.dispatchedTotalBoxes}</span>
                            <span className="text-[10px] text-slate-400 block">Boxes</span>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {rec.billData?.box4H ? <Badge variant="outline" className="bg-white text-slate-700 text-[10px] font-bold">4H: {rec.billData.box4H}</Badge> : null}
                              {rec.billData?.box5H ? <Badge variant="outline" className="bg-white text-slate-700 text-[10px] font-bold">5H: {rec.billData.box5H}</Badge> : null}
                              {rec.billData?.box6H ? <Badge variant="outline" className="bg-white text-slate-700 text-[10px] font-bold">6H: {rec.billData.box6H}</Badge> : null}
                              {rec.billData?.box7H ? <Badge variant="outline" className="bg-white text-slate-700 text-[10px] font-bold">7H: {rec.billData.box7H}</Badge> : null}
                              {rec.billData?.box8H ? <Badge variant="outline" className="bg-white text-slate-700 text-[10px] font-bold">8H: {rec.billData.box8H}</Badge> : null}
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            {rec.allocations && rec.allocations.length > 0 ? (
                              <div className="space-y-1">
                                {rec.allocations.map((a, i) => (
                                  <div key={i} className="text-[11px] flex items-center gap-1.5">
                                    <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-800 text-[10px] font-bold">
                                      {a.roomNumber.replace("Cold Room", "CR")}
                                    </Badge>
                                    <span className="font-bold text-slate-700">{a.brandName}:</span>
                                    <strong className="text-slate-900">{a.boxCount} bx</strong>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Not allocated yet</span>
                            )}
                          </TableCell>

                          <TableCell className="py-4">
                            <Badge
                              variant="outline"
                              className={`text-xs font-bold px-2.5 py-0.5 border ${
                                rec.status === "DISPATCHED"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : rec.status === "VERIFIED_RECEIVED"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {rec.status === "DISPATCHED"
                                ? "IN-TRANSIT"
                                : rec.status === "VERIFIED_RECEIVED"
                                ? "GATE VERIFIED"
                                : "ALLOCATED TO ROOM"}
                            </Badge>
                          </TableCell>

                          <TableCell className="pr-6 text-right py-4 space-x-2">
                            {rec.status === "DISPATCHED" && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenVerify(rec)}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1 shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verify Receipt
                              </Button>
                            )}

                            {rec.status === "VERIFIED_RECEIVED" && (
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenQualityReport(rec)}
                                  className="border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs h-8 px-2.5 rounded-lg gap-1"
                                >
                                  <Printer className="w-3.5 h-3.5 text-slate-600" /> Log Quality
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenAllocate(rec)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1 shadow-xs"
                                >
                                  <Layers className="w-3.5 h-3.5" /> Allocate Rooms
                                </Button>
                              </div>
                            )}

                            {rec.status === "ALLOCATED_TO_ROOMS" && (
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenQualityReport(rec)}
                                  className="border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs h-8 px-2.5 rounded-lg gap-1"
                                >
                                  <Printer className="w-3.5 h-3.5 text-slate-500" /> Report
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenAllocate(rec)}
                                  className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs h-8 px-2.5 rounded-lg gap-1"
                                >
                                  <Layers className="w-3.5 h-3.5 text-emerald-700" /> Edit Rooms
                                </Button>
                              </div>
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

        {/* ─── TAB 2: BRAND STOCK & ORDER FULFILLMENT MATRIX ────────── */}
        {activeTab === "STOCK_MATRIX" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  Real-Time Brand Stock & Export Order Readiness
                </h2>
                <p className="text-xs text-slate-500">
                  Select or search brands to see total boxes stored and exact cold room locations for dispatch
                </p>
              </div>
            </div>

            {/* Brand Stock Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(brandStockSummary).length === 0 ? (
                <div className="col-span-3 p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                  No banana inventory has been allocated to rooms yet. Complete a harvest intake to see brand stock here!
                </div>
              ) : (
                Object.entries(brandStockSummary).map(([brand, data]) => {
                  const brandTons = ((data.totalBoxes * 13.5) / 1000).toFixed(2);
                  return (
                    <Card key={brand} className="border-slate-200 bg-white shadow-card rounded-2xl p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black uppercase tracking-wider mb-1.5">
                            Brand Stock
                          </Badge>
                          <h3 className="text-base font-black text-slate-900 font-heading">{brand}</h3>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs">
                          Dispatch Ready
                        </Badge>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold uppercase block">Stored Quantity</span>
                          <span className="text-2xl font-black text-slate-900 font-heading">
                            {data.totalBoxes} <span className="text-xs font-bold text-slate-500">Boxes</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 font-bold uppercase block">Est. Weight</span>
                          <span className="text-lg font-black text-emerald-700 font-heading">
                            {brandTons} <span className="text-xs font-bold text-slate-500">Tons</span>
                          </span>
                        </div>
                      </div>

                      {/* Location in Rooms Breakdown */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Storage Room Locations:
                        </span>
                        <div className="space-y-1">
                          {Object.entries(data.rooms).map(([room, count]) => (
                            <div key={room} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50/80 border border-slate-100 font-semibold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-cyan-600" /> {room}
                              </span>
                              <strong className="text-slate-900 font-mono">{count} Boxes</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: COLD ROOMS OCCUPANCY & TEMPERATURE ────────────── */}
        {activeTab === "ROOMS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-600" />
                  Active Cold Storage Rooms Multi-Tenant Breakdown
                </h2>
                <p className="text-xs text-slate-500">
                  Monitor capacity utilization and multi-brand partitioned stacking per room
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {COLD_STORAGE_ROOMS.map((room) => {
                const data = roomOccupancySummary[room] || { totalBoxes: 0, brands: {} };
                const maxCap = 1000;
                const percentage = Math.min(100, Math.round((data.totalBoxes / maxCap) * 100));

                return (
                  <Card key={room} className="border-slate-200 bg-white shadow-card rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900 font-heading flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-cyan-600" />
                          {room}
                        </h3>
                        <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                          <ThermometerSnowflake className="w-3 h-3 text-cyan-600" /> 13.5°C — Optimal Cooling
                        </p>
                      </div>
                      <Badge className={data.totalBoxes > 0 ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold text-xs" : "bg-slate-100 text-slate-600 font-bold text-xs"}>
                        {data.totalBoxes > 0 ? "In Use" : "Available"}
                      </Badge>
                    </div>

                    {/* Progress Bar Capacity */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Room Occupancy:</span>
                        <span className="font-mono">{data.totalBoxes} / {maxCap} Boxes ({percentage}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-600 transition-all rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Multi-Brand Stacking in this Room */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Brands Stored in this Room:
                      </span>
                      {Object.keys(data.brands).length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No boxes currently assigned to this room</p>
                      ) : (
                        <div className="space-y-1.5">
                          {Object.entries(data.brands).map(([b, count]) => (
                            <div key={b} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900">{b}</span>
                              <Badge variant="outline" className="bg-white border-slate-300 text-slate-800 font-black">
                                {count} Boxes
                              </Badge>
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
        )}

        {/* ─── MODALS ─────────────────────────────────────────────────── */}

        {/* Gate Verify Modal */}
        {verifyTarget && (
          <Dialog open onOpenChange={() => setVerifyTarget(null)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sky-800 text-lg font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                  Verify Inbound Gate Delivery
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs text-slate-700">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-medium">
                  <p><strong>Farmer:</strong> {verifyTarget.farmerName}</p>
                  <p><strong>Vehicle No:</strong> {verifyTarget.vehicleNo}</p>
                  <p><strong>Driver:</strong> {verifyTarget.driverName} ({verifyTarget.driverPhone})</p>
                  <p><strong>Dispatched Total:</strong> {verifyTarget.dispatchedTotalBoxes} Boxes</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Actual Boxes Received at Gate</Label>
                  <Input
                    type="number"
                    value={verifiedCountInput}
                    onChange={(e) => setVerifiedCountInput(parseInt(e.target.value) || 0)}
                    className="bg-white border-slate-300 text-slate-900 font-black h-11 rounded-xl text-base"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" onClick={() => setVerifyTarget(null)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button onClick={handleConfirmVerify} className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl gap-1.5">
                  <Check className="w-4 h-4" /> Confirm Gate Verification
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Multi-Brand Room Allocation Modal */}
        {allocateTarget && (() => {
          const totalReceived = allocateTarget.verifiedBoxCount || allocateTarget.dispatchedTotalBoxes || 0;
          const allocatedSum = allocations.reduce((s, a) => s + (a.boxCount || 0), 0);
          const difference = totalReceived - allocatedSum;

          return (
            <Dialog open onOpenChange={() => setAllocateTarget(null)}>
              <DialogContent className="sm:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-8">
                <DialogHeader className="pb-3 border-b border-slate-100">
                  <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-bold">
                    <Layers className="w-5 h-5 text-emerald-600" />
                    Multi-Brand Cold Storage Room Allocation
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Allocate received boxes into cold rooms. Different brands & quantities can be placed in each room.
                  </p>
                </DialogHeader>

                <div className="space-y-4 py-3">
                  {/* Summary & Live Match Validation */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Total Boxes Received: <strong className="text-slate-950 text-sm">{totalReceived}</strong></span>
                      <span className="text-emerald-700 font-black">
                        Allocated Total: {allocatedSum} Boxes
                      </span>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs font-bold">
                      {difference === 0 ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold gap-1 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Allocated ({totalReceived} / {totalReceived} Boxes)
                        </Badge>
                      ) : difference > 0 ? (
                        <Badge className="bg-amber-50 text-amber-800 border-amber-300 font-bold gap-1 text-xs">
                          ⚠️ {difference} Boxes Remaining to Allocate
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold gap-1 text-xs">
                          ⚠️ Over-allocated by {Math.abs(difference)} Boxes
                        </Badge>
                      )}

                      {/* Quick Auto-Fill By Room Capacity */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-semibold">Max Room Cap:</span>
                        <Input
                          type="number"
                          value={roomMaxCapacity}
                          onChange={(e) => setRoomMaxCapacity(parseInt(e.target.value) || 0)}
                          className="w-16 h-7 bg-white text-xs font-bold px-1.5"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAutoDistributeByCapacity(roomMaxCapacity)}
                          className="h-7 text-[11px] font-bold bg-white text-slate-700 hover:bg-slate-100 px-2"
                        >
                          Auto-Distribute
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Room Allocation Rows */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {allocations.map((alloc, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-4">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Cold Room</Label>
                          <Select
                            value={alloc.roomNumber}
                            onValueChange={(val: any) => {
                              const copy = [...allocations];
                              copy[idx].roomNumber = val || "";
                              setAllocations(copy);
                            }}
                          >
                            <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-semibold">
                              <SelectValue placeholder="Room">{alloc.roomNumber || "Select Room"}</SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {COLD_STORAGE_ROOMS.map((r) => (
                                <SelectItem key={r} value={r} className="text-xs font-semibold">
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="sm:col-span-4">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Brand</Label>
                          <Select
                            value={alloc.brandName}
                            onValueChange={(val: any) => {
                              const copy = [...allocations];
                              copy[idx].brandName = val || "";
                              setAllocations(copy);
                            }}
                          >
                            <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-semibold">
                              <SelectValue placeholder="Brand">{alloc.brandName || "Select Brand"}</SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {BRAND_NAMES.map((b) => (
                                <SelectItem key={b} value={b} className="text-xs font-semibold">
                                  {b}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="sm:col-span-3">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Box Count</Label>
                          <Input
                            type="number"
                            value={alloc.boxCount || ""}
                            placeholder="0"
                            onChange={(e) => {
                              const copy = [...allocations];
                              copy[idx].boxCount = parseInt(e.target.value) || 0;
                              setAllocations(copy);
                            }}
                            className="bg-white h-9 rounded-lg text-xs font-bold"
                          />
                        </div>

                        <div className="sm:col-span-1 text-right pt-4 sm:pt-0">
                          {allocations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAllocationRow(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddAllocationRow}
                    className="w-full border-dashed border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold h-10 rounded-xl gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Room / Brand Partition Row
                  </Button>
                </div>

                <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setAllocateTarget(null)} className="rounded-xl font-bold">
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmAllocation} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Save Room Allocation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          );
        })()}

        {/* Official KD Cold Storage Quality Report Modal */}
        {qualityReportTarget && (
          <Dialog open onOpenChange={() => setQualityReportTarget(null)}>
            <DialogContent className="sm:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto scrollbar-thin">
              <DialogHeader className="pb-3 border-b border-slate-200 text-center">
                <div className="border-b-2 border-slate-900 pb-2 mb-2">
                  <h3 className="text-xl font-black text-slate-900 tracking-wider">KIRAN DOKE FRUIT</h3>
                  <h4 className="text-base font-bold text-slate-800">KD COLD STORAGE</h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    GAT NO 504 KANDAR TAL KARMALA, SOLAPUR, MAHARASHTRA 413202<br />
                    Ph: +919823435133, +919112385133
                  </p>
                </div>
                <Badge className="mx-auto bg-slate-900 text-white text-xs font-black px-4 py-1 tracking-widest uppercase">
                  QUALITY REPORT
                </Badge>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                {/* Header Information */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-800">
                  <div>Date: <strong className="text-slate-950">{new Date().toLocaleDateString("en-IN")}</strong></div>
                  <div>Vehicle No: <strong className="text-slate-950">{qualityReportTarget.vehicleNo}</strong></div>
                  <div>Line Name: <strong className="text-slate-950">{qualityReportTarget.billData?.lineName || "Line 1"}</strong></div>
                  <div>Supervisor: <strong className="text-slate-950">{qualityReportTarget.billData?.supervisorName || "Supervisor"}</strong></div>
                  <div className="sm:col-span-2">Vendor Name: <strong className="text-slate-950">{qualityReportTarget.billData?.vendorName || "KD Vendor"}</strong></div>
                </div>

                {/* Main Quality Metrics */}
                <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                    Quality Parameters & Calibration
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Outer Box Quality</Label>
                      <Select value={reportOuterQuality} onValueChange={(v: any) => setReportOuterQuality(v)}>
                        <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-bold mt-1">
                          <SelectValue placeholder="Quality">{reportOuterQuality}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="GOOD">GOOD (Intact & Clean)</SelectItem>
                          <SelectItem value="FAIR">FAIR (Minor Moisture)</SelectItem>
                          <SelectItem value="POOR">POOR (Crushed / Damaged)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Packing Quality</Label>
                      <Select value={reportPackingQuality} onValueChange={(v: any) => setReportPackingQuality(v)}>
                        <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-bold mt-1">
                          <SelectValue placeholder="Packing">{reportPackingQuality}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="EXPORT">EXPORT (Premium Packed)</SelectItem>
                          <SelectItem value="DOMESTIC">DOMESTIC (Standard)</SelectItem>
                          <SelectItem value="DEFECTIVE">DEFECTIVE (Loose/Damaged)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Number of Hands</Label>
                      <Input
                        value={reportHandsCount}
                        onChange={(e) => setReportHandsCount(e.target.value)}
                        placeholder="Enter hand count"
                        className="bg-white h-9 rounded-lg text-xs font-bold mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Finger Length / Diameter</Label>
                      <Input
                        value={reportFingerLength}
                        onChange={(e) => setReportFingerLength(e.target.value)}
                        placeholder="Enter finger calibration"
                        className="bg-white h-9 rounded-lg text-xs font-bold mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Box Weight (Kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={reportBoxWeight}
                        onChange={(e) => setReportBoxWeight(e.target.value)}
                        placeholder="13.5"
                        className="bg-white h-9 rounded-lg text-xs font-bold mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Damage on Hand</Label>
                      <Select value={reportHandDamage} onValueChange={(v: any) => setReportHandDamage(v)}>
                        <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-bold mt-1">
                          <SelectValue placeholder="Damage">{reportHandDamage}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="NONE">NONE (Clean Hands)</SelectItem>
                          <SelectItem value="LOW">LOW (&lt;2% Bruising)</SelectItem>
                          <SelectItem value="HIGH">HIGH (&gt;5% Bruising)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Physical Checklist Options */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={reportLatexSpots}
                        onChange={(e) => setReportLatexSpots(e.target.checked)}
                        className="w-4 h-4 accent-slate-900 rounded"
                      />
                      Latex Spots Present?
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={reportRedRust}
                        onChange={(e) => setReportRedRust(e.target.checked)}
                        className="w-4 h-4 accent-slate-900 rounded"
                      />
                      Red Rust Present?
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={reportFlowerRemoved}
                        onChange={(e) => setReportFlowerRemoved(e.target.checked)}
                        className="w-4 h-4 accent-slate-900 rounded"
                      />
                      Flower Removed?
                    </label>
                  </div>
                </div>

                {/* Hand Breakdown Particulars & Total / Damage Box Count */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex justify-between items-center font-bold text-slate-900">
                    <span>Particulars: {qualityReportTarget.billData?.orchardParticulars || "StarPremium 13kg"}</span>
                    <span>Total Dispatched: {qualityReportTarget.dispatchedTotalBoxes} Boxes</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center pt-1 font-bold">
                    <div className="bg-white p-2 rounded-lg border">4H: {qualityReportTarget.billData?.box4H || 140}</div>
                    <div className="bg-white p-2 rounded-lg border">5H: {qualityReportTarget.billData?.box5H || 210}</div>
                    <div className="bg-white p-2 rounded-lg border">6H: {qualityReportTarget.billData?.box6H || 180}</div>
                    <div className="bg-white p-2 rounded-lg border">7H: {qualityReportTarget.billData?.box7H || 70}</div>
                    <div className="bg-white p-2 rounded-lg border">8H: {qualityReportTarget.billData?.box8H || 50}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Label className="font-bold text-slate-800">Damaged Boxes Discovered at Cold Storage:</Label>
                    <Input
                      type="number"
                      value={reportDamageBoxes}
                      onChange={(e) => setReportDamageBoxes(e.target.value)}
                      className="w-28 bg-white h-9 font-black rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-3 border-t border-slate-200">
                <Button variant="outline" onClick={() => setQualityReportTarget(null)} className="rounded-xl font-bold">
                  Close
                </Button>
                <Button onClick={handleSaveQualityReport} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl gap-1.5">
                  <Printer className="w-4 h-4" /> Save Official KD Quality Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
