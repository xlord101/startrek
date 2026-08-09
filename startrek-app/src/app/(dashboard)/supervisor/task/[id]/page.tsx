"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { store, useStartrekStore } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Weight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Share2,
  Package,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { QualityType, BoxType, BOX_TYPE_LABELS, QUALITY_LABELS } from "@/types";

const ALL_BOX_TYPES: BoxType[] = ["5KG", "7KG", "13KG", "13_5KG", "16KG"];

export function FieldInspectionForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { procurementTasks } = useStartrekStore();

  const task = procurementTasks.find((t) => t.id === taskId) || procurementTasks[0];

  const [actualTonnage, setActualTonnage] = useState(
    task.actualTonnage ? String(task.actualTonnage) : String(task.approxTonnage)
  );
  const [ratioPercentage, setRatioPercentage] = useState(
    task.ratioPercentage ? String(task.ratioPercentage) : "78"
  );
  const [quality, setQuality] = useState<QualityType>(task.quality || "GOOD");
  const [rejectionReason, setRejectionReason] = useState(task.rejectionReason || "");
  const [selectedBoxTypes, setSelectedBoxTypes] = useState<BoxType[]>(
    task.particulars?.map((p) => p.boxType) || ["13KG"]
  );

  const [supervisorRatePerKg, setSupervisorRatePerKg] = useState<string>(
    task.supervisorRatePerKg || task.rate ? String(task.supervisorRatePerKg || task.rate) : "22.5"
  );
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const toggleBoxType = (boxType: BoxType) => {
    if (selectedBoxTypes.includes(boxType)) {
      if (selectedBoxTypes.length === 1) return;
      setSelectedBoxTypes(selectedBoxTypes.filter((b) => b !== boxType));
    } else {
      setSelectedBoxTypes([...selectedBoxTypes, boxType]);
    }
  };

  const isValid = actualTonnage && ratioPercentage && quality && selectedBoxTypes.length > 0 && supervisorRatePerKg;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    store.submitFieldInspection(
      task.id,
      parseFloat(actualTonnage) || 0,
      parseFloat(ratioPercentage) || 0,
      quality,
      selectedBoxTypes,
      rejectionReason,
      parseFloat(supervisorRatePerKg) || 22.5
    );

    toast.success("Field Inspection Report Submitted!", {
      description: `Report for ${task.farmer.name} (${actualTonnage} T, ${quality}) updated live for Office Admin review.`,
    });

    setShowWhatsAppModal(true);
  };

  const whatsappMessage = `*FIELD INSPECTION REPORT*\nFarmer: ${task.farmer.name}\nLocation: ${task.farmer.address}\nActual Tonnage: ${actualTonnage} Tons\nStem Ratio: ${ratioPercentage}%\nQuality Grade: ${QUALITY_LABELS[quality]}\nBox Particulars: ${selectedBoxTypes.map((b) => BOX_TYPE_LABELS[b]).join(", ")}\nInspector: ${task.supervisor?.name || "Field Supervisor"}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/supervisor">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 rounded-xl">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                Farm Visit & Inspection Form
              </h1>
              <p className="text-xs text-slate-500">
                Farmer: <strong className="text-slate-800">{task.farmer.name}</strong>
              </p>
            </div>
          </div>
          <StatusBadge status={task.status} />
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-5 pb-24">
        {/* Farm & Contact Info */}
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Verified Farmer Record
              </span>
              <h2 className="text-lg font-bold text-slate-900 font-heading mt-1">
                {task.farmer.name}
              </h2>
            </div>
            <a href={`tel:${task.farmer.mobileNumber}`}>
              <Button size="sm" variant="outline" className="rounded-xl border-slate-200 text-slate-700 font-bold gap-1 text-xs h-9">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Call Farmer
              </Button>
            </a>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
            <p className="text-slate-600 flex items-start gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>{task.farmer.address}</span>
            </p>
            <p className="text-slate-600 flex items-center gap-1">
              <Weight className="w-3.5 h-3.5 text-slate-400" />
              <span>Office Approx Yield: <strong>{task.approxTonnage} Tons</strong></span>
            </p>
          </div>
        </Card>

        {/* Inspection Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-3.5 px-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                On-Site Yield & Quality Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Actual Verified Tonnage (Tons) <span className="text-rose-500">*</span></Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={actualTonnage}
                    onChange={(e) => setActualTonnage(e.target.value)}
                    placeholder="e.g. 14.2"
                    className="bg-white border-slate-200 text-slate-900 font-bold h-11 rounded-xl text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Stem / Cutting Ratio % <span className="text-rose-500">*</span></Label>
                  <Input
                    type="number"
                    value={ratioPercentage}
                    onChange={(e) => setRatioPercentage(e.target.value)}
                    placeholder="e.g. 78"
                    className="bg-white border-slate-200 text-slate-900 font-bold h-11 rounded-xl text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Proposed Rate (₹/Kg) <span className="text-rose-500">*</span></Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={supervisorRatePerKg}
                    onChange={(e) => setSupervisorRatePerKg(e.target.value)}
                    placeholder="e.g. 22.5"
                    className="bg-white border-emerald-300 text-slate-900 font-black h-11 rounded-xl text-base"
                  />
                </div>
              </div>

              {/* Quality Selector */}
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-bold text-slate-700">Produce Quality Rating <span className="text-rose-500">*</span></Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(["EXCELLENT", "GOOD", "AVERAGE", "REJECT"] as QualityType[]).map((q) => {
                    const isSelected = quality === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuality(q)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? q === "EXCELLENT" || q === "GOOD"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-rose-600 text-white border-rose-600 shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {QUALITY_LABELS[q]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Box Types Selection */}
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-bold text-slate-700">Required Packaging Box Types (Multi-Select) <span className="text-rose-500">*</span></Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ALL_BOX_TYPES.map((bt) => {
                    const isSelected = selectedBoxTypes.includes(bt);
                    return (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => toggleBoxType(bt)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {BOX_TYPE_LABELS[bt]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rejection / Note Input */}
              {(quality === "AVERAGE" || quality === "REJECT") && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-bold text-rose-700">Rejection / Defect Notes</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify defect reason (e.g. Black spot disease, undersized finger count)..."
                    rows={2}
                    className="bg-white border-rose-200 text-slate-900 rounded-xl font-medium resize-none"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={!isValid}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-600/30 gap-2 text-base"
          >
            <Send className="w-4.5 h-4.5" />
            Submit Inspection & Alert Office Admin
          </Button>
        </form>
      </div>

      {/* WhatsApp Share Confirmation Modal */}
      {showWhatsAppModal && (
        <Dialog open onOpenChange={() => setShowWhatsAppModal(false)}>
          <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700 text-lg font-bold">
                <Share2 className="w-5 h-5" />
                Share Report via WhatsApp
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs font-medium text-slate-700">
              <p className="text-slate-600">
                Inspection report submitted! Share summary with Office Admin team on WhatsApp:
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] whitespace-pre-wrap">
                {whatsappMessage}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowWhatsAppModal(false);
                  router.push("/admin/procurement");
                }}
                className="rounded-xl font-bold"
              >
                Go to Dashboard
              </Button>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5">
                  <Share2 className="w-4 h-4" /> Share on WhatsApp
                </Button>
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function TaskPage() {
  const params = useParams();
  const taskId = params.id as string;
  return <FieldInspectionForm taskId={taskId} />;
}
