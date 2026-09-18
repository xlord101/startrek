"use client";

import React, { useMemo } from "react";
import { ColdStorageReceipt } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Table as TableIcon, FileSpreadsheet, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface StockTableProps {
  receipts: ColdStorageReceipt[];
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
}

export function KDColdStorageStockTable({ receipts }: StockTableProps) {
  // Aggregate real live inventory by brand & weight packaging
  const { rows, columnTotals } = useMemo(() => {
    // Group receipts by Brand + Weight
    const groupMap = new Map<string, StockRow>();

    // Seed realistic sample brand rows if database is freshly started
    const defaultBrands = [
      { name: "Star", inKg: "13 Kg" },
      { name: "New Premium", inKg: "13 Kg" },
      { name: "Premium", inKg: "13 Kg" },
      { name: "Golden Sparrow", inKg: "7 Kg" },
      { name: "Green Gold Export", inKg: "13 Kg" },
      { name: "Kiran Doke Royal", inKg: "7 Kg" },
    ];

    defaultBrands.forEach((b, idx) => {
      const key = `${b.name}_${b.inKg}`;
      groupMap.set(key, {
        srNo: idx + 1,
        productName: b.name,
        inKg: b.inKg,
        openingDate: "14-Aug-26",
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
      });
    });

    // Populate from receipts
    receipts.forEach((r) => {
      const brand = r.qualityReport?.boxBrand || r.billData?.orchardParticulars || r.brandName || "Star";
      // detect kg
      const is7kg = brand.includes("7") || (r.billData?.orchardParticulars || "").includes("7");
      const inKg = is7kg ? "7 Kg" : "13 Kg";
      const key = `${brand}_${inKg}`;

      let row = groupMap.get(key);
      if (!row) {
        row = {
          srNo: groupMap.size + 1,
          productName: brand,
          inKg: inKg,
          openingDate: r.qualityReport?.date || new Date().toLocaleDateString("en-IN"),
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
        groupMap.set(key, row);
      }

      const verifiedBoxes = r.verifiedBoxCount || r.dispatchedTotalBoxes || 0;
      const damage = r.qualityReport?.damageBox || 0;
      const net = Math.max(0, verifiedBoxes - damage);

      row.total += net;
      if (is7kg) {
        row.kg7 += net;
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

    const rowsArray = Array.from(groupMap.values()).map((r, i) => ({ ...r, srNo: i + 1 }));

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
  }, [receipts]);

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
      ["Kiran Doke Fruits - KD Cold Storage Stock Update (Kandar)"],
      [`Date: ${new Date().toLocaleDateString("en-IN")}`],
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
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
        <div>
          <h2 className="text-base font-black text-slate-900 font-heading flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            KD Cold Storage Stock Update (Kandar)
          </h2>
          <p className="text-xs text-slate-500">
            Official daily cold storage aggregate stock segregated by brand, package size & hand classification
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Official Spreadsheet Matrix */}
      <Card className="border-2 border-slate-300 bg-white shadow-md rounded-2xl overflow-hidden">
        {/* Colorful Title Banners matching the official layout */}
        <div className="text-center font-heading font-black tracking-wide">
          {/* Header 1: Kiran Doke Fruits */}
          <div className="bg-[#90CAF9] text-[#0D47A1] py-2 text-base sm:text-lg border-b border-[#64B5F6] uppercase">
            Kiran Doke Fruits
          </div>
          {/* Header 2: KD Cold Storage Stock Update (Kandar) */}
          <div className="bg-[#A5D6A7] text-[#1B5E20] py-1.5 text-sm sm:text-base border-b border-[#81C784]">
            KD Cold Storage Stock Update (Kandar)
          </div>
          {/* Header 3: Opening Date */}
          <div className="bg-[#FFF59D] text-[#F57F17] py-1 text-xs sm:text-sm font-bold border-b border-[#FFEE58] flex items-center justify-center gap-2">
            <span>Date: <strong>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</strong></span>
            <Badge variant="outline" className="bg-white/80 text-slate-800 text-[10px] font-black uppercase">
              Live Stock
            </Badge>
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
              {rows.map((row) => (
                <tr key={row.srNo} className="hover:bg-slate-50 divide-x divide-slate-200">
                  <td className="py-2 px-2 text-slate-500 font-mono bg-slate-50/50">{row.srNo}</td>
                  <td className="py-2 px-4 text-left font-bold text-slate-900">{row.productName}</td>
                  <td className="py-2 px-2 text-slate-600 font-mono">{row.inKg}</td>
                  <td className="py-2 px-3 bg-[#FFFDE7] text-slate-700 font-mono text-[11px]">{row.openingDate}</td>
                  <td className="py-2 px-3 bg-[#FFF3E0] font-black text-slate-950 font-mono text-sm">{row.total}</td>
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
              ))}
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
    </div>
  );
}
