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
  FileText,
  FileSpreadsheet,
  Share2,
  Ship,
} from "lucide-react";
import {
  ColdStorageReceipt,
  COLD_STORAGE_ROOMS,
  COLD_ROOM_CAPACITY,
  BRAND_NAMES,
  KDColdStorageQualityReport,
} from "@/types";
import { ColdStorageQualityVoucherModal, generateColdStorageQualityWhatsApp } from "@/components/shared/ColdStorageQualityVoucherModal";
import { KDColdStorageStockTable } from "@/components/shared/KDColdStorageStockTable";
import { ColdStorageQualityArchive } from "@/components/shared/ColdStorageQualityArchive";
import { ContainerDispatchPanel } from "@/components/shared/ContainerDispatchPanel";
import { acceptedBoxes, distributeAllocationRows, validateAllocationDrafts } from "@/lib/allocation-plan";
import { BOX_TYPE_LABELS } from "@/types";
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
  const [activeTab, setActiveTab] = useState<"RECEIVING" | "ARCHIVE" | "STOCK_UPDATE" | "ROOMS" | "CONTAINER">("RECEIVING");

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DISPATCHED" | "VERIFIED_RECEIVED" | "ALLOCATED_TO_ROOMS">("ALL");

  // Active Voucher Modal State (for Print / WhatsApp / View)
  const [activeVoucherTarget, setActiveVoucherTarget] = useState<ColdStorageReceipt | null>(null);

  // Official KD Cold Storage Quality Report & Gate Intake Modal State
  const [qualityReportTarget, setQualityReportTarget] = useState<ColdStorageReceipt | null>(null);
  const [reportDate, setReportDate] = useState<string>("");
  const [reportVehicleNo, setReportVehicleNo] = useState<string>("");
  const [reportLineName, setReportLineName] = useState<string>("");
  const [reportSupervisorName, setReportSupervisorName] = useState<string>("");
  const [reportVendorName, setReportVendorName] = useState<string>("");
  const [reportBrand, setReportBrand] = useState<string>("");
  const [reportBox3H, setReportBox3H] = useState<number>(0);
  const [reportBox4H, setReportBox4H] = useState<number>(0);
  const [reportBox5H, setReportBox5H] = useState<number>(0);
  const [reportBox6H, setReportBox6H] = useState<number>(0);
  const [reportBox7H, setReportBox7H] = useState<number>(0);
  const [reportBox8H, setReportBox8H] = useState<number>(0);
  const [reportTotalBoxes, setReportTotalBoxes] = useState<number>(0);
  
  // Inspection parameters (Cold storage admin inspects & fills)
  const [reportOuterQuality, setReportOuterQuality] = useState<"GOOD" | "FAIR" | "POOR">("GOOD");
  const [reportPackingQuality, setReportPackingQuality] = useState<"EXPORT" | "DOMESTIC" | "DEFECTIVE">("EXPORT");
  const [reportHandsCount, setReportHandsCount] = useState<string>("5-7 hands");
  const [reportFingerLength, setReportFingerLength] = useState<string>("18cm / 38mm");
  const [reportBoxWeight, setReportBoxWeight] = useState<string>("13.5");
  const [reportHandDamage, setReportHandDamage] = useState<"NONE" | "LOW" | "HIGH">("NONE");
  const [reportLatexSpots, setReportLatexSpots] = useState<boolean>(false);
  // Red rust is recorded as a typed percentage; the boolean flag is derived from it.
  const [reportRedRustPercentage, setReportRedRustPercentage] = useState<string>("");
  const [reportFlowerRemoved, setReportFlowerRemoved] = useState<boolean>(true);
  const [reportOverallQuality, setReportOverallQuality] = useState<"A_GRADE_EXPORT" | "B_GRADE" | "REJECTED">("A_GRADE_EXPORT");
  const [reportDamageBoxes, setReportDamageBoxes] = useState<string>("0");

  const handleOpenQualityReport = (receipt: ColdStorageReceipt) => {
    setQualityReportTarget(receipt);
    const rep = receipt.qualityReport;
    
    // Auto-prefill data from flow
    setReportDate(rep?.date || new Date().toLocaleDateString("en-IN"));
    setReportVehicleNo(rep?.vehicleNo || receipt.vehicleNo || "");
    setReportLineName(rep?.lineName || receipt.billData?.lineName || "Line 1");
    setReportSupervisorName(rep?.supervisorName || receipt.billData?.supervisorName || "Supervisor");
    setReportVendorName(rep?.vendorName || receipt.billData?.vendorName || receipt.farmerName || "KD Vendor");
    setReportBrand(rep?.boxBrand || receipt.billData?.orchardParticulars || receipt.brandName || "");
    setReportBox3H(rep?.box3H ?? receipt.billData?.box3H ?? 0);
    setReportBox4H(rep?.box4H ?? receipt.billData?.box4H ?? 0);
    setReportBox5H(rep?.box5H ?? receipt.billData?.box5H ?? 0);
    setReportBox6H(rep?.box6H ?? receipt.billData?.box6H ?? 0);
    setReportBox7H(rep?.box7H ?? receipt.billData?.box7H ?? 0);
    setReportBox8H(rep?.box8H ?? receipt.billData?.box8H ?? 0);
    setReportTotalBoxes(rep?.totalBox || receipt.verifiedBoxCount || receipt.dispatchedTotalBoxes || 0);

    // Inspection fields
    setReportOuterQuality(rep?.outerBoxQuality || "GOOD");
    setReportPackingQuality(rep?.packingQuality || "EXPORT");
    setReportHandsCount(rep?.numberOfHands || "5-7 hands");
    setReportFingerLength(rep?.fingerLengthDiameter || "18cm / 38mm");
    setReportBoxWeight(rep?.boxWeightKg ? String(rep.boxWeightKg) : "13.5");
    setReportHandDamage(rep?.damageOnHand || "NONE");
    setReportLatexSpots(rep?.latexSpots ?? false);
    setReportRedRustPercentage(
      rep?.redRustPercentage != null
        ? String(rep.redRustPercentage)
        : rep?.redRust
        ? "1"
        : ""
    );
    setReportFlowerRemoved(rep?.flowerRemoved ?? true);
    setReportOverallQuality(rep?.overallQuality || "A_GRADE_EXPORT");
    setReportDamageBoxes(rep?.damageBox !== undefined ? String(rep.damageBox) : "0");
  };

  const handleSaveQualityReport = async () => {
    if (!qualityReportTarget) return;

    const damageCount = parseInt(reportDamageBoxes) || 0;
    const verifiedNet = Math.max(0, reportTotalBoxes - damageCount);

    const qr: any = {
      date: reportDate || new Date().toLocaleDateString("en-IN"),
      vehicleNo: reportVehicleNo || qualityReportTarget.vehicleNo,
      lineName: reportLineName || "Line 1",
      supervisorName: reportSupervisorName || "Supervisor",
      vendorName: reportVendorName || qualityReportTarget.farmerName,
      outerBoxQuality: reportOuterQuality,
      packingQuality: reportPackingQuality,
      numberOfHands: reportHandsCount,
      fingerLengthDiameter: reportFingerLength,
      boxWeightKg: parseFloat(reportBoxWeight) || 13.5,
      damageOnHand: reportHandDamage,
      latexSpots: reportLatexSpots,
      redRustPercentage: reportRedRustPercentage.trim() ? parseFloat(reportRedRustPercentage) : null,
      redRust: reportRedRustPercentage.trim() ? parseFloat(reportRedRustPercentage) > 0 : false,
      flowerRemoved: reportFlowerRemoved,
      overallQuality: reportOverallQuality,
      box3H: reportBox3H,
      box4H: reportBox4H,
      box5H: reportBox5H,
      box6H: reportBox6H,
      box7H: reportBox7H,
      box8H: reportBox8H,
      totalBox: reportTotalBoxes,
      damageBox: damageCount,
      boxBrand: reportBrand,
    };

    try {
      const res = await fetch("/api/cold-storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "QUALITY_REPORT",
          receiptId: qualityReportTarget.id,
          qualityReport: qr,
          verifiedBoxCount: reportTotalBoxes,
        }),
      });

      if (!res.ok) throw new Error("Failed to save quality report");

      store.saveKDColdStorageQualityReport(qualityReportTarget.id, qr);
      store.verifyColdStorageReceipt(qualityReportTarget.id, reportTotalBoxes);

      toast.success("KD Cold Storage Quality Report & Gate Intake Logged!", {
        description: `Verified ${reportTotalBoxes} boxes for Truck ${qualityReportTarget.vehicleNo}. Grade: ${reportOverallQuality}.`,
      });

      // Automatically open the voucher modal for instant WhatsApp sharing or printing
      const updatedTarget = {
        ...qualityReportTarget,
        status: "VERIFIED_RECEIVED" as const,
        verifiedBoxCount: reportTotalBoxes,
        qualityReport: qr,
      };
      setQualityReportTarget(null);
      setActiveVoucherTarget(updatedTarget);
    } catch (e) {
      console.error("Error saving quality report:", e);
      toast.error("Failed to sync quality report to database");
    }
  };

  // Quick Gate Verify Modal
  const [verifyTarget, setVerifyTarget] = useState<ColdStorageReceipt | null>(null);
  const [verifiedCountInput, setVerifiedCountInput] = useState<number>(1107);

  // Multi-Brand Room Allocation Modal
  const [allocateTarget, setAllocateTarget] = useState<ColdStorageReceipt | null>(null);
  // Room capacity is a physical constant (COLD_ROOM_CAPACITY) — never user-editable.
  const [allocations, setAllocations] = useState<
    { roomNumber: string; brandName: string; boxType: string; boxCount: number }[]
  >([]);


  const handleOpenVerify = (receipt: ColdStorageReceipt) => {
    // Opening the full intake quality report allows verification and inspection simultaneously
    handleOpenQualityReport(receipt);
  };

  const handleOpenAllocate = (receipt: ColdStorageReceipt) => {
    setAllocateTarget(receipt);
    const totalToAllocate = acceptedBoxes(receipt);
    const defaultBrand = receipt.brandName || receipt.qualityReport?.boxBrand || "";

    if (receipt.allocations && receipt.allocations.length > 0) {
      setAllocations(
        receipt.allocations.map((a) => ({
          roomNumber: a.roomNumber,
          brandName: a.brandName,
          boxType: a.boxType?.replace(/^BOX_/, "") || "",
          boxCount: a.boxCount,
        }))
      );
    } else {
      // Initialize with exact boxes received
      setAllocations([
        {
          roomNumber: COLD_STORAGE_ROOMS[0],
          brandName: defaultBrand,
          boxType: "",
          boxCount: totalToAllocate,
        },
      ]);
    }
  };

  // Exclude this receipt's old placement because saving replaces it.
  const allocationOccupancy = () => {
    const occupied: Record<string, number> = {};
    for (const receipt of coldStorageReceipts) {
      if (receipt.id === allocateTarget?.id) continue;
      for (const row of receipt.allocations || []) {
        occupied[row.roomNumber] = (occupied[row.roomNumber] || 0) + row.boxCount;
      }
    }
    return occupied;
  };

  const handleAutoDistributeByCapacity = () => {
    if (!allocateTarget) return;
    try {
      if (allocations.reduce((sum, row) => sum + row.boxCount, 0) !== acceptedBoxes(allocateTarget)) {
        throw new Error("Brand/size quantities must total the accepted boxes before auto-distributing.");
      }
      const rows = distributeAllocationRows(allocations, allocationOccupancy());
      setAllocations(rows);
      toast.info("Boxes distributed into available room space; brand and size quantities preserved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not distribute boxes.");
    }
  };

  const handleAddAllocationRow = () => {
    if (!allocateTarget) return;
    const currentAllocated = allocations.reduce((s, a) => s + a.boxCount, 0);
    const unallocated = Math.max(0, acceptedBoxes(allocateTarget) - currentAllocated);
    const occupied = allocationOccupancy();
    for (const row of allocations) occupied[row.roomNumber] = (occupied[row.roomNumber] || 0) + row.boxCount;
    const nextRoom = COLD_STORAGE_ROOMS.find(room => (occupied[room] || 0) < COLD_ROOM_CAPACITY);
    if (!nextRoom) {
      toast.error("All rooms are full. Free space before adding another allocation.");
      return;
    }
    setAllocations([
      ...allocations,
      {
        roomNumber: nextRoom,
        brandName: allocateTarget.brandName || allocateTarget.qualityReport?.boxBrand || "",
        boxType: "",
        boxCount: Math.min(unallocated, COLD_ROOM_CAPACITY - (occupied[nextRoom] || 0)),
      },
    ]);
  };

  const handleRemoveAllocationRow = (idx: number) => {
    setAllocations(allocations.filter((_, i) => i !== idx));
  };

  const handleConfirmAllocation = async () => {
    if (!allocateTarget) return;

    try {
      validateAllocationDrafts(allocations, acceptedBoxes(allocateTarget));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid allocation.");
      return;
    }

    // Client-side hard block: every room is capped at COLD_ROOM_CAPACITY boxes.
    // Occupancy of this receipt's own previous allocations is excluded, since
    // they are replaced by this submission.
    const ownByRoom = new Map<string, number>();
    for (const a of allocateTarget.allocations || []) {
      ownByRoom.set(a.roomNumber, (ownByRoom.get(a.roomNumber) || 0) + (a.boxCount || 0));
    }

    const requestedByRoom = new Map<string, number>();
    for (const a of allocations) {
      requestedByRoom.set(a.roomNumber, (requestedByRoom.get(a.roomNumber) || 0) + (a.boxCount || 0));
    }

    const overflow: string[] = [];
    for (const [room, requested] of requestedByRoom) {
      const usedElsewhere =
        (roomOccupancySummary[room]?.totalBoxes || 0) - (ownByRoom.get(room) || 0);
      const free = Math.max(0, COLD_ROOM_CAPACITY - usedElsewhere);
      if (requested > free) {
        overflow.push(`${room} has ${free.toLocaleString("en-IN")} boxes free but ${requested.toLocaleString("en-IN")} requested`);
      }
    }

    if (overflow.length > 0) {
      toast.error("Room capacity exceeded — allocation blocked", {
        description: `${overflow.join("; ")}. Please move the balance to another room.`,
      });
      return;
    }

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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to allocate rooms");
      }

        store.setColdStorageReceipts(coldStorageReceipts.map(receipt =>
          receipt.id === allocateTarget.id ? { ...receipt, ...data.receipt } : receipt
        ));

      toast.success("Rooms Allocated & Logged!", {
        description: `Successfully allocated inventory to KD rooms across brands.`,
      });
      setAllocateTarget(null);
    } catch (e) {
      // Modal stays open so the allocation is not lost
      toast.error("Failed to sync room allocation to database", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
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
                KD Cold Storage (Kandar)
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Inbound gate verification, official KD quality reports, live stock updates, and room allocations
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("RECEIVING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "RECEIVING"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Truck className="w-3.5 h-3.5" /> Inbound Gate Intakes ({coldStorageReceipts.length})
          </button>
          <button
            onClick={() => setActiveTab("ARCHIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "ARCHIVE"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" /> Quality Reports Archive
          </button>
          <button
            onClick={() => setActiveTab("STOCK_UPDATE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "STOCK_UPDATE"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> KD Stock Update (Kandar)
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
          <button
            onClick={() => setActiveTab("CONTAINER")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "CONTAINER"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Ship className="w-3.5 h-3.5 text-indigo-600" /> Container Dispatch
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* TOP METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Banana Stock
              </span>
              <span className="text-2xl font-black text-slate-900 font-heading">
                {totalBoxesInStorage} <span className="text-xs font-semibold text-slate-500">Boxes</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                ≈ {totalTonnageInStorage} Tons Stored
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
          </Card>

          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Export Quality Batches
              </span>
              <span className="text-2xl font-black text-emerald-600 font-heading">
                {coldStorageReceipts.filter((r) => r.qualityReport?.overallQuality === "A_GRADE_EXPORT").length}
              </span>
              <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                Certified A-Grade Export
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </Card>

          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Room Utilization
              </span>
              <span className="text-2xl font-black text-slate-900 font-heading">
                {Object.values(roomOccupancySummary).filter((r) => r.totalBoxes > 0).length} / {COLD_STORAGE_ROOMS.length}
              </span>
              <span className="text-[11px] text-cyan-700 font-bold block mt-0.5">
                Active Cold Rooms
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </Card>

          <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Inbound Pending Gate
              </span>
              <span className="text-2xl font-black text-amber-700 font-heading">
                {coldStorageReceipts.filter((r) => r.status === "DISPATCHED").length}
              </span>
              <span className="text-[11px] text-amber-700 font-bold block mt-0.5">
                Trucks In-Transit
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
                              <span className="font-bold text-slate-900 text-xs block font-mono">{rec.vehicleNo}</span>
                              <span className="text-[11px] text-slate-500 block">{rec.driverName} ({rec.driverPhone})</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-4">
                            <span className="font-black text-slate-900 text-base">{rec.dispatchedTotalBoxes}</span>
                            <span className="text-[10px] text-slate-400 block">Boxes</span>
                          </TableCell>

                          <TableCell className="py-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {[
                                { k: "3H", v: rec.qualityReport?.box3H ?? rec.billData?.box3H },
                                { k: "4H", v: rec.qualityReport?.box4H ?? rec.billData?.box4H },
                                { k: "5H", v: rec.qualityReport?.box5H ?? rec.billData?.box5H },
                                { k: "6H", v: rec.qualityReport?.box6H ?? rec.billData?.box6H },
                                { k: "7H", v: rec.qualityReport?.box7H ?? rec.billData?.box7H },
                                { k: "8H", v: rec.qualityReport?.box8H ?? rec.billData?.box8H },
                              ]
                                .filter((h) => Number(h.v) > 0)
                                .map((h) => (
                                  <Badge key={h.k} variant="outline" className="bg-white text-slate-700 text-[10px] font-bold">
                                    {h.k}: {h.v}
                                  </Badge>
                                ))}
                              {!(rec.qualityReport || rec.billData) && (
                                <span className="text-[11px] text-slate-400 italic">No hand breakdown</span>
                              )}
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
                                onClick={() => handleOpenQualityReport(rec)}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1 shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verify & Log Quality
                              </Button>
                            )}

                            {rec.status === "VERIFIED_RECEIVED" && (
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setActiveVoucherTarget(rec)}
                                  className="border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs h-8 px-2.5 rounded-lg gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-700" /> View Voucher
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
                                  onClick={() => setActiveVoucherTarget(rec)}
                                  className="border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs h-8 px-2.5 rounded-lg gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-700" /> Voucher
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

        {/* ─── TAB 2: QUALITY REPORTS ARCHIVE & HISTORY ────────────────── */}
        {activeTab === "ARCHIVE" && (
          <ColdStorageQualityArchive
            receipts={coldStorageReceipts}
            onOpenEditReport={(r) => handleOpenQualityReport(r)}
          />
        )}

        {/* ─── TAB 3: KD STOCK UPDATE (KANDAR) SPREADSHEET ────────────── */}
        {activeTab === "STOCK_UPDATE" && (
          <KDColdStorageStockTable receipts={coldStorageReceipts} />
        )}

        {/* ─── TAB 5: CONTAINER DISPATCH (OUT-FLOW) ─────────────────── */}
        {activeTab === "CONTAINER" && (
          <ContainerDispatchPanel
            canCreate={true}
            canLoad={true}
            canDecide={true}
            description="Raise container load requests, confirm loading, plug-in cool or dispatch sealed with papers."
          />
        )}

        {/* ─── TAB 4: COLD ROOMS OCCUPANCY & TEMPERATURE ────────────── */}
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
                const maxCap = COLD_ROOM_CAPACITY;
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

        {/* Multi-Brand Room Allocation Modal */}
        {allocateTarget && (() => {
          const totalReceived = acceptedBoxes(allocateTarget);
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
                      <span>Accepted Boxes (excludes damage): <strong className="text-slate-950 text-sm">{totalReceived}</strong></span>
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

                      {/* Fixed Room Capacity — 27,000 boxes per room */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-semibold">Room Cap (fixed):</span>
                        <Badge variant="outline" className="h-7 bg-slate-50 text-slate-800 border-slate-300 text-[11px] font-black px-2">
                          {COLD_ROOM_CAPACITY.toLocaleString("en-IN")}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAutoDistributeByCapacity}
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
                          <Label className="text-[10px] font-bold text-slate-500 uppercase">Box Size</Label>
                          <Select value={alloc.boxType} onValueChange={(value) => {
                            setAllocations(rows => rows.map((row, index) =>
                              index === idx ? { ...row, boxType: value || "" } : row));
                          }}>
                            <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-semibold">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {Object.entries(BOX_TYPE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
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

        {/* Official KD Cold Storage Quality Report & Gate Intake Form Modal */}
        {qualityReportTarget && (
          <Dialog open onOpenChange={() => setQualityReportTarget(null)}>
            <DialogContent className="sm:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto scrollbar-thin">
              <DialogHeader className="pb-3 border-b border-slate-200 text-center">
                <div className="border-b-2 border-slate-900 pb-2 mb-2 text-center">
                  <h3 className="text-xl font-black text-slate-900 tracking-wider font-heading">
                    KIRAN DOKE FRUIT
                  </h3>
                  <h4 className="text-base font-bold text-slate-800 font-heading">
                    KD COLD STORAGE
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    GAT NO 504 KANDAR TAL KARMALA, SOLAPUR, MAHARASHTRA 413202<br />
                    Ph: +919823435133, +919112385133
                  </p>
                </div>
                <Badge className="mx-auto bg-slate-900 text-white text-xs font-black px-4 py-1 tracking-widest uppercase rounded-sm">
                  QUALITY REPORT & INTAKE VERIFICATION
                </Badge>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                {/* Auto-Prefilled Flow Details */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                    Dispatch Flow Data (Auto-Prefilled)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-medium text-slate-800">
                    <div>
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">Date</Label>
                      <Input
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="bg-white h-8 text-xs font-bold mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">Vehicle No</Label>
                      <Input
                        value={reportVehicleNo}
                        onChange={(e) => setReportVehicleNo(e.target.value)}
                        className="bg-white h-8 text-xs font-bold font-mono mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">Line Name</Label>
                      <Input
                        value={reportLineName}
                        onChange={(e) => setReportLineName(e.target.value)}
                        className="bg-white h-8 text-xs font-bold mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">Supervisor</Label>
                      <Input
                        value={reportSupervisorName}
                        onChange={(e) => setReportSupervisorName(e.target.value)}
                        className="bg-white h-8 text-xs font-bold mt-0.5"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">Vendor / Farmer Name</Label>
                      <Input
                        value={reportVendorName}
                        onChange={(e) => setReportVendorName(e.target.value)}
                        className="bg-white h-8 text-xs font-bold mt-0.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Quality Inspection Details (Admin Fills on Gate Inspection) */}
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                      Quality Details (On-Site Inspection)
                    </span>
                    <Badge variant="outline" className="bg-white text-slate-700 text-[10px] font-bold">
                      Fill / Check Upon Inspection
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Outer box quality</Label>
                      <Select value={reportOuterQuality} onValueChange={(v: any) => setReportOuterQuality(v)}>
                        <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-bold mt-1">
                          <SelectValue placeholder="Quality">{reportOuterQuality}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="GOOD">Good (Intact & Sturdy)</SelectItem>
                          <SelectItem value="FAIR">Fair (Minor Moisture)</SelectItem>
                          <SelectItem value="POOR">Poor (Crushed/Deformed)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Packing quality</Label>
                      <Select value={reportPackingQuality} onValueChange={(v: any) => setReportPackingQuality(v)}>
                        <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-bold mt-1">
                          <SelectValue placeholder="Packing">{reportPackingQuality}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="EXPORT">Export Grade (Pristine)</SelectItem>
                          <SelectItem value="DOMESTIC">Domestic Grade</SelectItem>
                          <SelectItem value="DEFECTIVE">Defective / Loose</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Number of hands</Label>
                      <Input
                        value={reportHandsCount}
                        onChange={(e) => setReportHandsCount(e.target.value)}
                        placeholder="e.g. 5-7 hands"
                        className="bg-white h-9 rounded-lg text-xs font-bold mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Finger Length/ diameter</Label>
                      <Input
                        value={reportFingerLength}
                        onChange={(e) => setReportFingerLength(e.target.value)}
                        placeholder="e.g. 18cm / 38mm"
                        className="bg-white h-9 rounded-lg text-xs font-bold mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Box weight (Kg)</Label>
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
                      <Label className="text-[11px] font-bold text-slate-700">Damage on hand</Label>
                      <Select value={reportHandDamage} onValueChange={(v: any) => setReportHandDamage(v)}>
                        <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-bold mt-1">
                          <SelectValue placeholder="Damage">{reportHandDamage}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="NONE">None (Clean Hands)</SelectItem>
                          <SelectItem value="LOW">Low (&lt;2% Bruising)</SelectItem>
                          <SelectItem value="HIGH">High (&gt;5% Bruising)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Yes/No Checklists */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 p-2 rounded-lg bg-white border border-slate-200">
                      <input
                        type="checkbox"
                        checked={reportLatexSpots}
                        onChange={(e) => setReportLatexSpots(e.target.checked)}
                        className="w-4 h-4 accent-slate-900 rounded"
                      />
                      Latex spots present?
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 p-2 rounded-lg bg-white border border-slate-200">
                      <input
                        type="checkbox"
                        checked={parseFloat(reportRedRustPercentage) > 0}
                        onChange={(e) =>
                          setReportRedRustPercentage(e.target.checked ? (reportRedRustPercentage || "1") : "")
                        }
                        className="w-4 h-4 accent-slate-900 rounded"
                      />
                      Red rust present?
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 p-2 rounded-lg bg-white border border-slate-200">
                      <input
                        type="checkbox"
                        checked={reportFlowerRemoved}
                        onChange={(e) => setReportFlowerRemoved(e.target.checked)}
                        className="w-4 h-4 accent-slate-900 rounded"
                      />
                      Flower removed?
                    </label>
                  </div>

                  {/* Red rust percentage — typed value, blocks submission when ticked but blank */}
                  <div className="pt-2">
                    <Label className="text-[11px] font-bold text-slate-700">Red rust percentage (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={reportRedRustPercentage}
                      onChange={(e) => setReportRedRustPercentage(e.target.value)}
                      placeholder="e.g. 2 (leave blank if none)"
                      className="bg-white h-9 rounded-lg text-xs font-bold mt-1"
                    />
                  </div>

                  {/* Overall Quality Rating */}
                  <div className="pt-2">
                    <Label className="text-[11px] font-bold text-slate-700">Overall quality rating</Label>
                    <Select value={reportOverallQuality} onValueChange={(v: any) => setReportOverallQuality(v)}>
                      <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-black mt-1">
                        <SelectValue placeholder="Rating">{reportOverallQuality}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="A_GRADE_EXPORT">A-Grade Export (Certified Full Pass)</SelectItem>
                        <SelectItem value="B_GRADE">B-Grade (Domestic Market)</SelectItem>
                        <SelectItem value="REJECTED">Rejected / Unfit for Export</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Particulars (Brand) & Hand Breakdown */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex-1 w-full">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Particulars (Box Brand)</Label>
                      <Input
                        value={reportBrand}
                        onChange={(e) => setReportBrand(e.target.value)}
                        placeholder="e.g. StarPremium 13Kg"
                        className="bg-white h-8 text-xs font-bold mt-0.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-1 font-bold">
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase">3H</Label>
                      <Input
                        type="number"
                        value={reportBox3H || ""}
                        onChange={(e) => setReportBox3H(parseInt(e.target.value) || 0)}
                        className="bg-white h-8 text-center text-xs font-bold mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase">4H</Label>
                      <Input
                        type="number"
                        value={reportBox4H || ""}
                        onChange={(e) => setReportBox4H(parseInt(e.target.value) || 0)}
                        className="bg-white h-8 text-center text-xs font-bold mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase">5H</Label>
                      <Input
                        type="number"
                        value={reportBox5H || ""}
                        onChange={(e) => setReportBox5H(parseInt(e.target.value) || 0)}
                        className="bg-white h-8 text-center text-xs font-bold mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase">6H</Label>
                      <Input
                        type="number"
                        value={reportBox6H || ""}
                        onChange={(e) => setReportBox6H(parseInt(e.target.value) || 0)}
                        className="bg-white h-8 text-center text-xs font-bold mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase">7H</Label>
                      <Input
                        type="number"
                        value={reportBox7H || ""}
                        onChange={(e) => setReportBox7H(parseInt(e.target.value) || 0)}
                        className="bg-white h-8 text-center text-xs font-bold mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase">8H</Label>
                      <Input
                        type="number"
                        value={reportBox8H || ""}
                        onChange={(e) => setReportBox8H(parseInt(e.target.value) || 0)}
                        className="bg-white h-8 text-center text-xs font-bold mt-0.5"
                      />
                    </div>
                  </div>

                  {/* Total Box & Damage Box */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <Label className="font-bold text-slate-800 text-[11px]">Total Boxes Dispatched / Received:</Label>
                      <Input
                        type="number"
                        value={reportTotalBoxes}
                        onChange={(e) => setReportTotalBoxes(parseInt(e.target.value) || 0)}
                        className="bg-white h-9 font-black rounded-lg text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="font-bold text-rose-700 text-[11px]">Damage Boxes (At Cold Storage):</Label>
                      <Input
                        type="number"
                        value={reportDamageBoxes}
                        onChange={(e) => setReportDamageBoxes(e.target.value)}
                        className="bg-white border-rose-200 text-rose-900 h-9 font-black rounded-lg text-xs mt-1"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center font-bold text-emerald-900 text-xs">
                    Net Accepted Stock: <strong>{Math.max(0, reportTotalBoxes - (parseInt(reportDamageBoxes) || 0))} Boxes</strong>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-3 border-t border-slate-200">
                <Button variant="outline" onClick={() => setQualityReportTarget(null)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button onClick={handleSaveQualityReport} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Save Official Quality Report & Verify
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Active Voucher Printable & WhatsApp Sharing Modal */}
        {activeVoucherTarget && (
          <ColdStorageQualityVoucherModal
            receipt={activeVoucherTarget}
            qualityReport={activeVoucherTarget.qualityReport}
            isOpen={true}
            onClose={() => setActiveVoucherTarget(null)}
          />
        )}
      </div>
    </div>
  );
}
