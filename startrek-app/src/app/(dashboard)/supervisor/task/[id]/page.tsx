"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { mockTasks } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Share2,
  AlertTriangle,
  MapPin,
  Weight,
  Sprout,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
} from "lucide-react";
import Link from "next/link";
import { BoxType, QualityType } from "@/types";
import { toast } from "sonner";

export default function FieldInspectionPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const task = mockTasks.find((t) => t.id === taskId) || mockTasks[2];

  // Form State
  const [farmerName, setFarmerName] = useState(task.farmer.name);
  const [mobileNumber, setMobileNumber] = useState(task.farmer.mobileNumber);
  const [altMobileNumber, setAltMobileNumber] = useState(task.altMobileNumber || "");
  const [address, setAddress] = useState(task.farmer.address);

  const [actualTonnage, setActualTonnage] = useState(task.actualTonnage ? String(task.actualTonnage) : "");
  const [ratioPercentage, setRatioPercentage] = useState(task.ratioPercentage ? String(task.ratioPercentage) : "");
  const [quality, setQuality] = useState<QualityType | "">(task.quality || "");
  const [rejectionReason, setRejectionReason] = useState(task.rejectionReason || "");
  const [rate, setRate] = useState(task.rate ? String(task.rate) : "");

  // Dynamic Particulars
  const [particulars, setParticulars] = useState<BoxType[]>(
    task.particulars && task.particulars.length > 0
      ? task.particulars.map((p) => p.boxType)
      : ["13KG"]
  );

  const addParticular = () => {
    setParticulars([...particulars, "13KG"]);
  };

  const removeParticular = (index: number) => {
    if (particulars.length <= 1) return;
    setParticulars(particulars.filter((_, i) => i !== index));
  };

  const updateParticular = (index: number, val: BoxType | null) => {
    if (!val) return;
    const updated = [...particulars];
    updated[index] = val;
    setParticulars(updated);
  };

  // Validation
  const isReject = quality === "REJECT";
  const isValid =
    farmerName.trim() &&
    mobileNumber.trim() &&
    address.trim() &&
    actualTonnage &&
    ratioPercentage &&
    quality &&
    (!isReject || rejectionReason.trim()) &&
    particulars.length > 0;

  // WhatsApp Message Generator
  const generateWhatsAppMessage = () => {
    const boxText = particulars.map((b) => `• Box Type: ${b.replace("_", ".")}`).join("\n");
    const text = `*STARTREK FIELD PROCUREMENT REPORT*
----------------------------------------
*Farmer:* ${farmerName}
*Location:* ${address}
*Phone:* ${mobileNumber}${altMobileNumber ? ` / ${altMobileNumber}` : ""}

*BOX PARTICULARS:*
${boxText}

*INSPECTION DATA:*
• Actual Tonnage: ${actualTonnage} Tons
• Ratio: ${ratioPercentage}%
• Quality: ${quality}${isReject ? `\n• Rejection Reason: ${rejectionReason}` : ""}
${rate ? `• On-site Rate: ₹${rate}/Ton` : ""}
----------------------------------------
*Supervisor:* Arjun Nair
*Status:* Field Submitted`;

    return encodeURIComponent(text);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const waLink = `https://wa.me/?text=${generateWhatsAppMessage()}`;

    toast.success("Field Report Submitted", {
      description: "Opening WhatsApp to dispatch report to team group...",
    });

    setTimeout(() => {
      window.open(waLink, "_blank");
      router.push("/supervisor");
    }, 800);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/supervisor">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 font-heading">
                Field Inspection Form
              </h1>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                Module 1.3
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Farmer: <strong className="text-slate-800">{task.farmer.name}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-5 pb-28">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Card 1: Farmer & Farm Info */}
          <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Farm Contact & Location
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Farmer Name</Label>
                <Input
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Primary Mobile</Label>
                  <Input
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Alt Phone (Optional)</Label>
                  <Input
                    value={altMobileNumber}
                    onChange={(e) => setAltMobileNumber(e.target.value)}
                    placeholder="Alternate number"
                    className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Farm Location Address</Label>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="bg-white border-slate-200 text-slate-900 rounded-xl font-medium resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Box Particulars */}
          <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  Box Particulars & Weight Types
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Add all box categories yielding from this farm
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {particulars.map((box, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="flex-1">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Box Category #{idx + 1}
                    </Label>
                    <Select value={box} onValueChange={(val: any) => updateParticular(idx, val)}>
                      <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 rounded-xl">
                        <SelectItem value="5KG">5 kg Box</SelectItem>
                        <SelectItem value="7KG">7 kg Box</SelectItem>
                        <SelectItem value="13KG">13 kg Box</SelectItem>
                        <SelectItem value="13_5KG">13.5 kg Box</SelectItem>
                        <SelectItem value="16KG">16 kg Box</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {particulars.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeParticular(idx)}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-10 w-10 mt-5 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addParticular}
                className="w-full border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50/50 font-bold h-10 rounded-xl gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                Add Another Particular
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Yield Measurement & Quality */}
          <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                <Weight className="w-4 h-4 text-emerald-600" />
                Yield & Quality Rating
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Actual Measured Yield (Tons) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={actualTonnage}
                    onChange={(e) => setActualTonnage(e.target.value)}
                    placeholder="e.g. 11.5"
                    className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-bold text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Ratio (%) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={ratioPercentage}
                    onChange={(e) => setRatioPercentage(e.target.value)}
                    placeholder="e.g. 80"
                    className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Produce Quality Grade <span className="text-rose-500">*</span>
                </Label>
                <Select value={quality} onValueChange={(val: any) => setQuality(val || "")}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-bold">
                    <SelectValue placeholder="Select quality rating..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl">
                    <SelectItem value="EXCELLENT" className="font-bold text-emerald-700">Excellent Grade</SelectItem>
                    <SelectItem value="GOOD" className="font-bold text-emerald-600">Good Grade</SelectItem>
                    <SelectItem value="AVERAGE" className="font-bold text-amber-600">Average Grade</SelectItem>
                    <SelectItem value="REJECT" className="font-bold text-rose-600">Reject Grade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Rejection Reason */}
              {isReject && (
                <div className="space-y-1.5 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                  <Label className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Rejection Reason <span className="text-rose-600">*</span>
                  </Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify reason for rejection (e.g. disease, sizing, scar defects)..."
                    rows={2}
                    className="bg-white border-rose-200 text-slate-900 rounded-xl text-xs font-medium resize-none focus-visible:ring-rose-500"
                  />
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-bold text-slate-700">
                  Agreed On-Site Rate (Optional ₹ / Ton)
                </Label>
                <Input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 2200 (Leave blank if admin finalized)"
                  className="bg-white border-slate-200 text-slate-900 h-10 rounded-xl font-semibold text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <Button
                type="submit"
                disabled={!isValid}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-600/30 gap-2 text-sm sm:text-base"
              >
                <Share2 className="w-5 h-5" />
                Submit & Share to WhatsApp
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
