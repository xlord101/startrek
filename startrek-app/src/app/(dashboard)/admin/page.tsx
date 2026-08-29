"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { store, useStartrekStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  UserCheck,
  PackageSearch,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Boxes,
  Tag,
  ThermometerSnowflake,
  Sprout,
  Truck,
  Building2,
} from "lucide-react";

export default function AdminOverviewPage() {
  const { procurementTasks, harvestTasks, inventoryStock, coldStorageReceipts } = useStartrekStore();
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUserCount(data.users.length);
      })
      .catch(() => {});

    // Cold storage sync
    fetch("/api/cold-storage")
      .then((res) => res.json())
      .then((data) => {
        if (data.receipts) store.setColdStorageReceipts(data.receipts);
      })
      .catch(() => {});
  }, []);

  const pendingProcurement = procurementTasks.filter(
    (t) => t.status === "PENDING_ASSIGNMENT"
  ).length;

  const harvestInProgress = harvestTasks.filter(
    (t) => t.status === "HARVEST_IN_PROGRESS" || t.status === "WORK_STARTED"
  ).length;

  const readyForHarvest = harvestTasks.filter(
    (t) => t.status === "READY_FOR_HARVEST"
  ).length;

  const totalBoxesAvailable = (inventoryStock || []).reduce(
    (acc: number, item: any) => acc + (item.availableStock || 0),
    0
  );

  // ─── COLD STORAGE BRAND & HAND BREAKDOWN (FOR SALES/ADMIN ORDERS) ───
  const brandHandBreakdown = useMemo(() => {
    const summary: Record<
      string,
      {
        totalBoxes: number;
        box4H: number;
        box5H: number;
        box6H: number;
        box7H: number;
        box8H: number;
      }
    > = {};

    for (const receipt of coldStorageReceipts) {
      if (receipt.status !== "ALLOCATED_TO_ROOMS" && receipt.status !== "VERIFIED_RECEIVED") continue;

      const brand = receipt.billData?.orchardParticulars || receipt.brandName || "StarPremium Export Grade";
      if (!summary[brand]) {
        summary[brand] = {
          totalBoxes: 0,
          box4H: 0,
          box5H: 0,
          box6H: 0,
          box7H: 0,
          box8H: 0,
        };
      }

      const count = receipt.verifiedBoxCount || receipt.dispatchedTotalBoxes || 0;
      summary[brand].totalBoxes += count;
      summary[brand].box4H += parseInt(receipt.billData?.box4H as any) || 0;
      summary[brand].box5H += parseInt(receipt.billData?.box5H as any) || 0;
      summary[brand].box6H += parseInt(receipt.billData?.box6H as any) || 0;
      summary[brand].box7H += parseInt(receipt.billData?.box7H as any) || 0;
      summary[brand].box8H += parseInt(receipt.billData?.box8H as any) || 0;
    }

    return summary;
  }, [coldStorageReceipts]);

  const totalColdStorageBoxes = useMemo(() => {
    return Object.values(brandHandBreakdown).reduce((s, b) => s + b.totalBoxes, 0);
  }, [brandHandBreakdown]);

  const totalColdStorageTons = ((totalColdStorageBoxes * 13.5) / 1000).toFixed(2);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-heading">
              KD Export Operations Command Center
            </h1>
            <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 font-bold border-emerald-200">
              OPERATIONAL HUB
            </Badge>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time supply chain monitoring across Procurement, Harvesting, Packaging Inventory, & Cold Storage.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-100 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pending Intake Assignments
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-heading">
                  {pendingProcurement}
                </h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-600">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <Link
              href="/admin/procurement"
              className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Manage Procurement <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Farm Harvests
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-heading">
                  {harvestInProgress + readyForHarvest}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-600">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <Link
              href="/admin/harvesting"
              className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Monitor Harvesting <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Available Packaging Stock
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-1 font-heading">
                  {totalBoxesAvailable.toLocaleString()} <span className="text-xs font-semibold text-slate-400">Boxes</span>
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
                <PackageSearch className="w-5 h-5" />
              </div>
            </div>
            <Link
              href="/admin/inventory"
              className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              View Inventory Stock <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cold Storage Stock
                </p>
                <h3 className="text-2xl font-black text-cyan-700 mt-1 font-heading">
                  {totalColdStorageBoxes} <span className="text-xs font-semibold text-slate-400">Boxes</span>
                </h3>
              </div>
              <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100 text-cyan-600">
                <ThermometerSnowflake className="w-5 h-5" />
              </div>
            </div>
            <Link
              href="/admin/cold-storage"
              className="mt-4 text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              View Cold Storage Hub <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ─── COLD STORAGE BRAND & HAND BREAKDOWN SUMMARY ────────── */}
      <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-black text-slate-900 flex items-center gap-2 font-heading">
              <ThermometerSnowflake className="w-5 h-5 text-cyan-600" />
              Cold Storage Banana Stock by Brand & Hand Size (4H to 8H)
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant inventory breakdown for Sales & Export order fulfillment (Hands: 4H, 5H, 6H, 7H, 8H)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold px-3 py-1">
              Total: {totalColdStorageBoxes} Boxes (~{totalColdStorageTons} Tons)
            </Badge>
            <Link href="/admin/cold-storage">
              <Button size="sm" variant="outline" className="text-xs font-bold h-8 border-slate-200 gap-1 rounded-xl">
                Open Terminal <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {Object.keys(brandHandBreakdown).length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 font-bold text-xs">
              No bananas currently stored in Cold Storage. Harvest batches received at the cold storage gate will automatically appear here with their exact brand and hand particulars.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(brandHandBreakdown).map(([brand, data]) => {
                const brandTons = ((data.totalBoxes * 13.5) / 1000).toFixed(2);
                return (
                  <div
                    key={brand}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-cyan-300 transition-all shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          Brand
                        </span>
                        <h4 className="text-sm font-black text-slate-900 font-heading mt-1">{brand}</h4>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
                        Available
                      </Badge>
                    </div>

                    <div className="flex items-baseline justify-between pt-1 border-b border-slate-100 pb-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Stock Boxes</span>
                        <span className="text-xl font-black text-slate-900 font-heading block">
                          {data.totalBoxes} <span className="text-xs font-bold text-slate-400">Boxes</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Weight</span>
                        <span className="text-sm font-black text-emerald-700 block">
                          ~{brandTons} Tons
                        </span>
                      </div>
                    </div>

                    {/* Hand Breakdown (4H - 8H) */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Hand Size Breakdown (Boxes):
                      </span>
                      <div className="grid grid-cols-5 gap-1.5 text-center">
                        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">4H</span>
                          <strong className="text-xs font-black text-slate-900">{data.box4H}</strong>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">5H</span>
                          <strong className="text-xs font-black text-slate-900">{data.box5H}</strong>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">6H</span>
                          <strong className="text-xs font-black text-slate-900">{data.box6H}</strong>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">7H</span>
                          <strong className="text-xs font-black text-slate-900">{data.box7H}</strong>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold block">8H</span>
                          <strong className="text-xs font-black text-slate-900">{data.box8H}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operational Modules & Fast Actions Grid */}
      <Card className="border-slate-100 shadow-xs">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
          <CardTitle className="text-sm font-bold text-slate-800">
            Operational Department Modules & Fast Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/procurement/new"
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white group space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-600" /> New Farm Entry
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <p className="text-xs text-slate-500">
              Log new banana farm procurement intake with estimated tonnage.
            </p>
          </Link>

          <Link
            href="/admin/supervisors"
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white group space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" /> Master Registries
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <p className="text-xs text-slate-500">
              Manage Farmers, Vehicle Suppliers, Labour Teams, & Chemical Lists.
            </p>
          </Link>

          <Link
            href="/admin/cold-storage"
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white group space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-cyan-600" /> Cold Storage
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <p className="text-xs text-slate-500">
              Verify truck arrivals, perform quality reports, & allocate cold rooms.
            </p>
          </Link>

          <Link
            href="/admin/audit-logs"
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white group space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> Audit Trail
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <p className="text-xs text-slate-500">
              View real-time security logs of all system state changes.
            </p>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
