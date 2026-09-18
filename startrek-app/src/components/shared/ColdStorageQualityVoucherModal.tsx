"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Share2, Check, Download, FileText, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { ColdStorageReceipt, KDColdStorageQualityReport } from "@/types";
import { shareReportMessage, copyToClipboard } from "@/lib/share";
import { toast } from "sonner";

interface VoucherProps {
  receipt: ColdStorageReceipt;
  qualityReport?: KDColdStorageQualityReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export function generateColdStorageQualityWhatsApp(
  report: Partial<KDColdStorageQualityReport>,
  receipt: ColdStorageReceipt
) {
  const dateStr = report.date || new Date().toLocaleDateString("en-IN");
  const vehicle = report.vehicleNo || receipt.vehicleNo;
  const line = report.lineName || receipt.billData?.lineName || "Line 1";
  const supervisor = report.supervisorName || receipt.billData?.supervisorName || "Supervisor";
  const vendor = report.vendorName || receipt.billData?.vendorName || receipt.farmerName;
  const brand = report.boxBrand || receipt.billData?.orchardParticulars || receipt.brandName || "StarPremium 13Kg";
  
  const total = report.totalBox || receipt.verifiedBoxCount || receipt.dispatchedTotalBoxes;
  const damage = report.damageBox || 0;
  const net = total - damage;

  const qualityGrade =
    report.overallQuality === "A_GRADE_EXPORT"
      ? "A-Grade Export"
      : report.overallQuality === "B_GRADE"
      ? "B-Grade"
      : "Rejected";

  return `===========================
             KIRAN DOKE FRUIT
===========================
             KD COLD STORAGE
GAT NO 504 KANDAR TAL KARMALA, SOLAPUR ,MAHARASHTRA 413202
Ph: +919823435133, +919112385133
===========================
            QUALITY REPORT
===========================
Date : ${dateStr}

Vehicle No : ${vehicle}
===========================
Line Name : ${line}

Supervisor Name : ${supervisor}

Vendor Name : ${vendor}
===========================
Quality Details - 

Outer box quality : ${report.outerBoxQuality || "Good"}
Packing quality : ${report.packingQuality || "Export"}
Number of hands : ${report.numberOfHands || "5-7 hands"}
Finger Length/ diameter : ${report.fingerLengthDiameter || "18cm / 38mm"}
Box weight : ${report.boxWeightKg || 13.5} kg
Damage on hand : ${report.damageOnHand || "None"}
Latex spots : ${report.latexSpots ? "Yes" : "No"}
Red rust : ${
    report.redRustPercentage != null
      ? `${report.redRustPercentage}%`
      : report.redRust
      ? "Yes"
      : "0%"
  }
Flower removed? : ${report.flowerRemoved ? "Yes" : "No"}
Overall quality : ${qualityGrade}

===========================
Particulars : ${brand}
3H : ${report.box3H || 0}
4H : ${report.box4H || 0}
5H : ${report.box5H || 0}
6H : ${report.box6H || 0}
7H : ${report.box7H || 0}
8H : ${report.box8H || 0}
===========================
Total Box : ${total}
===========================
Damage Box : ${damage}
===========================
Net Accepted Stock : ${net}
===========================`;
}

export function ColdStorageQualityVoucherModal({
  receipt,
  qualityReport,
  isOpen,
  onClose,
}: VoucherProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const report = qualityReport || receipt.qualityReport || ({} as Partial<KDColdStorageQualityReport>);
  const dateStr = report.date || new Date().toLocaleDateString("en-IN");
  const vehicle = report.vehicleNo || receipt.vehicleNo;
  const line = report.lineName || receipt.billData?.lineName || "Line 1";
  const supervisor = report.supervisorName || receipt.billData?.supervisorName || "Supervisor";
  const vendor = report.vendorName || receipt.billData?.vendorName || receipt.farmerName;
  const brand = report.boxBrand || receipt.billData?.orchardParticulars || receipt.brandName || "StarPremium 13Kg";

  const total = report.totalBox || receipt.verifiedBoxCount || receipt.dispatchedTotalBoxes;
  const damage = report.damageBox || 0;
  const net = total - damage;

  const qualityGrade =
    report.overallQuality === "A_GRADE_EXPORT"
      ? "A-Grade Export"
      : report.overallQuality === "B_GRADE"
      ? "B-Grade"
      : "Rejected";

  const redRustDisplay =
    report.redRustPercentage != null
      ? `${report.redRustPercentage}%`
      : report.redRust
      ? "⚠️ Present"
      : "0%";

  const whatsAppText = generateColdStorageQualityWhatsApp(report, receipt);

  const handleShare = async () => {
    setCopied(false);
    await shareReportMessage(whatsAppText, "Cold Storage Quality Report");
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(whatsAppText);
    if (ok) {
      setCopied(true);
      toast.success("Quality Report Copied to Clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Could not copy the report text");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl bg-white border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden max-h-[94vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm font-heading">
              Official Quality Report Voucher & Verification Record
            </span>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-black tracking-widest uppercase">
            {qualityGrade}
          </Badge>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 print:p-0 print:m-0" id="printable-quality-report">
          {/* Printable Letterhead */}
          <div className="border-2 border-slate-900 rounded-xl p-5 bg-white text-center space-y-1 shadow-2xs">
            <div className="border-b-2 border-slate-900 pb-2 mb-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-wider font-heading">
                KIRAN DOKE FRUIT
              </h2>
              <h3 className="text-base font-bold text-slate-800 tracking-wide font-heading">
                KD COLD STORAGE
              </h3>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                GAT NO 504 KANDAR TAL KARMALA, SOLAPUR, MAHARASHTRA 413202<br />
                Ph: +919823435133, +919112385133
              </p>
            </div>

            <div className="inline-block bg-slate-900 text-white text-xs font-black px-6 py-1 tracking-widest uppercase rounded-sm">
              QUALITY REPORT
            </div>
          </div>

          {/* Core Dispatch Details Grid */}
          <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-2 divide-x divide-slate-300 bg-slate-50/80 border-b border-slate-300 p-3 font-semibold">
              <div>
                <span className="text-slate-500">Date: </span>
                <strong className="text-slate-900 font-bold">{dateStr}</strong>
              </div>
              <div className="pl-3">
                <span className="text-slate-500">Vehicle No: </span>
                <strong className="text-slate-900 font-bold font-mono">{vehicle}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 p-3 font-medium">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Line Name</span>
                <strong className="text-slate-900 font-bold text-xs">{line}</strong>
              </div>
              <div className="sm:pl-3 pt-2 sm:pt-0">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Supervisor Name</span>
                <strong className="text-slate-900 font-bold text-xs">{supervisor}</strong>
              </div>
              <div className="sm:pl-3 pt-2 sm:pt-0">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Vendor / Farmer Name</span>
                <strong className="text-slate-900 font-bold text-xs">{vendor}</strong>
              </div>
            </div>
          </div>

          {/* Quality Details Section */}
          <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-900 text-white px-4 py-2 font-bold flex justify-between items-center">
              <span>Quality Inspection & Calibration Parameters</span>
              <span className="text-[11px] font-normal text-slate-300">KD Quality Standard ISO-9001</span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3.5 bg-slate-50/40">
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Outer Box Quality</span>
                <strong className="text-slate-900 font-bold text-xs">{report.outerBoxQuality || "Good"}</strong>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Packing Quality</span>
                <strong className="text-slate-900 font-bold text-xs">{report.packingQuality || "Export Grade"}</strong>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Number of Hands</span>
                <strong className="text-slate-900 font-bold text-xs">{report.numberOfHands || "5-7 hands"}</strong>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Finger Length / Diameter</span>
                <strong className="text-slate-900 font-bold text-xs">{report.fingerLengthDiameter || "18cm / 38mm"}</strong>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Box Net Weight</span>
                <strong className="text-slate-900 font-bold text-xs">{report.boxWeightKg || 13.5} Kg</strong>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[10px] font-bold uppercase">Damage on Hand</span>
                <strong className="text-slate-900 font-bold text-xs">{report.damageOnHand || "None"}</strong>
              </div>
            </div>

            {/* Checklist items */}
            <div className="grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-white p-3 text-center text-xs font-semibold">
              <div>
                <span className="text-slate-500 block text-[10px]">Latex Spots</span>
                <strong className={report.latexSpots ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                  {report.latexSpots ? "⚠️ Present" : "✓ None"}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Red Rust</span>
                <strong className={redRustDisplay !== "0%" ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                  {redRustDisplay}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Flower Removed?</span>
                <strong className={report.flowerRemoved ? "text-emerald-700 font-bold" : "text-amber-600 font-bold"}>
                  {report.flowerRemoved ? "✓ Yes (Clean)" : "⚠️ No"}
                </strong>
              </div>
            </div>
          </div>

          {/* Particulars & Hand Breakdown Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-300 flex justify-between items-center font-bold text-slate-900">
              <span>Particulars (Brand & Weight): <strong>{brand}</strong></span>
              <span className="text-slate-600">Dispatched: <strong>{total} Boxes</strong></span>
            </div>

            <div className="grid grid-cols-6 divide-x divide-slate-200 bg-white text-center p-3 font-semibold">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-bold">3H</span>
                <strong className="text-sm font-black text-slate-900">{report.box3H || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-bold">4H</span>
                <strong className="text-sm font-black text-slate-900">{report.box4H || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-bold">5H</span>
                <strong className="text-sm font-black text-slate-900">{report.box5H || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-bold">6H</span>
                <strong className="text-sm font-black text-slate-900">{report.box6H || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-bold">7H</span>
                <strong className="text-sm font-black text-slate-900">{report.box7H || 0}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-bold">8H</span>
                <strong className="text-sm font-black text-slate-900">{report.box8H || 0}</strong>
              </div>
            </div>

            {/* Reconciliation Totals Banner */}
            <div className="grid grid-cols-3 divide-x divide-slate-300 border-t-2 border-slate-900 bg-slate-900 text-white p-3 text-center">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block font-bold">Total Box Received</span>
                <strong className="text-base font-black font-mono">{total}</strong>
              </div>
              <div>
                <span className="text-rose-400 text-[10px] uppercase block font-bold">Damage Box Count</span>
                <strong className="text-base font-black text-rose-400 font-mono">{damage}</strong>
              </div>
              <div>
                <span className="text-emerald-400 text-[10px] uppercase block font-bold">Net Accepted Stock</span>
                <strong className="text-base font-black text-emerald-400 font-mono">{net}</strong>
              </div>
            </div>
          </div>

          {/* Allocation Breakdown (if assigned) */}
          {receipt.allocations && receipt.allocations.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Cold Storage Room Placements:
              </span>
              <div className="flex flex-wrap gap-2">
                {receipt.allocations.map((a, i) => (
                  <Badge key={i} variant="outline" className="bg-white border-slate-300 text-slate-800 text-xs font-bold px-2.5 py-1">
                    {a.roomNumber}: {a.brandName} ({a.boxCount} Boxes)
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Signatures & Stamp Block */}
          <div className="grid grid-cols-2 gap-8 pt-6 pb-2 text-center text-xs text-slate-600">
            <div className="border-t border-slate-400 pt-2 font-semibold">
              <p className="font-bold text-slate-900">Cold Storage Gate Inspector</p>
              <p className="text-[10px] text-slate-500">KD Cold Storage Kandar, Solapur</p>
            </div>
            <div className="border-t border-slate-400 pt-2 font-semibold">
              <p className="font-bold text-slate-900">Authorized Signatory</p>
              <p className="text-[10px] text-slate-500">Kiran Doke Fruit Export Enterprise</p>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="text-xs font-bold gap-1.5 h-10 rounded-xl border-slate-300"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Copied WhatsApp Format" : "Copy Report Text"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleShare}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-4 rounded-xl gap-1.5 shadow-xs"
            >
              <Share2 className="w-4 h-4" /> Share / Copy Report
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold h-10 px-4 rounded-xl gap-1.5 shadow-md"
            >
              <Printer className="w-4 h-4 text-cyan-400" /> Download PDF / Print
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="text-xs font-bold h-10 px-4 rounded-xl border-slate-300"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
