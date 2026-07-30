"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { mockHarvestTasks } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  MapPin,
  Weight,
  Sprout,
  Clock,
  FlaskConical,
  User,
  Phone,
  ShieldCheck,
  Check,
} from "lucide-react";
import Link from "next/link";
import { CHEMICAL_LABELS, ChemicalOption } from "@/types";
import { toast } from "sonner";

export default function HarvestingJobFormPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const task = mockHarvestTasks.find((t) => t.id === jobId) || mockHarvestTasks[1];

  // Form state
  const [harvestedBoxes, setHarvestedBoxes] = useState(
    task.harvestedBoxes ? String(task.harvestedBoxes) : ""
  );
  const [truckNumber, setTruckNumber] = useState(task.truckNumber || "");
  const [driverName, setDriverName] = useState(task.driverName || "");
  const [driverPhone, setDriverPhone] = useState(task.driverPhone || "");

  // Applied chemicals checklist
  const [appliedChemicals, setAppliedChemicals] = useState<ChemicalOption[]>(
    task.chemicals || ["ETHYLENE_WASH", "FUNGICIDE_DIP"]
  );

  const toggleChemical = (chem: ChemicalOption) => {
    if (appliedChemicals.includes(chem)) {
      setAppliedChemicals(appliedChemicals.filter((c) => c !== chem));
    } else {
      setAppliedChemicals([...appliedChemicals, chem]);
    }
  };

  const handle2HourPing = () => {
    toast.info("2-Hour Field Status Ping Recorded!", {
      description: `Team Ping logged for ${task.farmerName}'s farm. Office updated.`,
    });
  };

  const isValid = harvestedBoxes && truckNumber.trim() && driverName.trim() && driverPhone.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    toast.success("Harvest Completed & Dispatched!", {
      description: `Vehicle ${truckNumber} dispatched to Cold Storage with ${harvestedBoxes} boxes.`,
    });

    setTimeout(() => {
      router.push("/admin/harvesting");
    }, 800);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/harvesting">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 font-heading">
                Harvest Execution & Dispatch
              </h1>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                Module 2.2
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Farm: <strong className="text-slate-800">{task.farmerName}</strong> ({task.tonnage} T)
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-5 pb-28">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Card 1: Assigned Specifications */}
          <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                <Sprout className="w-4 h-4 text-emerald-600" />
                Office Harvesting Instructions
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handle2HourPing}
                className="border-sky-200 text-sky-700 hover:bg-sky-50 font-bold text-xs rounded-xl gap-1.5 h-8"
              >
                <Clock className="w-3.5 h-3.5" />
                Log 2-Hr Ping
              </Button>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Harvest Squad</span>
                  <span className="font-bold text-slate-900">{task.teamName || "Harvest Team 3"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase block text-[10px]">Target Brand</span>
                  <span className="font-bold text-slate-900">{task.brandName || "StarPremium Export"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  {task.address}
                </span>
                <span className="font-bold text-emerald-800">{task.tonnage} Tons</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Field Yield Logging */}
          <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                <Weight className="w-4 h-4 text-emerald-600" />
                On-Site Yield Box Count
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Total Packed Boxes <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={harvestedBoxes}
                  onChange={(e) => setHarvestedBoxes(e.target.value)}
                  placeholder="e.g. 540"
                  className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-bold text-sm"
                />
              </div>

              {/* Chemical Verification Checklist */}
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
                  Chemical Treatments Applied
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(CHEMICAL_LABELS) as ChemicalOption[]).map((chemKey) => {
                    const isChecked = appliedChemicals.includes(chemKey);
                    return (
                      <button
                        key={chemKey}
                        type="button"
                        onClick={() => toggleChemical(chemKey)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        <span>{CHEMICAL_LABELS[chemKey]}</span>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                            isChecked
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Logistics & Transport Details */}
          <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                <Truck className="w-4 h-4 text-emerald-600" />
                Transport Logistics & Cold Storage Dispatch
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Truck Vehicle Registration Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={truckNumber}
                  onChange={(e) => setTruckNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. TN-74-AX-8921"
                  className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-mono font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" /> Driver Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver's name"
                    className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> Driver Contact Phone <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-medium"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sticky Action Footer */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <Button
                type="submit"
                disabled={!isValid}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-600/30 gap-2 text-sm sm:text-base"
              >
                <Truck className="w-5 h-5" />
                Complete Harvest & Dispatch to Cold Storage
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
