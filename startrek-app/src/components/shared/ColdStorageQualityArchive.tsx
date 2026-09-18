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
} from "lucide-react";
import { ColdStorageQualityVoucherModal, generateColdStorageQualityWhatsApp } from "./ColdStorageQualityVoucherModal";
import { shareReportMessage } from "@/lib/share";
import { toast } from "sonner";

interface ArchiveProps {
  receipts: ColdStorageReceipt[];
  onOpenEditReport?: (receipt: ColdStorageReceipt) => void;
}

export function ColdStorageQualityArchive({
  receipts,
  onOpenEditReport,
}: ArchiveProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [activeVoucherReceipt, setActiveVoucherReceipt] = useState<ColdStorageReceipt | null>(null);

  // Filter receipts that have either completed verification or logged a quality report
  const verifiedReceipts = useMemo(() => {
    return receipts.filter((r) => {
      // Must be at least gate verified or have quality report
      return r.qualityReport || r.status === "VERIFIED_RECEIVED" || r.status === "ALLOCATED_TO_ROOMS";
    });
  }, [receipts]);

  // Apply search & grade filters
  const filteredList = useMemo(() => {
    return verifiedReceipts.filter((r) => {
      const q = searchTerm.toLowerCase();
      const report = r.qualityReport;
      const farmer = (r.farmerName || "").toLowerCase();
      const vehicle = (r.vehicleNo || "").toLowerCase();
      const supervisor = (report?.supervisorName || r.billData?.supervisorName || "").toLowerCase();
      const line = (report?.lineName || r.billData?.lineName || "").toLowerCase();
      const brand = (report?.boxBrand || r.billData?.orchardParticulars || r.brandName || "").toLowerCase();
      const grade = report?.overallQuality || "A_GRADE_EXPORT";

      const matchesSearch =
        farmer.includes(q) ||
        vehicle.includes(q) ||
        supervisor.includes(q) ||
        line.includes(q) ||
        brand.includes(q);

      const matchesGrade =
        gradeFilter === "ALL" ||
        (gradeFilter === "A_GRADE" && grade === "A_GRADE_EXPORT") ||
        (gradeFilter === "B_GRADE" && grade === "B_GRADE") ||
        (gradeFilter === "REJECTED" && grade === "REJECTED");

      return matchesSearch && matchesGrade;
    });
  }, [verifiedReceipts, searchTerm, gradeFilter]);

  // KPI calculations
  const stats = useMemo(() => {
    let totalBoxes = 0;
    let totalDamages = 0;
    let aGradeCount = 0;

    verifiedReceipts.forEach((r) => {
      const count = r.verifiedBoxCount || r.dispatchedTotalBoxes || 0;
      const dam = r.qualityReport?.damageBox || 0;
      totalBoxes += count;
      totalDamages += dam;
      if (!r.qualityReport || r.qualityReport.overallQuality === "A_GRADE_EXPORT") {
        aGradeCount++;
      }
    });

    const passRate = totalBoxes > 0 ? (((totalBoxes - totalDamages) / totalBoxes) * 100).toFixed(1) : "100";

    return {
      totalReports: verifiedReceipts.length,
      totalBoxes,
      totalDamages,
      passRate,
      aGradeCount,
    };
  }, [verifiedReceipts]);

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
              Net Accepted: {stats.totalBoxes - stats.totalDamages} Boxes
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </Card>

        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Quality Pass Rate
            </span>
            <span className="text-2xl font-black text-emerald-600 font-heading">
              {stats.passRate}%
            </span>
            <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
              {stats.aGradeCount} A-Grade Batches
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setGradeFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  gradeFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Grades
              </button>
              <button
                onClick={() => setGradeFilter("A_GRADE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  gradeFilter === "A_GRADE"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                A-Grade Export
              </button>
              <button
                onClick={() => setGradeFilter("B_GRADE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  gradeFilter === "B_GRADE"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                B-Grade
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Quality Reports Archive Table */}
      <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
            Official KD Cold Storage Quality Reports & Gate Receipts Archive
          </CardTitle>
          <Badge className="bg-slate-900 text-white text-xs font-bold px-3 py-0.5">
            {filteredList.length} Verified Records
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-500 uppercase pl-6 py-3">Date & Truck</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Farmer & Line</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Brand & Hands</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Box Audit</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Quality Calibration</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Overall Grade</TableHead>
                <TableHead className="text-xs font-bold text-slate-500 uppercase pr-6 text-right py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 font-semibold">
                    No quality reports found. Once inbound gate verification is submitted, completed reports appear here!
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((rec) => {
                  const report = rec.qualityReport;
                  const dateStr = report?.date || (rec.receivedAt ? new Date(rec.receivedAt).toLocaleDateString("en-IN") : "Today");
                  const total = report?.totalBox || rec.verifiedBoxCount || rec.dispatchedTotalBoxes;
                  const damage = report?.damageBox || 0;
                  const net = total - damage;
                  const brand = report?.boxBrand || rec.billData?.orchardParticulars || rec.brandName || "StarPremium 13Kg";
                  const overallGrade = report?.overallQuality || "A_GRADE_EXPORT";

                  return (
                    <TableRow key={rec.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <TableCell className="pl-6 py-4">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {dateStr}
                          </div>
                          <span className="font-mono text-xs text-sky-800 font-black block mt-0.5">
                            {rec.vehicleNo}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{rec.farmerName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Line: <strong>{report?.lineName || rec.billData?.lineName || "Line 1"}</strong> • Sup: {report?.supervisorName || rec.billData?.supervisorName || "Dinesh"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div>
                          <Badge variant="outline" className="bg-slate-50 border-slate-300 text-slate-900 text-[11px] font-bold">
                            {brand}
                          </Badge>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-600 font-mono">
                            <span>4H: {report?.box4H || rec.billData?.box4H || 0}</span> |{" "}
                            <span>5H: {report?.box5H || rec.billData?.box5H || 0}</span> |{" "}
                            <span>6H: {report?.box6H || rec.billData?.box6H || 0}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div>
                          <span className="font-black text-slate-900 text-sm font-mono">{net} Good</span>
                          <span className="text-[10px] text-slate-500 block">
                            (Total {total} - {damage} Damaged)
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <div className="text-[11px] space-y-0.5 text-slate-700 font-medium">
                          <div>Outer: <strong>{report?.outerBoxQuality || "Good"}</strong> • Pack: <strong>{report?.packingQuality || "Export"}</strong></div>
                          <div>Hands: <strong>{report?.numberOfHands || "5-7"}</strong> • Wt: <strong>{report?.boxWeightKg || 13.5} kg</strong></div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={`text-xs font-black px-2.5 py-0.5 border ${
                            overallGrade === "A_GRADE_EXPORT"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : overallGrade === "B_GRADE"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-rose-50 text-rose-800 border-rose-300"
                          }`}
                        >
                          {overallGrade === "A_GRADE_EXPORT"
                            ? "A-GRADE EXPORT"
                            : overallGrade === "B_GRADE"
                            ? "B-GRADE"
                            : "REJECTED"}
                        </Badge>
                      </TableCell>

                      <TableCell className="pr-6 text-right py-4 space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveVoucherReceipt(rec)}
                          className="border-slate-300 hover:bg-slate-100 text-slate-900 font-bold text-xs h-8 px-2.5 rounded-lg gap-1 shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-700" /> View Voucher
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
