"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Share2, Check, FileText, CheckCircle2, ShieldCheck, X, Building2, MapPin, Truck, User } from "lucide-react";
import { ColdStorageReceipt, KDColdStorageQualityReport } from "@/types";
import { shareReportMessage, copyToClipboard } from "@/lib/share";
import { printElementDirectly } from "@/lib/print";
import { toast } from "sonner";
import Image from "next/image";

interface VoucherProps {
  receipt: ColdStorageReceipt;
  qualityReport?: KDColdStorageQualityReport | null;
  isOpen: boolean;
  onClose: () => void;
}

import { cleanBrandName } from "@/lib/brand";
export { cleanBrandName };

export function computeHandsDisplay(
  report: Partial<KDColdStorageQualityReport>,
  receipt: ColdStorageReceipt
): string {
  const b3 = Number(report.box3H) || Number(receipt.billData?.box3H) || 0;
  const b4 = Number(report.box4H) || Number(receipt.billData?.box4H) || 0;
  const b5 = Number(report.box5H) || Number(receipt.billData?.box5H) || 0;
  const b6 = Number(report.box6H) || Number(receipt.billData?.box6H) || 0;
  const b7 = Number(report.box7H) || Number(receipt.billData?.box7H) || 0;
  const b8 = Number(report.box8H) || Number(receipt.billData?.box8H) || 0;

  const presentHands: number[] = [];
  if (b3 > 0) presentHands.push(3);
  if (b4 > 0) presentHands.push(4);
  if (b5 > 0) presentHands.push(5);
  if (b6 > 0) presentHands.push(6);
  if (b7 > 0) presentHands.push(7);
  if (b8 > 0) presentHands.push(8);

  const derivedHands =
    presentHands.length === 1
      ? `${presentHands[0]} hands`
      : presentHands.length > 1
      ? `${presentHands[0]}-${presentHands[presentHands.length - 1]} hands`
      : "";

  return (
    derivedHands ||
    (report.numberOfHands && report.numberOfHands !== "5-7 hands" ? report.numberOfHands : "") ||
    report.numberOfHands ||
    "5 hands"
  );
}

