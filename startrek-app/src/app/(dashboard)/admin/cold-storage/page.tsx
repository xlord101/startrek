"use client";

import { useState, useCallback } from "react";
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
        if (r.status === 401) window.location.href = '/login';
        return r.json();
      })
      .then((data) => {
        if (data.receipts) {
          store.setColdStorageReceipts(data.receipts);
        }
      })
      .catch(() => {});
  }, []);

  // Focus/visibility-aware live refresh instead of blind 5s polling
  useLiveData([fetchColdStorage]);

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
  const [discrepancyNote, setDiscrepancyNote] = useState<string>("");

  // Multi-Brand Room Allocation Modal
  const [allocateTarget, setAllocateTarget] = useState<ColdStorageReceipt | null>(null);
  const [allocations, setAllocations] = useState<
    { roomNumber: string; brandName: string; boxCount: number }[]
  >([
    { roomNumber: COLD_STORAGE_ROOMS[0], brandName: BRAND_NAMES[0], boxCount: 600 },
    { roomNumber: COLD_STORAGE_ROOMS[0], brandName: BRAND_NAMES[1], boxCount: 200 },
    { roomNumber: COLD_STORAGE_ROOMS[2], brandName: BRAND_NAMES[2], boxCount: 307 },
  ]);

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
  };

  const handleAddAllocationRow = () => {
    setAllocations([
      ...allocations,
      { roomNumber: COLD_STORAGE_ROOMS[0], brandName: BRAND_NAMES[0], boxCount: 100 },
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-heading">
                Cold Storage Receiving & Multi-Brand Room Allocation
              </h1>
              <Badge className="bg-cyan-50 text-cyan-800 border-cyan-200 text-[10px] font-bold">
                Cold Storage Admin
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Cross-verify incoming truck dispatches and allocate different brands into cold rooms
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Cold Rooms Status Grid */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Active Cold Storage Rooms Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COLD_STORAGE_ROOMS.slice(0, 3).map((room, idx) => {
              // Calculate real box count for this room from allocated receipts
              const roomReceipts = coldStorageReceipts.filter(
                (r) => r.allocations && r.allocations.some((a: any) => a.roomNumber === room)
              );

              const totalBoxesInRoom = roomReceipts.reduce((acc, r) => {
                const alloc = r.allocations?.find((a: any) => a.roomNumber === room);
                return acc + (alloc ? alloc.boxCount : 0);
              }, 0);

              return (
                <Card key={idx} className="border-slate-200 bg-white shadow-card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cyan-600" />
                      {room}
                    </h3>
                    <Badge className={totalBoxesInRoom > 0 ? "bg-emerald-50 text-emerald-800 text-[10px] font-bold" : "bg-slate-100 text-slate-600 text-[10px] font-bold"}>
                      {totalBoxesInRoom > 0 ? "Active Storage" : "Empty / Available"}
                    </Badge>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Allocated Occupancy:</span>
                      <strong className="text-slate-900 font-mono">{totalBoxesInRoom} Boxes</strong>
                    </div>
                    {totalBoxesInRoom === 0 && (
                      <p className="text-[11px] text-slate-400 italic">No truck dispatches allocated to this room yet</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Incoming Dispatches Table */}
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
              <Truck className="w-4.5 h-4.5 text-cyan-600" />
              Incoming Truck Dispatches & Bill Verification
            </CardTitle>
            <Badge className="bg-cyan-100 text-cyan-900 border-cyan-300 text-xs font-bold px-2.5 py-0.5">
              {coldStorageReceipts.length} Active Dispatches
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase pl-6 py-3">Farmer & Location</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Vehicle & Driver</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Dispatched Boxes</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Particular Breakdown</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Status</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase pr-6 text-right py-3">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coldStorageReceipts.map((rec) => (
                  <TableRow key={rec.id} className="border-b border-slate-100">
                    <TableCell className="pl-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{rec.farmerName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" /> {rec.billData.location}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{rec.vehicleNo}</span>
                        <span className="text-[11px] text-slate-500 block">{rec.driverName} ({rec.driverPhone})</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4 font-black text-slate-900 text-base">
                      {rec.dispatchedTotalBoxes}
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        <Badge variant="outline" className="bg-white text-slate-700 text-[10px]">4H: {rec.billData.box4H}</Badge>
                        <Badge variant="outline" className="bg-white text-slate-700 text-[10px]">5H: {rec.billData.box5H}</Badge>
                        <Badge variant="outline" className="bg-white text-slate-700 text-[10px]">6H: {rec.billData.box6H}</Badge>
                        <Badge variant="outline" className="bg-white text-slate-700 text-[10px]">7H: {rec.billData.box7H}</Badge>
                        <Badge variant="outline" className="bg-white text-slate-700 text-[10px]">8H: {rec.billData.box8H}</Badge>
                      </div>
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
                          ? "DISPATCHED EN-ROUTE"
                          : rec.status === "VERIFIED_RECEIVED"
                          ? "COUNT VERIFIED"
                          : "ROOM ALLOCATED"}
                      </Badge>
                    </TableCell>

                    <TableCell className="pr-6 text-right py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenQualityReport(rec)}
                          className="border-indigo-200 text-indigo-800 hover:bg-indigo-50 font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" /> KD Quality Report
                        </Button>
                        {rec.status === "DISPATCHED" && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenVerify(rec)}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" /> Verify Box Count
                          </Button>
                        )}
                        {(rec.status === "VERIFIED_RECEIVED" || rec.status === "DISPATCHED") && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenAllocate(rec)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-xs"
                          >
                            <Layers className="w-3.5 h-3.5" /> Allocate Rooms
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Verification Modal */}
        {verifyTarget && (
          <Dialog open onOpenChange={() => setVerifyTarget(null)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-cyan-800 text-lg font-bold">
                  <ShieldCheck className="w-5 h-5" />
                  Cross-Verify Received Box Count
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <p><strong>Truck:</strong> {verifyTarget.vehicleNo} ({verifyTarget.driverName})</p>
                  <p><strong>Farmer:</strong> {verifyTarget.farmerName}</p>
                  <p><strong>Bill Total Dispatched:</strong> {verifyTarget.dispatchedTotalBoxes} Boxes</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Actual Physically Unloaded Box Count</Label>
                  <Input
                    type="number"
                    value={verifiedCountInput}
                    onChange={(e) => setVerifiedCountInput(parseInt(e.target.value) || 0)}
                    className="bg-white border-slate-300 text-slate-900 font-black h-12 rounded-xl text-base"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setVerifyTarget(null)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button onClick={handleConfirmVerify} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Confirm Verified Count
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Multi-Brand Room Allocation Modal */}
        {allocateTarget && (
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
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Total Boxes Received: {allocateTarget.verifiedBoxCount || allocateTarget.dispatchedTotalBoxes}</span>
                  <span className="text-emerald-700 font-black">
                    Allocated Total: {allocations.reduce((s, a) => s + a.boxCount, 0)} Boxes
                  </span>
                </div>

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
                            <SelectValue />
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
                            <SelectValue />
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
                          value={alloc.boxCount}
                          onChange={(e) => {
                            const copy = [...allocations];
                            copy[idx].boxCount = parseInt(e.target.value) || 0;
                            setAllocations(copy);
                          }}
                          className="bg-white h-9 rounded-lg text-xs font-bold"
                        />
                      </div>

                      <div className="sm:col-span-1 text-right pt-4 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveAllocationRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        )}

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

                {/* Quality Details Section */}
                <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-white">
                  <h5 className="font-bold text-slate-900 uppercase text-xs tracking-wider border-b border-slate-100 pb-1">
                    Quality Assessment Details
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Outer Box Quality</Label>
                      <Select value={reportOuterQuality} onValueChange={(v: any) => setReportOuterQuality(v)}>
                        <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-bold mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="GOOD">GOOD (Export Standard)</SelectItem>
                          <SelectItem value="FAIR">FAIR (Minor Wrinkles)</SelectItem>
                          <SelectItem value="POOR">POOR (Damaged Outer)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">Packing Quality</Label>
                      <Select value={reportPackingQuality} onValueChange={(v: any) => setReportPackingQuality(v)}>
                        <SelectTrigger className="bg-white h-9 rounded-lg text-xs font-bold mt-1">
                          <SelectValue />
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
                          <SelectValue />
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
