"use client";

import { useState, useEffect } from "react";
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
  Send,
  Share2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { QualityType, BoxType, BOX_TYPE_LABELS, QUALITY_LABELS, ProcurementTask } from "@/types";
import { shareReportMessage } from "@/lib/share";

const ALL_BOX_TYPES: BoxType[] = ["5KG", "7KG", "13KG", "13_5KG", "16KG"];

export function FieldInspectionForm({ taskId }: { taskId: string }) {
  const { procurementTasks } = useStartrekStore();
  const [loading, setLoading] = useState(true);

  // Hard refreshes and shared deep links arrive with an empty store — pull the
  // real task from the database before rendering anything.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/procurement")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.tasks) store.setProcurementTasks(data.tasks);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const task = procurementTasks.find((t) => t.id === taskId);

  if (loading && !task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-3">
        <div className="w-9 h-9 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading farm task…</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4 px-6 text-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-heading">Procurement task not found</h2>
          <p className="text-sm text-slate-500 mt-1">
            This task may have been reassigned or the link is incorrect.
          </p>
        </div>
        <Link href="/supervisor">
          <Button variant="outline" className="rounded-xl font-bold border-slate-300">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return <InspectionFormBody task={task} />;
}

function InspectionFormBody({ task }: { task: ProcurementTask }) {
  const router = useRouter();

  const [actualTonnage, setActualTonnage] = useState(
    task.actualTonnage ? String(task.actualTonnage) : String(task.approxTonnage)
  );
  const [ratioPercentage, setRatioPercentage] = useState(
    task.ratioPercentage ? String(task.ratioPercentage) : ""
  );
  const [quality, setQuality] = useState<QualityType | "">(task.quality || "");
  const [rejectionReason, setRejectionReason] = useState(task.rejectionReason || "");
  const [selectedBoxTypes, setSelectedBoxTypes] = useState<BoxType[]>(
    task.particulars?.map((p) => p.boxType) || []
  );

  // Proposed rate is optional — office sets the final locked rate
  const [supervisorRatePerKg, setSupervisorRatePerKg] = useState<string>(
    task.supervisorRatePerKg || task.rate ? String(task.supervisorRatePerKg || task.rate) : ""
  );
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Field quality metrics (Module 2)
  const [chilling, setChilling] = useState<boolean | null>(task.chilling ?? null);
  const [pulpPercentage, setPulpPercentage] = useState(
    task.pulpPercentage != null ? String(task.pulpPercentage) : ""
  );
  const [redRustPercentage, setRedRustPercentage] = useState(
    task.redRustPercentage != null ? String(task.redRustPercentage) : ""
  );
  const [skinCosmeticsQuality, setSkinCosmeticsQuality] = useState<"" | "GOOD" | "EXCELLENT" | "AVERAGE">(
    (task.skinCosmeticsQuality as "GOOD" | "EXCELLENT" | "AVERAGE" | undefined) || ""
  );
  const [skinCosmeticsPercentage, setSkinCosmeticsPercentage] = useState(
    task.skinCosmeticsPercentage != null ? String(task.skinCosmeticsPercentage) : ""
  );
  const [fingerLengthInch, setFingerLengthInch] = useState(
    task.fingerLengthInch != null ? String(task.fingerLengthInch) : ""
  );
  const [caliberNumber, setCaliberNumber] = useState(
    task.caliberNumber != null ? String(task.caliberNumber) : ""
  );

  const toggleBoxType = (boxType: BoxType) => {
    if (selectedBoxTypes.includes(boxType)) {
      if (selectedBoxTypes.length === 1) return;
      setSelectedBoxTypes(selectedBoxTypes.filter((b) => b !== boxType));
    } else {
      setSelectedBoxTypes([...selectedBoxTypes, boxType]);
    }
  };

  const isValid = actualTonnage && ratioPercentage && quality && selectedBoxTypes.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !quality) return;

    try {
      const res = await fetch("/api/procurement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          status: "FIELD_SUBMITTED",
          actualTonnage: parseFloat(actualTonnage) || 0,
          ratioPercentage: parseFloat(ratioPercentage) || 0,
          quality,
          rejectionReason,
          particulars: selectedBoxTypes.map(boxType => ({ boxType })),
          ...(supervisorRatePerKg.trim() ? { supervisorRatePerKg: parseFloat(supervisorRatePerKg) } : {}),
          chilling: chilling === null ? undefined : chilling,
          pulpPercentage: pulpPercentage.trim() ? parseFloat(pulpPercentage) : undefined,
          redRustPercentage: redRustPercentage.trim() ? parseFloat(redRustPercentage) : undefined,
          ...(skinCosmeticsQuality ? { skinCosmeticsQuality } : {}),
          skinCosmeticsPercentage: skinCosmeticsPercentage.trim() ? parseFloat(skinCosmeticsPercentage) : undefined,
          fingerLengthInch: fingerLengthInch.trim() ? parseFloat(fingerLengthInch) : undefined,
          caliberNumber: caliberNumber.trim() ? parseInt(caliberNumber, 10) : undefined,
        }),
      });

      if (!res.ok) throw new Error("API failed");

      store.submitFieldInspection(
        task.id,
        parseFloat(actualTonnage) || 0,
        parseFloat(ratioPercentage) || 0,
        quality,
        selectedBoxTypes,
        rejectionReason,
        supervisorRatePerKg.trim() ? parseFloat(supervisorRatePerKg) : undefined
      );

      toast.success("Field Inspection Report Submitted!", {
        description: `Report for ${task.farmer.name} (${actualTonnage} T, ${quality}) updated live for Office Admin review.`,
      });

      setShowWhatsAppModal(true);
    } catch (error) {
      console.error("Error submitting field inspection:", error);
      toast.error("Failed to sync field inspection to database");
    }
  };

  const whatsappMessage = `*FIELD INSPECTION REPORT*\nFarmer: ${task.farmer.name}\nLocation: ${task.farmer.address}\nActual Tonnage: ${actualTonnage} Tons\nStem Ratio: ${ratioPercentage}%\nQuality Grade: ${quality ? QUALITY_LABELS[quality] : "Not graded"}\nBox Particulars: ${selectedBoxTypes.map((b) => BOX_TYPE_LABELS[b]).join(", ") || "Not specified"}\nInspector: ${task.supervisor?.name || "Field Supervisor"}`;

  const handleCopyWhatsAppMessage = async () => {
    await shareReportMessage(whatsappMessage, "Field Inspection Report");
  };

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
                  <Label className="text-xs font-bold text-slate-700">Proposed Rate (₹/Kg) <span className="text-slate-400 font-medium">(optional)</span></Label>
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

              {/* Field Quality Metrics (Module 2) */}
              <div className="space-y-3 pt-1 border-t border-slate-100 mt-1 pt-4">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Field Quality Metrics
                </Label>

                {/* Chilling: Yes / No */}
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-bold text-slate-700 w-40 flex-shrink-0">Chilling</Label>
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    {([true, false] as boolean[]).map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => setChilling(val)}
                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          chilling === val
                            ? val
                              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                              : "bg-rose-50 border-rose-300 text-rose-950"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {val ? "❄️ Yes" : "No"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Pulp % */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Pulp %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={pulpPercentage}
                      onChange={(e) => setPulpPercentage(e.target.value)}
                      placeholder="e.g. 65"
                      className="bg-white border-slate-200 text-slate-900 font-bold h-11 rounded-xl"
                    />
                  </div>

                  {/* Red Rust % */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Red Rust %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={redRustPercentage}
                      onChange={(e) => setRedRustPercentage(e.target.value)}
                      placeholder="e.g. 2"
                      className="bg-white border-slate-200 text-slate-900 font-bold h-11 rounded-xl"
                    />
                  </div>

                  {/* Skin Cosmetics % */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Skin Cosmetics %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={skinCosmeticsPercentage}
                      onChange={(e) => setSkinCosmeticsPercentage(e.target.value)}
                      placeholder="e.g. 90"
                      className="bg-white border-slate-200 text-slate-900 font-bold h-11 rounded-xl"
                    />
                  </div>

                  {/* Finger Length (inch) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Finger Length (inch)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fingerLengthInch}
                      onChange={(e) => setFingerLengthInch(e.target.value)}
                      placeholder="e.g. 7.5"
                      className="bg-white border-slate-200 text-slate-900 font-bold h-11 rounded-xl"
                    />
                  </div>

                  {/* Caliber (number) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Caliber (No.)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={caliberNumber}
                      onChange={(e) => setCaliberNumber(e.target.value)}
                      placeholder="e.g. 14"
                      className="bg-white border-slate-200 text-slate-900 font-bold h-11 rounded-xl"
                    />
                  </div>
                </div>

                {/* Skin Cosmetics grade */}
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-bold text-slate-700 w-40 flex-shrink-0">Skin Cosmetics Grade</Label>
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {(["EXCELLENT", "GOOD", "AVERAGE"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSkinCosmeticsQuality(g)}
                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          skinCosmeticsQuality === g
                            ? "bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {g.charAt(0) + g.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
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
                Share Report
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs font-medium text-slate-700">
              <p className="text-slate-600">
                Inspection report submitted! Share the summary and pick your WhatsApp group, or copy the text:
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
                  router.push("/supervisor");
                }}
                className="rounded-xl font-bold"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={handleCopyWhatsAppMessage}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5"
              >
                <Share2 className="w-4 h-4" /> Share / Copy Message
              </Button>
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