export function generateColdStorageQualityWhatsApp(
  report: Partial<KDColdStorageQualityReport>,
  receipt: ColdStorageReceipt
) {
  const dateStr = report.date || new Date().toLocaleDateString("en-IN");
  const vehicle = report.vehicleNo || receipt.vehicleNo || "—";
  const driver = receipt.driverName || "—";
  const driverPhone = receipt.driverPhone || "";
  const line = report.lineName || receipt.billData?.lineName || "Line 1";
  const supervisor = report.supervisorName || receipt.billData?.supervisorName || "Supervisor";
  const vendor = report.vendorName || receipt.billData?.vendorName || receipt.farmerName;
  const brand = cleanBrandName(report.boxBrand || receipt.billData?.orchardParticulars || receipt.brandName || "Joy Banana");
  const intakeId = receipt.billData?.intakeId || receipt.harvestTaskId || receipt.id;

  const total = report.totalBox || receipt.verifiedBoxCount || receipt.dispatchedTotalBoxes || 0;
  const damage = report.damageBox || 0;
  const net = Math.max(0, total - damage);

  const qualityGrade =
    report.overallQuality === "A_GRADE_EXPORT"
      ? "A-Grade Export"
      : report.overallQuality === "B_GRADE"
      ? "B-Grade"
      : "Rejected";

  const handsDisplay = computeHandsDisplay(report, receipt);

  return `===========================
   KD EXPORT FRUIT SUPPLIER
===========================
        KD COLD STORAGE
Gat No. 504, Bitargaon Road, Kandar, Taluka Karmala, Solapur, Maharashtra 413202
Ph: +919823435133, +919112385133
===========================
    OFFICIAL QUALITY REPORT
===========================
Date: ${dateStr}
Intake ID: #${intakeId}
Vehicle No: ${vehicle}
Driver: ${driver}${driverPhone ? ` (${driverPhone})` : ""}
Line Name: ${line}
Supervisor: ${supervisor}
Farmer / Vendor: ${vendor}
Brand: ${brand}
===========================
QUALITY INSPECTION:
• Outer Box Quality: ${report.outerBoxQuality || "Good"}
• Packing Quality: ${report.packingQuality || "Export"}
• Number of Hands: ${handsDisplay}
• Finger Length / Caliber: ${report.fingerLengthDiameter || "18cm / 38mm"}
• Box Weight: ${report.boxWeightKg || 13.5} kg
• Damage on Hand: ${report.damageOnHand || "None"}
• Latex Spots: ${report.latexSpots ? "Yes" : "None"}
• Red Rust Defect: ${
    report.redRustPercentage != null
      ? `${report.redRustPercentage}%`
      : report.redRust
      ? "Yes"
      : "0%"
  }
• Flower Removed: ${report.flowerRemoved ? "Yes" : "No"}
• Overall Grade: ${qualityGrade}
===========================
HAND BREAKDOWN:
3H: ${report.box3H || 0} | 4H: ${report.box4H || 0} | 5H: ${report.box5H || 0}
6H: ${report.box6H || 0} | 7H: ${report.box7H || 0} | 8H: ${report.box8H || 0}
===========================
Total Boxes Dispatched: ${total}
Damaged Boxes: ${damage}
Net Accepted Stock: ${net}
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
  const vehicle = report.vehicleNo || receipt.vehicleNo || "—";
  const driver = receipt.driverName || "—";
  const driverPhone = receipt.driverPhone || "";
  const line = report.lineName || receipt.billData?.lineName || "Line 1";
  const supervisor = report.supervisorName || receipt.billData?.supervisorName || "Supervisor";
  const vendor = report.vendorName || receipt.billData?.vendorName || receipt.farmerName;
  const brand = cleanBrandName(report.boxBrand || receipt.billData?.orchardParticulars || receipt.brandName || "Joy Banana");
  const intakeId = receipt.billData?.intakeId || receipt.harvestTaskId || receipt.id;
  const location = receipt.billData?.location || "Solapur, Maharashtra";

  const total = report.totalBox || receipt.verifiedBoxCount || receipt.dispatchedTotalBoxes || 0;
  const damage = report.damageBox || 0;
  const net = Math.max(0, total - damage);

  const qualityGrade =
    report.overallQuality === "A_GRADE_EXPORT"
      ? "A-Grade Export"
      : report.overallQuality === "B_GRADE"
      ? "B-Grade"
      : "Rejected";

  const handsDisplay = computeHandsDisplay(report, receipt);

  const redRustDisplay =
    report.redRustPercentage != null
      ? `${report.redRustPercentage}%`
      : report.redRust
      ? "Present"
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
    printElementDirectly(
      "printable-voucher-root",
      `KD_Voucher_${intakeId}_${receipt.farmerName.replace(/\s+/g, "_")}`
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-4xl sm:max-w-4xl md:max-w-5xl bg-white border-slate-200 shadow-2xl rounded-2xl p-0 overflow-hidden max-h-[95vh] flex flex-col">
        {/* PRINT STYLESHEET: Resets dialog overlays and transforms */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 6mm;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              overflow: visible !important;
            }
            [data-slot="dialog-overlay"],
            [data-radix-dialog-overlay],
            nav,
            aside,
            header,
            button,
            .no-print,
            .print-hidden,
            .print\\:hidden {
              display: none !important;
              visibility: hidden !important;
            }
            [data-slot="dialog-content"],
            [data-slot="dialog-portal"] > div,
            div[role="dialog"] {
              position: static !important;
              transform: none !important;
              max-width: 100% !important;
              max-height: none !important;
              overflow: visible !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
            }
            #printable-voucher-root {
              display: block !important;
              visibility: visible !important;
              position: relative !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 4mm !important;
              border: 1px solid #cbd5e1 !important;
              box-shadow: none !important;
              background: #ffffff !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            #printable-voucher-root * {
              visibility: visible !important;
            }
          }
        `}</style>

        {/* Modal Top Bar (Screen Only - Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 print:hidden no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm font-heading">
              Official Quality Report Voucher &amp; Intake Certificate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-black tracking-widest uppercase">
              {qualityGrade}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 print:p-0 print:bg-white">
          {/* OFFICIAL FORMAL VOUCHER CARD (Targeted for Clean A4 Printing) */}
          <div
            id="printable-voucher-root"
            className="max-w-3xl mx-auto bg-white border border-slate-300 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* CORPORATE LETTERHEAD HEADER */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-sm">
                      KD
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading leading-tight uppercase">
                        KD EXPORT FRUIT SUPPLIER
                      </h1>
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">
                        KD Cold Storage &amp; Pre-Cooling Export Unit
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium pt-1 leading-relaxed">
                    Gat No. 504, Bitargaon Road, Kandar, Taluka Karmala, Dist. Solapur, Maharashtra - 413202<br />
                    Phone: +91 9823435133, +91 9112385133 | APEDA Regd. Export Facility
                  </p>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="border border-slate-900 px-3 py-1 bg-slate-900 text-white rounded-md text-[11px] font-black uppercase tracking-wider">
                    Gate Intake Voucher
                  </div>
                  <div className="pt-2 text-xs font-mono font-bold text-slate-800">
                    Intake: #{intakeId}
                  </div>
                  <div className="text-[11px] text-slate-600 font-semibold">
                    Date: {dateStr}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Document: <strong>Official Produce Quality Verification Certificate</strong>
                </span>
                <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                  Classification: {qualityGrade}
                </span>
              </div>
            </div>

            {/* SECTION 1: CONSIGNMENT TRACEABILITY TABLE */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-600" /> 1. Consignment &amp; Transport Details
              </h2>
              <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="w-1/4 p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Vehicle / Truck No.
                      </td>
                      <td className="w-1/4 p-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">
                        {vehicle}
                      </td>
                      <td className="w-1/4 p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Driver Name &amp; Contact
                      </td>
                      <td className="w-1/4 p-2.5 font-bold text-slate-900">
                        {driver}{driverPhone ? ` (${driverPhone})` : ""}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Farmer / Source Farm
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {vendor}
                      </td>
                      <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Farm Location / Taluka
                      </td>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {location}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Harvest Line / Squad
                      </td>
                      <td className="p-2.5 font-semibold text-slate-900 border-r border-slate-200">
                        {line}
                      </td>
                      <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Field Supervisor
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {supervisor}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: QUALITY & DEFECT INSPECTION PARAMETERS */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" /> 2. Intake Quality Inspection &amp; Calibration
              </h2>
              <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="w-1/3 p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Outer Box Quality
                      </td>
                      <td className="w-1/3 p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Packing Quality Grade
                      </td>
                      <td className="w-1/3 p-2.5 bg-slate-50 font-bold text-slate-600">
                        Number of Hands
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {report.outerBoxQuality || "Good"}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {report.packingQuality || "Export Grade"}
                      </td>
                      <td className="p-2.5 font-bold text-emerald-800 bg-emerald-50/50">
                        {handsDisplay}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Finger Length / Caliber
                      </td>
                      <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Average Box Weight (Measured)
                      </td>
                      <td className="p-2.5 bg-slate-50 font-bold text-slate-600">
                        Hand Damage / Bruising
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {report.fingerLengthDiameter || "18cm / 38mm"}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {report.boxWeightKg || 13.5} Kg
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {report.damageOnHand || "None / Nil"}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Latex Spots
                      </td>
                      <td className="p-2.5 bg-slate-50 font-bold text-slate-600 border-r border-slate-200">
                        Red Rust Defect %
                      </td>
                      <td className="p-2.5 bg-slate-50 font-bold text-slate-600">
                        Flower Cleaning (Removal)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {report.latexSpots ? "Present" : "None / Clean"}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                        {redRustDisplay}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {report.flowerRemoved ? "Cleaned (Yes)" : "Not Removed (No)"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: HAND BREAKDOWN & INTAKE RECONCILIATION */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-600" /> 3. Hand Classification &amp; Box Reconciliation
                </h2>
                <span className="text-[11px] font-bold text-slate-700">
                  Particulars: <strong>{brand}</strong>
                </span>
              </div>
              <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                <table className="w-full border-collapse text-center">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                      <th className="p-2.5 text-left border-r border-slate-300">Particular</th>
                      <th className="p-2.5 border-r border-slate-300">3H</th>
                      <th className="p-2.5 border-r border-slate-300">4H</th>
                      <th className="p-2.5 border-r border-slate-300">5H</th>
                      <th className="p-2.5 border-r border-slate-300">6H</th>
                      <th className="p-2.5 border-r border-slate-300">7H</th>
                      <th className="p-2.5 border-r border-slate-300">8H</th>
                      <th className="p-2.5 text-right font-black">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 text-left font-bold text-slate-700 bg-slate-50 border-r border-slate-200">
                        Box Count
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">{report.box3H || 0}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">{report.box4H || 0}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">{report.box5H || 0}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">{report.box6H || 0}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">{report.box7H || 0}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">{report.box8H || 0}</td>
                      <td className="p-2.5 text-right font-mono font-black text-slate-900">{total}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Totals Summary Banner */}
                <div className="grid grid-cols-3 divide-x divide-slate-300 bg-slate-900 text-white p-3 text-center border-t border-slate-300">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block font-bold">Total Dispatched from Farm</span>
                    <strong className="text-base font-black font-mono">{total} Boxes</strong>
                  </div>
                  <div>
                    <span className="text-rose-300 text-[10px] uppercase block font-bold">Gate Damage / Sorting Loss</span>
                    <strong className="text-base font-black text-rose-300 font-mono">{damage} Boxes</strong>
                  </div>
                  <div>
                    <span className="text-emerald-300 text-[10px] uppercase block font-bold">Net Accepted Cold Storage Stock</span>
                    <strong className="text-base font-black text-emerald-300 font-mono">{net} Boxes</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: STORAGE ROOM ALLOCATION (If recorded) */}
            {receipt.allocations && receipt.allocations.length > 0 && (
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Cold Storage Chamber Placement &amp; Stacking:
                </span>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {receipt.allocations.map((a, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-900 font-bold text-xs"
                    >
                      {a.roomNumber}: {a.brandName} — {a.boxCount} Boxes
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 5: FORMAL SIGNATURES & STAMP BLOCK */}
            <div className="pt-6 border-t border-slate-300">
              <div className="grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
                <div className="space-y-8">
                  <div className="h-9"></div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold">
                    <p className="text-slate-900">Field Supervisor</p>
                    <p className="text-[10px] text-slate-500 font-normal">Handover &amp; Dispatch</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="h-9"></div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold">
                    <p className="text-slate-900">Cold Storage Quality Inspector</p>
                    <p className="text-[10px] text-slate-500 font-normal">Gate Verified &amp; Inspected</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="h-9"></div>
                  <div className="border-t border-slate-400 pt-1.5 font-bold">
                    <p className="text-slate-900">Authorized Signatory</p>
                    <p className="text-[10px] text-slate-500 font-normal">KD Export Fruit Supplier</p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 text-center italic pt-6">
                * This document is an official intake certification issued by KD EXPORT FRUIT SUPPLIER. Produce verified compliant with KD export standards.
              </p>
            </div>
          </div>
        </div>

        {/* MODAL ACTION FOOTER (Screen Only - Strictly Hidden during Printing) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden no-print">
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
              <Share2 className="w-4 h-4" /> Share / WhatsApp
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold h-10 px-4 rounded-xl gap-1.5 shadow-md"
            >
              <Printer className="w-4 h-4 text-cyan-400" /> Print / Save as PDF
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
