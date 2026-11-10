"use client";

import React, { useState, useMemo } from "react";
import { ColdStorageReceipt, KDColdStorageQualityReport } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Printer,
  Share2,
  Search,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Truck,
  ShieldCheck,
  Download,
  Calendar,
  Layers,
  Sparkles,
  Award,
  X,
} from "lucide-react";
import { ColdStorageQualityVoucherModal, generateColdStorageQualityWhatsApp, cleanBrandName } from "./ColdStorageQualityVoucherModal";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { shareReportMessage } from "@/lib/share";
import { toast } from "sonner";

interface ArchiveProps {
  receipts: ColdStorageReceipt[];
  onOpenEditReport?: (receipt: ColdStorageReceipt) => void;
}

function parseReceiptDate(rec: ColdStorageReceipt): Date | null {
  if (rec.qualityReport?.date) {
    const parts = rec.qualityReport.date.trim().split(/[/.-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(d.getTime())) return d;
      } else {
        // DD/MM/YYYY or DD-MM-YYYY
        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        if (!isNaN(d.getTime())) return d;
      }
    }
    const d = new Date(rec.qualityReport.date);
    if (!isNaN(d.getTime())) return d;
  }
  if (rec.receivedAt) {
    const d = new Date(rec.receivedAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (rec.allocatedAt) {
    const d = new Date(rec.allocatedAt);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function ColdStorageQualityArchive({
  receipts,
  onOpenEditReport,
}: ArchiveProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activeVoucherReceipt, setActiveVoucherReceipt] = useState<ColdStorageReceipt | null>(null);

  // Filter receipts that have either completed verification or logged a quality report
  const verifiedReceipts = useMemo(() => {
    return receipts.filter((r) => {
      return r.qualityReport || r.status === "VERIFIED_RECEIVED" || r.status === "ALLOCATED_TO_ROOMS";
    });
  }, [receipts]);

  // Aggregate available distinct arrival dates for quick 1-click filtering
  const arrivalDateSummaries = useMemo(() => {
    const map = new Map<string, { dateKey: string; displayDate: string; count: number }>();
    verifiedReceipts.forEach((r) => {
      const d = parseReceiptDate(r);
      if (!d) return;
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const displayDate = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
      const boxes = r.verifiedBoxCount || r.dispatchedTotalBoxes || 0;
      const cur = map.get(dateKey) || { dateKey, displayDate, count: 0 };
      cur.count += boxes;
      map.set(dateKey, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [verifiedReceipts]);

  // Apply search & date range filters
  const filteredList = useMemo(() => {
    return verifiedReceipts.filter((r) => {
      const q = searchTerm.toLowerCase();
      const report = r.qualityReport;
      const farmer = (r.farmerName || "").toLowerCase();
      const vehicle = (r.vehicleNo || "").toLowerCase();
      const supervisor = (report?.supervisorName || r.billData?.supervisorName || "").toLowerCase();
      const line = (report?.lineName || r.billData?.lineName || "").toLowerCase();
      const brand = (report?.boxBrand || r.billData?.orchardParticulars || r.brandName || "").toLowerCase();

      const matchesSearch =
        farmer.includes(q) ||
        vehicle.includes(q) ||
        supervisor.includes(q) ||
        line.includes(q) ||
        brand.includes(q);

      let matchesDate = true;
      if (startDate || endDate) {
        const d = parseReceiptDate(r);
        if (d) {
          if (startDate) {
            const [sy, sm, sd] = startDate.split("-").map(Number);
            const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
            if (d < start) matchesDate = false;
          }
          if (endDate) {
            const [ey, em, ed] = endDate.split("-").map(Number);
            const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
            if (d > end) matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [verifiedReceipts, searchTerm, startDate, endDate]);

  // KPI calculations
  const stats = useMemo(() => {
    let totalBoxes = 0;
    let totalDamages = 0;

    filteredList.forEach((r) => {
      const count = r.verifiedBoxCount || r.dispatchedTotalBoxes || 0;
      const dam = r.qualityReport?.damageBox || 0;
      totalBoxes += count;
      totalDamages += dam;
    });

    const netAccepted = Math.max(0, totalBoxes - totalDamages);
    const passRate = totalBoxes > 0 ? ((netAccepted / totalBoxes) * 100).toFixed(1) : "100";

    return {
      totalReports: filteredList.length,
      totalBoxes,
      totalDamages,
      netAccepted,
      passRate,
    };
  }, [filteredList]);

  const handleShareDirectWhatsApp = async (receipt: ColdStorageReceipt) => {
    const report = receipt.qualityReport || ({} as Partial<KDColdStorageQualityReport>);
    const text = generateColdStorageQualityWhatsApp(report, receipt);
    await shareReportMessage(text, "Cold Storage Quality Report");
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Verified Intake Reports
            </span>
            <span className="text-2xl font-black text-slate-900 font-heading">
              {stats.totalReports}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
              Saved Permanently in DB
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <FileText className="w-5 h-5 text-cyan-400" />
          </div>
        </Card>

        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Boxes Inspected
            </span>
            <span className="text-2xl font-black text-slate-900 font-heading">
              {stats.totalBoxes}
            </span>
            <span className="text-[11px] text-cyan-700 font-bold block mt-0.5">
              Across Inbound Trucks
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </Card>

        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Net Accepted Boxes
            </span>
            <span className="text-2xl font-black text-emerald-600 font-heading">
              {stats.netAccepted}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
              Pass Rate: {stats.passRate}%
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
        </Card>

        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Gate Damaged Boxes
            </span>
            <span className="text-2xl font-black text-rose-600 font-heading">
              {stats.totalDamages}
            </span>
            <span className="text-[11px] text-rose-700 font-bold block mt-0.5">
              Filtered & Discarded
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filter & Search Toolbar */}
      <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search quality reports by Farmer, Vehicle, Line, Supervisor, or Brand..."
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

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={({ startDate: s, endDate: e }) => {
                setStartDate(s);
                setEndDate(e);
              }}
              className="w-full sm:w-auto"
            />

            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="h-9 px-2 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Reset Dates
              </Button>
            )}
          </div>
        </div>

        {/* 1-Click Arrival Dates Filter Strip */}
        {arrivalDateSummaries.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 mt-1 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Arrival Dates:
            </span>
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                !startDate && !endDate
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Dates ({verifiedReceipts.length})
            </button>
            {arrivalDateSummaries.map((b) => {
              const isSelected = startDate === b.dateKey && endDate === b.dateKey;
              return (
                <button
                  key={b.dateKey}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setStartDate("");
                      setEndDate("");
                    } else {
                      setStartDate(b.dateKey);
                      setEndDate(b.dateKey);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300/40"
                      : "bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                >
                  <span>{b.displayDate}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? "bg-emerald-800 text-white font-black" : "bg-slate-100 text-slate-700 font-bold"
                    }`}
                  >
                    {b.count} bx
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Quality Reports Archive Table */}
      <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
            Official KD Cold Storage Quality Reports & Gate Receipts Archive
          </CardTitle>
          <div className="flex items-center gap-2">
            {(startDate || endDate) && (
              <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300 text-[10px] font-bold">
                Filtered: {startDate || "Start"} to {endDate || "Today"}
              </Badge>
            )}
            <Badge className="bg-slate-900 text-white text-xs font-bold px-3 py-0.5">
              {filteredList.length} Verified Records
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 border-b border-slate-200">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-4 sm:pl-6 py-3.5 whitespace-nowrap">Date & Truck</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5 whitespace-nowrap">Farmer & Line</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5 whitespace-nowrap">Brand & Hands</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5 whitespace-nowrap">Box Audit</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider py-3.5 whitespace-nowrap">Quality Calibration</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase tracking-wider pr-4 sm:pr-6 text-right py-3.5 whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-semibold">
                    No quality reports found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((rec) => {
                  const report = rec.qualityReport;
                  const dateStr = report?.date || (rec.receivedAt ? new Date(rec.receivedAt).toLocaleDateString("en-IN") : "Today");
                  const total = report?.totalBox || rec.verifiedBoxCount || rec.dispatchedTotalBoxes;
                  const damage = report?.damageBox || 0;
                  const net = Math.max(0, total - damage);
                  const rawBrand = report?.boxBrand || rec.billData?.orchardParticulars || rec.brandName || "Joy Banana";
                  const brand = cleanBrandName(rawBrand);
                  const intakeId = rec.billData?.intakeId || rec.harvestTask?.procurementTaskId || rec.harvestTaskId || rec.id;

                  return (
                    <TableRow key={rec.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <TableCell className="pl-4 sm:pl-6 py-3.5 whitespace-nowrap">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded border border-slate-200">
                              #{intakeId}
                            </span>
                            <span className="font-mono text-xs text-sky-800 font-black">
                              {rec.vehicleNo}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-semibold text-slate-500 text-[11px] mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {dateStr}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div>
                          <p className="font-bold text-slate-900 text-xs whitespace-nowrap">{rec.farmerName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[170px]">
                            Line: <strong>{report?.lineName || rec.billData?.lineName || "Line 1"}</strong> • Sup: {report?.supervisorName || rec.billData?.supervisorName || "Dinesh"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div>
                          <Badge variant="outline" className="bg-slate-50 border-slate-300 text-slate-900 text-[10px] font-bold px-1.5 py-0 h-5 max-w-[130px] truncate">
                            {brand}
                          </Badge>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-600 font-mono whitespace-nowrap">
                            <span>4H: {report?.box4H || rec.billData?.box4H || 0}</span> |{" "}
                            <span>5H: {report?.box5H || rec.billData?.box5H || 0}</span> |{" "}
                            <span>6H: {report?.box6H || rec.billData?.box6H || 0}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 whitespace-nowrap">
                        <div>
                          <span className="font-black text-slate-900 text-sm font-mono">{net} Accepted</span>
                          <span className="text-[10px] text-slate-500 block">
                            (Total {total} - {damage} Damaged)
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="text-[11px] space-y-0.5 text-slate-700 font-medium whitespace-nowrap">
                          <div>Outer: <strong>{report?.outerBoxQuality || "Good"}</strong> • Pack: <strong>{report?.packingQuality || "Export"}</strong></div>
                          <div>Hands: <strong>{report?.numberOfHands || "5-7"}</strong> • Wt: <strong>{report?.boxWeightKg || 13.5} kg</strong></div>
                        </div>
                      </TableCell>

                      <TableCell className="pr-4 sm:pr-6 text-right py-3.5 whitespace-nowrap space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveVoucherReceipt(rec)}
                          className="border-slate-300 hover:bg-slate-100 text-slate-900 font-bold text-xs h-8 px-2.5 rounded-lg gap-1 shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-700" /> Voucher
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShareDirectWhatsApp(rec)}
                          className="border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs h-8 px-2.5 rounded-lg gap-1"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Official Voucher Printable & Interactive Modal */}
      {activeVoucherReceipt && (
        <ColdStorageQualityVoucherModal
          receipt={activeVoucherReceipt}
          qualityReport={activeVoucherReceipt.qualityReport}
          isOpen={true}
          onClose={() => setActiveVoucherReceipt(null)}
        />
      )}
    </div>
  );
}
