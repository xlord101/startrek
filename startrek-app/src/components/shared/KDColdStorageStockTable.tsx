"use client";

import React, { useState, useMemo } from "react";
import { ColdStorageReceipt } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Printer,
  Table as TableIcon,
  FileSpreadsheet,
  RefreshCw,
  Calendar,
  X,
  Truck,
  Boxes,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cleanBrandName } from "@/lib/brand";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { toast } from "sonner";
import { useStartrekStore } from "@/lib/store";

interface StockTableProps {
  receipts: ColdStorageReceipt[];
  boxBrands?: { id?: string; name: string }[];
  brandStock?: { id?: string; brandName: string; boxType: string; availableStock?: number; issuedStock?: number }[];
}

interface StockRow {
  srNo: number;
  productName: string;
  inKg: string;
  openingDate: string;
  total: number;
  kg5: number;
  kg7: number;
  h4: number;
  h456: number;
  h45: number;
  h5: number;
  h56: number;
  h6: number;
  h8: number;
  mix: number;
  cl10h: number;
  arrivalTimestamp?: number;
}

export function parseReceiptDate(rec: ColdStorageReceipt): Date | null {
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

export function KDColdStorageStockTable({
  receipts,
  boxBrands: propBoxBrands,
  brandStock: propBrandStock,
}: StockTableProps) {
  const store = useStartrekStore();
  const effectiveBoxBrands = propBoxBrands || store.boxBrands || [];
  const effectiveBrandStock = propBrandStock || store.brandStock || [];

  const [filterDate, setFilterDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showFifoQueue, setShowFifoQueue] = useState(true);
  const dateInputRef = React.useRef<HTMLInputElement | null>(null);

  // Filter receipts by specific date or range
  const filteredReceipts = useMemo(() => {
    if (!filterDate && !startDate && !endDate) return receipts;
    return receipts.filter((r) => {
      const d = parseReceiptDate(r);
      if (!d) return true;

      // Single specific date filter selected directly from the yellow header banner
      if (filterDate) {
        const [fy, fm, fd] = filterDate.split("-").map(Number);
        const matchYear = d.getFullYear() === fy;
        const matchMonth = d.getMonth() === fm - 1;
        const matchDay = d.getDate() === fd;
        if (!matchYear || !matchMonth || !matchDay) return false;
      }

      if (startDate) {
        const [sy, sm, sd] = startDate.split("-").map(Number);
        const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        if (d < start) return false;
      }
      if (endDate) {
        const [ey, em, ed] = endDate.split("-").map(Number);
        const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [receipts, filterDate, startDate, endDate]);

  // Aggregate real inventory: preserve distinct rows for each arrival date batch!
  const { rows, columnTotals } = useMemo(() => {
    const activeBatchesMap = new Map<string, StockRow>();
    const brandsWithActiveStock = new Set<string>();

    // Populate active batches from receipts
    filteredReceipts.forEach((r) => {
      const rawBrand =
        r.qualityReport?.boxBrand ||
        r.billData?.orchardParticulars ||
        r.brandName ||
        r.harvestTask?.brandName ||
        "Star";
      const brand = cleanBrandName(rawBrand);

      // Detect package weight (5 Kg, 7 Kg vs 13 Kg / 13.5 Kg)
      const numWeight =
        typeof r.qualityReport?.boxWeightKg === "number"
          ? r.qualityReport.boxWeightKg
          : parseFloat(String(r.qualityReport?.boxWeightKg || ""));
      const rawBoxType = String(r.boxType || r.harvestTask?.selectedBoxTypes?.[0] || "").toUpperCase();
      const rawBrandUpper = rawBrand.toUpperCase();

      let inKg = "13 Kg";
      if (!isNaN(numWeight) && numWeight > 0) {
        if (numWeight >= 11 && numWeight <= 16) {
          inKg = "13 Kg";
        } else if (numWeight >= 6.5 && numWeight <= 8.5) {
          inKg = "7 Kg";
        } else if (numWeight >= 4 && numWeight <= 5.8) {
          inKg = "5 Kg";
        }
      } else if (rawBoxType.includes("7KG") || /\b7\s*KG\b/i.test(rawBrandUpper)) {
        inKg = "7 Kg";
      } else if (rawBoxType.includes("5KG") || /\b5\s*KG\b/i.test(rawBrandUpper)) {
        inKg = "5 Kg";
      } else {
        inKg = "13 Kg";
      }

      const is7kg = inKg === "7 Kg";
      const is5kg = inKg === "5 Kg";

      const recDate = parseReceiptDate(r);
      const dateStr = recDate
        ? recDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
        : r.qualityReport?.date || "—";
      const arrivalTimestamp = recDate ? recDate.getTime() : 0;

      const verifiedBoxes = r.verifiedBoxCount || r.dispatchedTotalBoxes || 0;
      const damage = r.qualityReport?.damageBox || 0;
      const net = Math.max(0, verifiedBoxes - damage);

      // Separate row per Brand + Package Size + Arrival Date
      const key = `${brand}_${inKg}_${dateStr}`;
      brandsWithActiveStock.add(`${brand}_${inKg}`);

      let row = activeBatchesMap.get(key);
      if (!row) {
        row = {
          srNo: 0,
          productName: brand,
          inKg: inKg,
          openingDate: dateStr,
          arrivalTimestamp,
          total: 0,
          kg5: 0,
          kg7: 0,
          h4: 0,
          h456: 0,
          h45: 0,
          h5: 0,
          h56: 0,
          h6: 0,
          h8: 0,
          mix: 0,
          cl10h: 0,
        };
        activeBatchesMap.set(key, row);
      }

      row.total += net;
      if (is7kg) {
        row.kg7 += net;
      } else if (is5kg) {
        row.kg5 += net;
      }

      // Hands
      const b4 = r.qualityReport?.box4H ?? r.billData?.box4H ?? 0;
      const b5 = r.qualityReport?.box5H ?? r.billData?.box5H ?? 0;
      const b6 = r.qualityReport?.box6H ?? r.billData?.box6H ?? 0;
      const b7 = r.qualityReport?.box7H ?? r.billData?.box7H ?? 0;
      const b8 = r.qualityReport?.box8H ?? r.billData?.box8H ?? 0;

      row.h4 += b4;
      row.h5 += b5;
      row.h6 += b6;
      row.h8 += b8;
      if (b7 > 0) {
        row.mix += b7;
      }
    });

    // Sort arrived batches chronologically by arrival date (oldest first - FIFO shipment priority!)
    const activeRows = Array.from(activeBatchesMap.values()).sort((a, b) => {
      return (a.arrivalTimestamp || 0) - (b.arrivalTimestamp || 0);
    });

    // Sequential numbering across arrived produce batches from harvesting
    const rowsArray = activeRows.map((r, i) => ({
      ...r,
      srNo: i + 1,
    }));

    // Compute column totals
    const totals = rowsArray.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.kg5 += r.kg5;
        acc.kg7 += r.kg7;
        acc.h4 += r.h4;
        acc.h456 += r.h456;
        acc.h45 += r.h45;
        acc.h5 += r.h5;
        acc.h56 += r.h56;
        acc.h6 += r.h6;
        acc.h8 += r.h8;
        acc.mix += r.mix;
        acc.cl10h += r.cl10h;
        return acc;
      },
      {
        total: 0,
        kg5: 0,
        kg7: 0,
        h4: 0,
        h456: 0,
        h45: 0,
        h5: 0,
        h56: 0,
        h6: 0,
        h8: 0,
        mix: 0,
        cl10h: 0,
      }
    );

    return { rows: rowsArray, columnTotals: totals };
  }, [filteredReceipts]);

  // Aggregated total boxes per brand across arrived batches in cold storage
  const brandTotals = useMemo(() => {
    const map: Record<string, { brand: string; inKg: string; totalBoxes: number }> = {};
    for (const r of rows) {
      if (r.total > 0) {
        const key = `${r.productName}_${r.inKg}`;
        if (!map[key]) {
          map[key] = { brand: r.productName, inKg: r.inKg, totalBoxes: 0 };
        }
        map[key].totalBoxes += r.total;
      }
    }
    return Object.values(map);
  }, [rows]);

  // Group verified stock by Arrival Date for FIFO shipment queue
  const fifoBatchesByDate = useMemo(() => {
    type DateBatch = {
      dateKey: string;
      dateObj: Date;
      displayDate: string;
      totalBoxes: number;
      trucks: string[];
      brands: Record<string, number>;
      hands: { h4: number; h5: number; h6: number; h7: number; h8: number };
    };

    const dateMap = new Map<string, DateBatch>();

    filteredReceipts.forEach((r) => {
      const d = parseReceiptDate(r) || new Date();
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const displayDate = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const total = r.verifiedBoxCount || r.dispatchedTotalBoxes || 0;
      const damage = r.qualityReport?.damageBox || 0;
      const net = Math.max(0, total - damage);
      if (net <= 0) return;

      const rawBrand =
        r.qualityReport?.boxBrand ||
        r.billData?.orchardParticulars ||
        r.brandName ||
        "Star";
      const brand = cleanBrandName(rawBrand);

      let batch = dateMap.get(dateKey);
      if (!batch) {
        batch = {
          dateKey,
          dateObj: d,
          displayDate,
          totalBoxes: 0,
          trucks: [],
          brands: {},
          hands: { h4: 0, h5: 0, h6: 0, h7: 0, h8: 0 },
        };
        dateMap.set(dateKey, batch);
      }

      batch.totalBoxes += net;
      if (r.vehicleNo && !batch.trucks.includes(r.vehicleNo)) {
        batch.trucks.push(r.vehicleNo);
      }
      batch.brands[brand] = (batch.brands[brand] || 0) + net;

      batch.hands.h4 += r.qualityReport?.box4H ?? r.billData?.box4H ?? 0;
      batch.hands.h5 += r.qualityReport?.box5H ?? r.billData?.box5H ?? 0;
      batch.hands.h6 += r.qualityReport?.box6H ?? r.billData?.box6H ?? 0;
      batch.hands.h7 += r.qualityReport?.box7H ?? r.billData?.box7H ?? 0;
      batch.hands.h8 += r.qualityReport?.box8H ?? r.billData?.box8H ?? 0;
    });

    // Sort oldest date first (FIFO: First In, First Out)
    return Array.from(dateMap.values()).sort(
      (a, b) => a.dateObj.getTime() - b.dateObj.getTime()
    );
  }, [filteredReceipts]);

  const handleExportCSV = () => {
    const headers = [
      "Sr No",
      "Product Name",
      "In KG",
      "Opening Date",
      "Total",
      "5 Kg",
      "7 KG",
      "4H",
      "4/5/6H",
      "4/5H",
      "5H",
      "5/6H",
      "6H",
      "8H",
      "Mix",
      "CL/10H",
    ];

    const csvRows = [
      ["KD EXPORT FRUIT SUPPLIER - KD Cold Storage Stock Update (Kandar)"],
      [
        startDate || endDate
          ? `Date Filter: ${startDate || "Start"} to ${endDate || "Today"}`
          : `Date: ${new Date().toLocaleDateString("en-IN")}`,
      ],
      [],
      headers,
      ...rows.map((r) => [
        r.srNo,
        r.productName,
        r.inKg,
        r.openingDate,
        r.total,
        r.kg5,
        r.kg7,
        r.h4,
        r.h456,
        r.h45,
        r.h5,
        r.h56,
        r.h6,
        r.h8,
        r.mix,
        r.cl10h,
      ]),
      [
        "Total",
        "",
        "",
        "",
        columnTotals.total,
        columnTotals.kg5,
        columnTotals.kg7,
        columnTotals.h4,
        columnTotals.h456,
        columnTotals.h45,
        columnTotals.h5,
        columnTotals.h56,
        columnTotals.h6,
        columnTotals.h8,
        columnTotals.mix,
        columnTotals.cl10h,
      ],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvRows.map((e) => e.map((val) => `"${val}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `KD_Cold_Storage_Stock_Update_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Stock Update CSV Downloaded!");
  };

  return (
    <div className="space-y-6">
      {/* Action Header & Date Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <h2 className="text-base font-black text-slate-900 font-heading flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            KD Cold Storage Stock Update (Kandar)
          </h2>
          <p className="text-xs text-slate-500">
            Official daily cold storage aggregate stock segregated by brand, package size &amp; hand classification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
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
              <X className="w-3.5 h-3.5 mr-1" /> Clear Date Filter
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs h-9 rounded-xl gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Export Excel/CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs h-9 rounded-xl gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" /> Print Matrix
          </Button>
        </div>
      </div>

      {/* Brand Total Stock Summary Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-emerald-600" />
            Total Filled Stock by Brand (Cold Storage)
          </span>
          <span className="text-xs font-bold text-slate-700">
            Total Stored: <span className="font-extrabold text-emerald-700">{columnTotals.total.toLocaleString("en-IN")} Boxes</span>
          </span>
        </div>
        {brandTotals.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No fruit batches logged in cold storage yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {brandTotals.map((bt) => (
              <div
                key={`${bt.brand}_${bt.inKg}`}
                className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
              >
                <span className="font-bold text-xs text-slate-900">{bt.brand}</span>
                <span className="text-[10px] text-slate-500 font-mono font-medium">({bt.inKg})</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-black text-xs hover:bg-emerald-100">
                  {bt.totalBoxes.toLocaleString("en-IN")} boxes
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Official Spreadsheet Matrix */}
      <Card className="border-2 border-slate-300 bg-white shadow-md rounded-2xl overflow-hidden">
        {/* Colorful Title Banners matching the official layout */}
        <div className="text-center font-heading font-black tracking-wide">
          {/* Header 1: KD EXPORT FRUIT SUPPLIER */}
          <div className="bg-[#90CAF9] text-[#0D47A1] py-2 text-base sm:text-lg border-b border-[#64B5F6] uppercase font-black">
            KD EXPORT FRUIT SUPPLIER
          </div>
          {/* Header 2: KD Cold Storage Stock Update (Kandar) */}
          <div className="bg-[#A5D6A7] text-[#1B5E20] py-1.5 text-sm sm:text-base border-b border-[#81C784]">
            KD Cold Storage Stock Update (Kandar)
          </div>
          {/* Header 3: Interactive Date Selector & Live Stock Switcher */}
          <div className="bg-[#FFF59D] text-[#F57F17] py-2 px-4 text-xs sm:text-sm font-bold border-b border-[#FFEE58] flex flex-wrap items-center justify-center gap-3">
            {/* Interactive Calendar Date Picker in the Yellow Bar */}
            <button
              type="button"
              onClick={() => {
                if (dateInputRef.current) {
                  try {
                    dateInputRef.current.showPicker();
                  } catch {
                    dateInputRef.current.focus();
                  }
                }
              }}
              className="relative flex items-center gap-2 cursor-pointer bg-white/95 hover:bg-white text-slate-900 px-3.5 py-1.5 rounded-xl border border-[#FBC02D] shadow-xs font-bold transition-all hover:shadow-sm group"
            >
              <Calendar className="w-4 h-4 text-[#E65100] group-hover:scale-110 transition-transform" />
              <span>
                Date:{" "}
                <strong className="text-[#BF360C] underline decoration-[#F57F17] decoration-2">
                  {filterDate
                    ? new Date(filterDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })
                    : startDate || endDate
                    ? `${startDate || "Start"} to ${endDate || "Today"}`
                    : new Date().toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })}
                </strong>
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-md font-mono">
                📅 Pick
              </span>
              <input
                ref={dateInputRef}
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setStartDate("");
                  setEndDate("");
                }}
                className="sr-only"
                title="Select date"
              />
            </button>

            {/* Clickable LIVE STOCK Badge — Resets back to live table */}
            <button
              type="button"
              onClick={() => {
                setFilterDate("");
                setStartDate("");
                setEndDate("");
              }}
              title="Click to return to full live stock table"
              className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                !filterDate && !startDate && !endDate
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-300/60"
                  : "bg-white text-slate-700 hover:bg-emerald-600 hover:text-white border border-slate-300"
              }`}
            >
              {!filterDate && !startDate && !endDate ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />
                  LIVE STOCK
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 text-emerald-600" />
                  Click to View Live Stock
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Data Table */}
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-black border-b-2 border-slate-300 divide-x divide-slate-200 uppercase text-[10px]">
                <th className="py-2.5 px-2 bg-slate-200">Sr No</th>
                <th className="py-2.5 px-4 text-left bg-slate-100 min-w-[140px]">Product Name</th>
                <th className="py-2.5 px-2 bg-slate-100 min-w-[70px]">In KG</th>
                <th className="py-2.5 px-3 bg-[#FFF9C4] text-[#E65100]">Opening Date</th>
                <th className="py-2.5 px-3 bg-[#FFE0B2] text-[#BF360C] font-black text-xs">Total</th>
                <th className="py-2.5 px-2">5 Kg</th>
                <th className="py-2.5 px-2">7 KG</th>
                <th className="py-2.5 px-2">4H</th>
                <th className="py-2.5 px-2">4/5/6H</th>
                <th className="py-2.5 px-2">4/5H</th>
                <th className="py-2.5 px-2">5H</th>
                <th className="py-2.5 px-2">5/6H</th>
                <th className="py-2.5 px-2">6H</th>
                <th className="py-2.5 px-2">8H</th>
                <th className="py-2.5 px-2">Mix</th>
                <th className="py-2.5 px-2">CL/10H</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400 bg-white">
                    <p className="text-sm font-bold text-slate-600">No filled fruit boxes logged in cold storage yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      Truck arrivals from harvesting will appear here automatically with their opening date, brand, package size, and hand counts.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.srNo} className="hover:bg-slate-50 divide-x divide-slate-200">
                    <td className="py-2 px-2 text-slate-500 font-mono bg-slate-50/50">{row.srNo}</td>
                    <td className="py-2 px-4 text-left font-bold text-slate-900">{row.productName}</td>
                    <td className="py-2 px-2 text-slate-600 font-mono">{row.inKg}</td>
                    <td className="py-2 px-3 bg-[#FFFDE7] text-slate-700 font-mono text-[11px]">
                      {row.openingDate}
                    </td>
                    <td className="py-2 px-3 bg-[#FFF3E0] font-black text-slate-950 font-mono text-sm">
                      {row.total}
                    </td>
                    <td className="py-2 px-2 font-mono text-slate-600">{row.kg5 || "-"}</td>
                    <td className="py-2 px-2 font-mono text-slate-600">{row.kg7 || "-"}</td>
                    <td className="py-2 px-2 font-mono text-slate-700">{row.h4 || "-"}</td>
                    <td className="py-2 px-2 font-mono text-slate-600">{row.h456 || "-"}</td>
                    <td className="py-2 px-2 font-mono text-slate-600">{row.h45 || "-"}</td>
                    <td className="py-2 px-2 font-mono text-slate-700">{row.h5 || "-"}</td>
                    <td className="py-2 px-2 font-mono text-slate-600">{row.h56 || "-"}</td>
                    <td className="py-2 px-2 font-mono text-slate-700">{row.h6 || "-"}</td>
                    <td className="py-2 px-2 font-mono text-slate-700">{row.h8 || "-"}</td>
                    <td className="py-2 px-2 font-mono text-slate-600">{row.mix || "-"}</td>
                    <td className="py-2 px-2 font-mono text-slate-600">{row.cl10h || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#FFE0B2] text-slate-950 font-black border-t-2 border-slate-900 divide-x divide-amber-300 text-xs">
                <td colSpan={4} className="py-2.5 px-4 text-right uppercase tracking-wider text-slate-900">
                  Total
                </td>
                <td className="py-2.5 px-3 bg-[#FFCC80] text-slate-950 font-black text-sm font-mono">
                  {columnTotals.total}
                </td>
                <td className="py-2.5 px-2 font-mono">{columnTotals.kg5 || "-"}</td>
                <td className="py-2.5 px-2 font-mono">{columnTotals.kg7 || "-"}</td>
                <td className="py-2.5 px-2 font-mono">{columnTotals.h4 || "-"}</td>
                <td className="py-2.5 px-2 font-mono">{columnTotals.h456 || "-"}</td>
                <td className="py-2.5 px-2 font-mono">{columnTotals.h45 || "-"}</td>
                <td className="py-2.5 px-2 font-mono">{columnTotals.h5 || "-"}</td>
                <td className="py-2.5 px-2 font-mono">{columnTotals.h56 || "-"}</td>
                <td className="py-2.5 px-2 font-mono">{columnTotals.h6 || "-"}</td>
                <td className="py-2.5 px-2 font-mono">{columnTotals.h8 || "-"}</td>
                <td className="py-2.5 px-2 font-mono">{columnTotals.mix || "-"}</td>
                <td className="py-2.5 px-2 font-mono">{columnTotals.cl10h || "-"}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* ─── FIFO QUEUE: BOXES BY ARRIVAL DATE ─── */}
      <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
        <CardHeader
          onClick={() => setShowFifoQueue(!showFifoQueue)}
          className="bg-slate-50/90 border-b border-slate-200 py-3.5 px-5 flex flex-row items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4.5 h-4.5 text-amber-600" />
            <div>
              <CardTitle className="text-sm font-black text-slate-900 font-heading">
                Boxes by Arrival Date (FIFO Dispatch Queue)
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Earliest arrived batches ordered first — priority boxes to pack &amp; ship before newer stock
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black px-2.5 py-0.5">
              {fifoBatchesByDate.length} Active Arrival Dates
            </Badge>
            {showFifoQueue ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </CardHeader>

        {showFifoQueue && (
          <CardContent className="p-4 sm:p-5">
            {fifoBatchesByDate.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-medium text-xs">
                No arrival batches found for the selected dates.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {fifoBatchesByDate.map((batch, idx) => {
                  const isOldest = idx === 0;
                  return (
                    <div
                      key={batch.dateKey}
                      className={`p-4 rounded-xl border transition-all ${
                        isOldest
                          ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-200/60 shadow-sm"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="font-bold text-slate-900 text-xs font-mono">
                            {batch.displayDate}
                          </span>
                        </div>
                        {isOldest ? (
                          <Badge className="bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider">
                            Oldest • Ship First
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold font-mono">
                            Priority #{idx + 1}
                          </span>
                        )}
                      </div>

                      <div className="pt-2.5 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-500 font-semibold">Total Produce Arrived:</span>
                          <span className="text-base font-black text-slate-950 font-mono">
                            {batch.totalBoxes} <span className="text-xs font-bold text-slate-600">boxes</span>
                          </span>
                        </div>

                        {/* Brands in this date */}
                        <div className="space-y-1 pt-1 border-t border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Brand Breakdown:
                          </span>
                          {Object.entries(batch.brands).map(([bName, count]) => (
                            <div key={bName} className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800">{bName}</span>
                              <span className="font-mono font-black text-slate-900">{count} bx</span>
                            </div>
                          ))}
                        </div>

                        {/* Hands breakdown */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono text-slate-700 bg-white/70 p-1.5 rounded-lg border border-slate-200">
                          <span>4H: <strong>{batch.hands.h4}</strong></span>
                          <span>5H: <strong>{batch.hands.h5}</strong></span>
                          <span>6H: <strong>{batch.hands.h6}</strong></span>
                          {batch.hands.h7 > 0 && <span>7H: <strong>{batch.hands.h7}</strong></span>}
                          {batch.hands.h8 > 0 && <span>8H: <strong>{batch.hands.h8}</strong></span>}
                        </div>

                        {/* Truck badges */}
                        {batch.trucks.length > 0 && (
                          <div className="pt-1 flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-semibold">Trucks:</span>
                            {batch.trucks.map((t) => (
                              <Badge
                                key={t}
                                variant="outline"
                                className="bg-white text-slate-700 font-mono text-[9px] px-1.5 py-0 border-slate-300"
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
