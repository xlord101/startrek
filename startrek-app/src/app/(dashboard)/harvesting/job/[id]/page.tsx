"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { store, useStartrekStore } from "@/lib/store";
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
  Truck,
  MapPin,
  Sprout,
  Clock,
  FlaskConical,
  User,
  Phone,
  Printer,
  Package,
  Calendar,
  Building,
  CheckCircle2,
  Warehouse,
  AlertTriangle,
  Share2,
  ShieldCheck,
  RotateCcw,
  Edit3,
  Check,
  AlertOctagon,
  Ban,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { BoxType, BOX_TYPE_LABELS, QualityType } from "@/types";

export default function HarvestingJobFormPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const { harvestTasks } = useStartrekStore();
  const task = harvestTasks.find((t) => t.id === jobId) || harvestTasks[0];

  // Pipeline Workflow Step: 1 = Inventory Pickup, 2 = Quality Check & Work Start, 3 = Pings & Bill Dispatch
  const [workflowStep, setWorkflowStep] = useState<1 | 2 | 3>(
    task?.status === "HARVEST_ASSIGNED"
      ? 1
      : task?.status === "PICKUP_COMPLETED"
      ? 2
      : 3
  );

  /* ─── STEP 1: Inventory Pickup State ────────────────────────────── */
  const selectedBoxTypes: BoxType[] = task?.selectedBoxTypes || ["7KG", "13KG"];
  const requiredBoxCounts = task?.requiredBoxCounts || { "7KG": 400, "13KG": 300 };

  const [actualBoxPickups, setActualBoxPickups] = useState<Partial<Record<BoxType, number>>>({});

  useEffect(() => {
    if (task && Object.keys(actualBoxPickups).length === 0) {
      if (task.actualBoxPickups && Object.keys(task.actualBoxPickups).length > 0) {
        setActualBoxPickups(task.actualBoxPickups);
      } else {
        const selected: BoxType[] = task.selectedBoxTypes || ["7KG", "13KG"];
        const required = task.requiredBoxCounts || { "7KG": 400, "13KG": 300 };
        const initialPickups = selected.reduce((acc, bt) => {
          acc[bt] = (required[bt] || 0) + 50;
          return acc;
        }, {} as Partial<Record<BoxType, number>>);
        setActualBoxPickups(initialPickups);
      }
    }
  }, [task, actualBoxPickups]);

  const [tiltPickup, setTiltPickup] = useState("150 ML");
  const [cChemPickup, setCChemPickup] = useState("50 gm");
  const [bavistinPickup, setBavistinPickup] = useState("1 kg");

  const totalBoxesPickedUp = useMemo(() => {
    return Object.values(actualBoxPickups).reduce((a, b) => (a || 0) + (b || 0), 0);
  }, [actualBoxPickups]);

  const handlePickupConfirm = () => {
    store.confirmHarvestPickup(task.id, actualBoxPickups);
    
    // Sync with DB
    fetch("/api/harvest", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: task.id,
        action: "CONFIRM_PICKUP",
        actualBoxPickups
      })
    }).catch(console.error);

    setWorkflowStep(2);
    toast.success("Inventory Deducted & Pickup Confirmed!", {
      description: `Picked up ${totalBoxesPickedUp} boxes (+50 buffer) & chemicals. Subtracted from Main Inventory Stock.`,
    });
  };

  /* ─── STEP 2: On-Site Quality Check & Work Start ─────────────── */
  const [qualityCheck, setQualityCheck] = useState<QualityType>("EXCELLENT");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const handleStartWork = () => {
    store.registerWorkStarted(task.id, qualityCheck);

    // Sync with DB
    fetch("/api/harvest", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: task.id,
        action: "WORK_STARTED",
        qualityCheck
      })
    }).catch(console.error);

    setWorkflowStep(3);
    if (qualityCheck === "EXCELLENT" || qualityCheck === "GOOD") {
      setShowWhatsAppModal(true);
      toast.success("Work Started Registered!", {
        description: `Timestamp recorded (${new Date().toLocaleTimeString()}). Office notified.`,
      });
    } else {
      toast.warning("Quality Marked Average/Reject", {
        description: `Office admin notified for internal farm re-allocation or call handling.`,
      });
    }
  };

  /* ─── STEP 3: 2-Hour Progress Pings & Force Complete ────────────── */
  const targetRequiredTotal = useMemo(() => {
    return Object.values(requiredBoxCounts).reduce((a, b) => (a || 0) + (b || 0), 0);
  }, [requiredBoxCounts]);

  const [currentFilledBoxes, setCurrentFilledBoxes] = useState<number>(
    task?.currentFilledBoxes || 0
  );

  const gapBoxes = useMemo(() => {
    const diff = targetRequiredTotal - currentFilledBoxes;
    return diff > 0 ? diff : 0;
  }, [targetRequiredTotal, currentFilledBoxes]);

  // Force Complete State
  const [showForceCompleteModal, setShowForceCompleteModal] = useState(false);
  const [shortfallReason, setShortfallReason] = useState(
    "Bananas depleted in orchard due to higher field wastage & smaller bunch size."
  );

  const [fieldDamagedBoxes, setFieldDamagedBoxes] = useState<number>(
    task?.fieldDamagedBoxes || 0
  );

  const handle2HourPingUpdate = () => {
    store.updateHarvestProgress(task.id, currentFilledBoxes);

    // Sync with DB
    fetch("/api/harvest", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: task.id,
        action: "UPDATE_PROGRESS",
        currentFilledBoxes,
        fieldDamagedBoxes
      })
    }).catch(console.error);

    toast.info("2-Hour Progress Update Logged!", {
      description: `Filled: ${currentFilledBoxes} boxes. Gap to fill: ${gapBoxes} boxes. Office updated.`,
    });
  };

  const handleConfirmForceComplete = () => {
    store.forceCompleteHarvest(task.id, currentFilledBoxes, shortfallReason);

    // Sync with DB
    fetch("/api/harvest", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: task.id,
        action: "FORCE_COMPLETE",
        currentFilledBoxes,
        shortfallReason
      })
    }).catch(console.error);

    setShowForceCompleteModal(false);
    toast.warning("Harvest Force Completed with Shortfall!", {
      description: `Harvest closed at ${currentFilledBoxes} boxes. Remaining gap of ${gapBoxes} boxes reported to Office Admin.`,
    });
  };

  /* ─── FINAL DISPATCH: Fully Editable Kiran Doke Procurement Bill ───────── */
  const [billDate, setBillDate] = useState<string>("02/07/2026");
  const [vehicleNo, setVehicleNo] = useState<string>(
    task?.vehicleSupplier?.vehicleNumber || task?.truckNumber || "GJ.22.U.2117"
  );
  const [location, setLocation] = useState<string>(task?.address || "Bhacharwada");
  const [farmerName, setFarmerName] = useState<string>(task?.farmerName || "Naresh Bhai Sankar Bhai");
  const [farmerContact, setFarmerContact] = useState<string>(task?.mobileNumber || "9825860047");
  const [lineName, setLineName] = useState<string>(task?.lineName || "chamtkar team");
  const [supervisorName, setSupervisorName] = useState<string>(
    task?.supervisorName || "Soyal & Yash"
  );
  const [vendorName, setVendorName] = useState<string>(
    task?.vendorName || "Reva Fresh Fruit Thari"
  );
  const [dealPersonName, setDealPersonName] = useState<string>(task?.dealPersonName || "Sunil Doke");
  const [rate, setRate] = useState<string>(String(task?.finalRate || 2350));

  const [orchardParticulars, setOrchardParticulars] = useState<string>("Orchard Banana 7kg");

  // Dynamically calculate initial hand counts proportional to filled boxes (4H: 22%, 5H: 32%, 6H: 27%, 7H: 11%, 8H: 8%)
  const defaultFilled = currentFilledBoxes || 0;
  const initial4H = Math.round(defaultFilled * 0.22);
  const initial5H = Math.round(defaultFilled * 0.32);
  const initial6H = Math.round(defaultFilled * 0.27);
  const initial7H = Math.round(defaultFilled * 0.11);
  const initial8H = defaultFilled > 0 ? (defaultFilled - (initial4H + initial5H + initial6H + initial7H)) : 0;

  const [box4H, setBox4H] = useState<string>(String(initial4H));
  const [box5H, setBox5H] = useState<string>(String(initial5H));
  const [box6H, setBox6H] = useState<string>(String(initial6H));
  const [box7H, setBox7H] = useState<string>(String(initial7H));
  const [box8H, setBox8H] = useState<string>(String(initial8H));
  const [wastage, setWastage] = useState<string>("0");
  const [destinationColdStorage, setDestinationColdStorage] = useState<string>(
    task?.destinationColdStorage || "Reva cold storage"
  );

  // Auto-calculated box sum with override capability
  const calculatedHandSum = useMemo(() => {
    return (
      (parseInt(box4H) || 0) +
      (parseInt(box5H) || 0) +
      (parseInt(box6H) || 0) +
      (parseInt(box7H) || 0) +
      (parseInt(box8H) || 0)
    );
  }, [box4H, box5H, box6H, box7H, box8H]);

  const [totalBoxOverride, setTotalBoxOverride] = useState<string>(String(defaultFilled));

  // Keep totalBoxOverride synced with calculatedHandSum if user edits hand counts
  // (React-recommended "adjust state during render" pattern — no effect needed)
  const [prevHandSum, setPrevHandSum] = useState<number>(calculatedHandSum);
  if (prevHandSum !== calculatedHandSum) {
    setPrevHandSum(calculatedHandSum);
    if (calculatedHandSum > 0) {
      setTotalBoxOverride(String(calculatedHandSum));
    }
  }

  // Form Editing Mode State in Bill Modal
  const [isEditingBill, setIsEditingBill] = useState(true);

  const [showBillModal, setShowBillModal] = useState(false);
  const [showColdStorageWhatsAppModal, setShowColdStorageWhatsAppModal] = useState(false);

  // Leftover Empty Boxes Calculation
  const loadedBoxesCount = parseInt(totalBoxOverride) || calculatedHandSum || 0;
  const leftoverEmptyBoxes = useMemo(() => {
    const diff = totalBoxesPickedUp - loadedBoxesCount;
    return diff > 0 ? diff : 0;
  }, [totalBoxesPickedUp, loadedBoxesCount]);

  const handleFinalDispatch = () => {
    setShowBillModal(false);
    setShowColdStorageWhatsAppModal(true);

    const billData = {
      date: billDate,
      vehicleNo,
      location,
      farmerName,
      farmerContact,
      lineName,
      supervisorName,
      vendorName,
      dealPersonName,
      rate: parseFloat(rate) || 2350,
      tiltDosage: tiltPickup,
      cChemicalDosage: cChemPickup,
      bavistinDosage: bavistinPickup,
      orchardParticulars,
      box4H: parseInt(box4H) || 0,
      box5H: parseInt(box5H) || 0,
      box6H: parseInt(box6H) || 0,
      box7H: parseInt(box7H) || 0,
      box8H: parseInt(box8H) || 0,
      totalBoxCount: loadedBoxesCount,
      wastage: parseInt(wastage) || 0,
      destinationColdStorage,
    };

    // Store mutation: pushes truck dispatch to Cold Storage and queues leftover boxes for Inventory Return!
    store.dispatchHarvestBill(task.id, billData, totalBoxesPickedUp, loadedBoxesCount);

    // Sync with DB
    fetch("/api/harvest", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: task.id,
        action: "DISPATCH_BILL",
        billData,
        totalBoxesPickedUp,
        loadedBoxesCount
      })
    }).catch(console.error);

    toast.success("Kiran Doke Bill Generated & Vehicle Dispatched!", {
      description: `Truck ${vehicleNo} dispatched to ${destinationColdStorage} with ${loadedBoxesCount} boxes. Leftover ${leftoverEmptyBoxes} boxes queued for Inventory Return.`,
    });
  };

  const coldStorageWhatsAppMsg = `*COLD STORAGE DISPATCH ALERT*\n\n*Destination:* ${destinationColdStorage}\n*Vehicle No:* ${vehicleNo}\n*Driver:* ${task?.vehicleSupplier?.driverName || "Shanmugam"} (${task?.vehicleSupplier?.driverPhone || "9412345678"})\n*Farmer:* ${farmerName} (${location})\n*Total Boxes Loaded:* ${loadedBoxesCount} Boxes\n*Hand Breakdown:* 4H:${box4H}, 5H:${box5H}, 6H:${box6H}, 7H:${box7H}, 8H:${box8H}\n*Brand:* ${task?.brandName || "StarPremium"}\n*Rate:* ₹${rate}/T`;
  const coldStorageWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(coldStorageWhatsAppMsg)}`;

  if (!task) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/harvesting">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 rounded-xl">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                  Field Supervisor Workflow
                </h1>
                {task.isHighPriority && (
                  <Badge className="bg-rose-600 text-white text-[10px] font-black px-2 py-0 animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> HIGH PRIORITY
                  </Badge>
                )}
                {task.isForceCompleted && (
                  <Badge className="bg-amber-600 text-white text-[10px] font-black px-2 py-0 flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" /> CLOSED WITH SHORTFALL
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Farm: <strong className="text-slate-800">{farmerName}</strong> • Yield: {task.tonnage} T
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setWorkflowStep(1)}
              className={`px-2.5 py-1 rounded-lg transition-all ${workflowStep === 1 ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}`}
            >
              1. Pickup
            </button>
            <button
              onClick={() => setWorkflowStep(2)}
              className={`px-2.5 py-1 rounded-lg transition-all ${workflowStep === 2 ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}`}
            >
              2. Quality
            </button>
            <button
              onClick={() => setWorkflowStep(3)}
              className={`px-2.5 py-1 rounded-lg transition-all ${workflowStep === 3 ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}`}
            >
              3. Bill
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-6 pb-28">

        {/* STEP 1: INVENTORY PICKUP & ACTUAL BOX COUNT INPUT */}
        {workflowStep === 1 && (
          <div className="space-y-5">
            <Card className="border-emerald-200 bg-emerald-900 text-white shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="p-5 sm:p-6 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-white/20 text-white text-xs font-bold px-2.5 py-1">
                    Step 1 of 3 — Inventory Pickup
                  </Badge>
                  <span className="text-xs text-emerald-200 font-mono">Warehouse Issue</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold font-heading text-emerald-300">
                  Pick Up Empty Boxes & Chemicals from Inventory
                </h2>
                <p className="text-xs text-emerald-100/90">
                  Office specified required boxes for order. Enter actual boxes picked up (+50 buffer). Submitting automatically deducts stock from Main Inventory.
                </p>
              </CardContent>
            </Card>

            {/* Office Required vs Supervisor Actual Input */}
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <Package className="w-4 h-4 text-emerald-600" />
                  Box Quantities Picked Up
                </CardTitle>
                <Badge variant="outline" className="bg-slate-100 text-slate-800 text-[10px] font-bold">
                  Stock Auto-Deduction
                </Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedBoxTypes.map((bt) => {
                    const req = requiredBoxCounts[bt] || 0;
                    const actual = actualBoxPickups[bt] || req + 50;
                    return (
                      <div key={bt} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{BOX_TYPE_LABELS[bt]} Boxes</span>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            Office Required: <strong className="text-slate-800">{req}</strong>
                          </span>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-slate-500 font-semibold">
                            Actual Picked Up (With Buffer)
                          </Label>
                          <Input
                            type="number"
                            value={actual}
                            onChange={(e) =>
                              setActualBoxPickups({
                                ...actualBoxPickups,
                                [bt]: parseInt(e.target.value) || 0,
                              })
                            }
                            className="bg-white border-slate-300 text-slate-900 font-black h-11 rounded-xl text-base"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Chemical Pickups */}
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-3.5 px-5">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <FlaskConical className="w-4 h-4 text-emerald-600" />
                  Actual Chemical Quantities Taken
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Tilt Taken</Label>
                    <Input
                      value={tiltPickup}
                      onChange={(e) => setTiltPickup(e.target.value)}
                      placeholder="150 ML"
                      className="bg-white border-slate-200 text-slate-900 font-bold h-11 rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">C chemical Taken</Label>
                    <Input
                      value={cChemPickup}
                      onChange={(e) => setCChemPickup(e.target.value)}
                      placeholder="50 gm"
                      className="bg-white border-slate-200 text-slate-900 font-bold h-11 rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Bavistin Taken</Label>
                    <Input
                      value={bavistinPickup}
                      onChange={(e) => setBavistinPickup(e.target.value)}
                      placeholder="1 kg"
                      className="bg-white border-slate-200 text-slate-900 font-bold h-11 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handlePickupConfirm}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-600/30 gap-2 text-base"
            >
              <CheckCircle2 className="w-5 h-5" />
              Confirm Pickup & Deduct Inventory Stock
            </Button>
          </div>
        )}

        {/* STEP 2: ON-SITE QUALITY CHECK & WORK START TIMESTAMP */}
        {workflowStep === 2 && (
          <div className="space-y-5">
            <Card className="border-sky-200 bg-sky-900 text-white shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="p-5 sm:p-6 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-white/20 text-white text-xs font-bold px-2.5 py-1">
                    Step 2 of 3 — Quality & Work Start
                  </Badge>
                  <span className="text-xs text-sky-200 font-mono">Farm Inspection</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold font-heading text-sky-300">
                  On-Site Produce Quality Check
                </h2>
                <p className="text-xs text-sky-100/90">
                  Perform quality assessment at {farmerName}&apos;s farm. Marking Excellent/Good registers &quot;Work Started&quot; timestamp &amp; triggers WhatsApp share.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-3.5 px-5">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Select Produce Quality Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(["EXCELLENT", "GOOD", "AVERAGE", "REJECT"] as QualityType[]).map((q) => {
                    const isSelected = qualityCheck === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQualityCheck(q)}
                        className={`p-4 rounded-xl border font-bold text-center text-sm transition-all ${
                          isSelected
                            ? q === "EXCELLENT" || q === "GOOD"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                              : "bg-rose-600 text-white border-rose-600 shadow-md"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {q}
                      </button>
                    );
                  })}
                </div>

                {qualityCheck === "AVERAGE" || qualityCheck === "REJECT" ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                    <p className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Farm Re-Allocation Action Required
                    </p>
                    <p className="text-amber-800 font-medium">
                      Office admin will handle this internally via phone calls. You have the option to change or re-allocate the approved farm form.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                    <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Quality Verified — Ready for Harvest
                    </p>
                    <p className="text-emerald-800 font-medium">
                      Submitting will register official &quot;Work Started&quot; timestamp and open WhatsApp sharing modal.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleStartWork}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-600/30 gap-2 text-base"
            >
              <Clock className="w-5 h-5" />
              Register Work Started & Proceed to Packing
            </Button>
          </div>
        )}

        {/* STEP 3: 2-HOUR PROGRESS PINGS, FORCE COMPLETE & FINAL KIRAN DOKE PROCUREMENT BILL */}
        {workflowStep === 3 && (
          <div className="space-y-5">
            <Card className="border-orange-200 bg-orange-950 text-white shadow-xl rounded-2xl overflow-hidden">
              <CardContent className="p-5 sm:p-6 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-white/20 text-white text-xs font-bold px-2.5 py-1">
                    Step 3 of 3 — Field Progress & Bill
                  </Badge>
                  <span className="text-xs text-orange-200 font-mono">Harvest Active</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold font-heading text-orange-300">
                  2-Hour Live Filling Updates & Shortfall Closure
                </h2>
                <p className="text-xs text-orange-100/90">
                  Target Required: <strong>{targetRequiredTotal} Boxes</strong> • Currently Filled: <strong>{currentFilledBoxes} Boxes</strong> • Gap to Fill: <strong>{gapBoxes} Boxes</strong>.
                </p>
              </CardContent>
            </Card>

            {/* Live Progress & Gap Tracking Card */}
            <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  2-Hour Filling Progress Ping Form
                </CardTitle>
                {gapBoxes > 0 && (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs font-bold px-2.5 py-0.5">
                    Gap: {gapBoxes} Boxes Left
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Currently Filled Boxes Count</Label>
                    <Input
                      type="number"
                      value={currentFilledBoxes === 0 ? "" : currentFilledBoxes}
                      onChange={(e) => setCurrentFilledBoxes(parseInt(e.target.value) || 0)}
                      className="bg-white border-slate-300 text-slate-900 font-black h-12 rounded-xl text-lg"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Field Damaged Boxes (Packing Waste)</Label>
                    <Input
                      type="number"
                      value={fieldDamagedBoxes === 0 ? "" : fieldDamagedBoxes}
                      onChange={(e) => setFieldDamagedBoxes(parseInt(e.target.value) || 0)}
                      placeholder="e.g. 12"
                      className="bg-white border-rose-200 text-rose-900 font-black h-12 rounded-xl text-lg"
                    />
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-center text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Target vs Gap Status</span>
                    <span className="text-base font-black text-slate-900 font-heading mt-0.5">
                      {currentFilledBoxes} / {targetRequiredTotal} Boxes
                    </span>
                    <span className="text-xs font-bold text-rose-600 mt-0.5">
                      {gapBoxes > 0 ? `Gap: ${gapBoxes} boxes remaining` : "Target Order Completed!"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={handle2HourPingUpdate}
                    className="border-sky-300 text-sky-800 hover:bg-sky-50 font-bold h-11 rounded-xl gap-2 text-sm"
                  >
                    <Clock className="w-4 h-4" />
                    Send 2-Hour Progress Update
                  </Button>

                  <Button
                    variant="outline"
                    disabled={gapBoxes <= 0}
                    onClick={() => setShowForceCompleteModal(true)}
                    className="border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold h-11 rounded-xl gap-2 text-sm"
                  >
                    <AlertOctagon className="w-4 h-4 text-amber-600" />
                    {gapBoxes <= 0 ? "No Shortfall (Requirement Met)" : "Force Complete (Close with Shortfall)"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Shortfall Banner if Force Completed */}
            {task.isForceCompleted && (
              <div className="p-4 rounded-2xl bg-amber-100 border border-amber-300 text-amber-950 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertOctagon className="w-5 h-5 text-amber-700" />
                  Harvest Closed with Shortfall (Force Completed)
                </div>
                <p className="text-xs text-amber-900 font-medium">
                  <strong>Reason:</strong> {task.shortfallReason || shortfallReason}
                </p>
                <p className="text-xs font-bold text-rose-700 pt-0.5">
                  Remaining Gap: {task.gapBoxes || gapBoxes} boxes reported to Office Admin. No more boxes coming from this farm.
                </p>
              </div>
            )}

            {/* Leftover Box Return Summary Alert */}
            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center flex-shrink-0 font-bold">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">Leftover Empty Boxes Return Queue</p>
                  <p className="text-xs text-slate-600 font-medium">
                    Picked up: <strong>{totalBoxesPickedUp}</strong> • Loaded: <strong>{loadedBoxesCount}</strong> • Leftover: <strong className="text-slate-900 font-black">{leftoverEmptyBoxes} Boxes</strong>
                  </p>
                  {loadedBoxesCount > totalBoxesPickedUp && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Warning: Loaded boxes ({loadedBoxesCount}) exceeds empty boxes picked up ({totalBoxesPickedUp}). Please update Step 1 pickup or adjust bill hand counts.
                    </p>
                  )}
                </div>
              </div>
              <Badge className="bg-amber-600 text-white font-bold text-xs px-2.5 py-1">
                Pending Return
              </Badge>
            </div>

            {/* Kiran Doke Fruit Procurement Bill Dispatch Trigger */}
            <Card className="border-emerald-200 bg-emerald-50/70 shadow-card rounded-2xl overflow-hidden p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    Field Packing Completed &amp; Vehicle Ready
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Fill &amp; edit the official Kiran Doke Fruit Procurement Bill to dispatch vehicle to {destinationColdStorage}.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setShowBillModal(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-emerald-600/30 gap-2 text-base"
              >
                <Edit3 className="w-5 h-5" />
                Open &amp; Edit Kiran Doke Procurement Bill Form
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* Force Complete Modal */}
      {showForceCompleteModal && (
        <Dialog open onOpenChange={() => setShowForceCompleteModal(false)}>
          <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-800 text-lg font-bold">
                <AlertOctagon className="w-5 h-5 text-amber-600" />
                Force Complete Harvest (Close Shortfall)
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 text-xs font-medium text-slate-700">
              <p className="text-slate-600">
                Close harvest even if banana supply was insufficient to fill all required boxes. This updates Office Admin with the exact box shortfall gap.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p><strong>Target Required:</strong> {targetRequiredTotal} Boxes</p>
                <p><strong>Currently Filled:</strong> {currentFilledBoxes} Boxes</p>
                <p className="text-rose-700 font-bold">Shortfall Gap: {gapBoxes} Boxes Shortfall</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Reason for Shortfall / Orchard Closure</Label>
                <Textarea
                  value={shortfallReason}
                  onChange={(e) => setShortfallReason(e.target.value)}
                  placeholder="Explain reason (e.g. Higher field wastage, orchard yield completed early)..."
                  rows={3}
                  className="bg-white border-slate-300 text-slate-900 rounded-xl font-medium resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForceCompleteModal(false)} className="rounded-xl font-semibold">
                Cancel
              </Button>
              <Button onClick={handleConfirmForceComplete} className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl gap-1.5">
                <Check className="w-4 h-4" /> Confirm Force Complete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* WhatsApp Work Started Share Modal */}
      {showWhatsAppModal && (() => {
        const workStartedMsg = `*WORK STARTED NOTIFICATION*\nFarm: ${farmerName}\nLocation: ${location}\nSupervisor: ${supervisorName}\nQuality Grade: ${qualityCheck}\nTime: ${new Date().toLocaleTimeString()}\nVehicle: ${vehicleNo}`;
        const workStartedUrl = `https://wa.me/?text=${encodeURIComponent(workStartedMsg)}`;
        return (
          <Dialog open onOpenChange={() => setShowWhatsAppModal(false)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-700 text-lg font-bold">
                  <Share2 className="w-5 h-5" />
                  Share Work Started Update on WhatsApp
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 text-xs font-medium text-slate-700">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] whitespace-pre-wrap">
                  {workStartedMsg}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowWhatsAppModal(false)} className="rounded-xl font-semibold">
                  Close
                </Button>
                <a href={workStartedUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5">
                    <Share2 className="w-4 h-4" /> Share to WhatsApp Group
                  </Button>
                </a>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* FULLY EDITABLE OFFICIAL KIRAN DOKE FRUIT PROCUREMENT BILL MODAL */}
      {showBillModal && (
        <Dialog open onOpenChange={() => setShowBillModal(false)}>
          <DialogContent className="sm:max-w-2xl bg-white border-slate-200 shadow-2xl rounded-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto scrollbar-thin">
            <DialogHeader className="border-b border-slate-100 pb-3 font-mono">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                  Editable Bill Form
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingBill(!isEditingBill)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditingBill ? "View Clean Mode" : "Edit Fields Mode"}
                </Button>
              </div>
              <DialogTitle className="text-center font-black text-xl text-slate-900 tracking-wider uppercase font-heading mt-1">
                KIRAN DOKE FRUIT
              </DialogTitle>
              <p className="text-[11px] text-center text-slate-500 font-medium">
                GAT NO 455/3B, BITTERGAON ROAD, AT POST KANDAR, SOLAPUR, MAHARASHTRA, 413202
              </p>
              <p className="text-[11px] text-center font-bold text-slate-700">
                Ph: +919823435133, +919112385133
              </p>
              <div className="text-center pt-1">
                <Badge variant="outline" className="bg-slate-100 text-slate-900 border-slate-300 text-xs font-black uppercase tracking-widest">
                  PROCUREMENT BILL
                </Badge>
              </div>
            </DialogHeader>

            {isEditingBill ? (
              /* Editable Form Mode */
              <div className="space-y-4 py-3 text-xs font-sans text-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Bill Date</Label>
                    <Input
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="bg-white border-slate-200 h-9 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Vehicle No</Label>
                    <Input
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                      className="bg-white border-slate-200 h-9 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Location / Village</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="bg-white border-slate-200 h-9 rounded-lg font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Farmer Name</Label>
                    <Input
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      className="bg-white border-slate-200 h-9 rounded-lg font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Farmer Contact</Label>
                    <Input
                      value={farmerContact}
                      onChange={(e) => setFarmerContact(e.target.value)}
                      className="bg-white border-slate-200 h-9 rounded-lg font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Line Name (Labour)</Label>
                    <Input
                      value={lineName}
                      onChange={(e) => setLineName(e.target.value)}
                      className="bg-white border-slate-200 h-9 rounded-lg font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Supervisor Name</Label>
                    <Input
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      className="bg-white border-slate-200 h-9 rounded-lg font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Vendor Name</Label>
                    <Input
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="bg-white border-slate-200 h-9 rounded-lg font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Deal Person Name</Label>
                    <Input
                      value={dealPersonName}
                      onChange={(e) => setDealPersonName(e.target.value)}
                      placeholder="e.g. Sunil Doke"
                      className="bg-white border-slate-200 h-9 rounded-lg font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Locked Rate (₹/Ton)</Label>
                    <Input
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className="bg-white border-slate-200 h-9 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Chemicals */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                    Chemical Dosages (ml / kg)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-slate-500 font-bold">Tilt</Label>
                      <Input
                        value={tiltPickup}
                        onChange={(e) => setTiltPickup(e.target.value)}
                        className="bg-white h-8 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 font-bold">C chemical</Label>
                      <Input
                        value={cChemPickup}
                        onChange={(e) => setCChemPickup(e.target.value)}
                        className="bg-white h-8 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 font-bold">Bavistin</Label>
                      <Input
                        value={bavistinPickup}
                        onChange={(e) => setBavistinPickup(e.target.value)}
                        className="bg-white h-8 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Hand Breakdown (4H - 8H) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                    Hand Particular Breakdown (4H to 8H Counts)
                  </span>
                  <div className="grid grid-cols-5 gap-2">
                    <div>
                      <Label className="text-[10px] font-bold text-slate-600">4H</Label>
                      <Input
                        value={box4H}
                        onChange={(e) => setBox4H(e.target.value)}
                        className="bg-white h-8 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-600">5H</Label>
                      <Input
                        value={box5H}
                        onChange={(e) => setBox5H(e.target.value)}
                        className="bg-white h-8 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-600">6H</Label>
                      <Input
                        value={box6H}
                        onChange={(e) => setBox6H(e.target.value)}
                        className="bg-white h-8 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-600">7H</Label>
                      <Input
                        value={box7H}
                        onChange={(e) => setBox7H(e.target.value)}
                        className="bg-white h-8 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-600">8H</Label>
                      <Input
                        value={box8H}
                        onChange={(e) => setBox8H(e.target.value)}
                        className="bg-white h-8 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Total Box Count</Label>
                    <Input
                      value={totalBoxOverride}
                      onChange={(e) => setTotalBoxOverride(e.target.value)}
                      className="bg-white border-slate-300 h-9 rounded-lg font-black text-sm text-emerald-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Wastage (kg)</Label>
                    <Input
                      value={wastage}
                      onChange={(e) => setWastage(e.target.value)}
                      className="bg-white border-slate-200 h-9 rounded-lg font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Destination Storage</Label>
                    <Input
                      value={destinationColdStorage}
                      onChange={(e) => setDestinationColdStorage(e.target.value)}
                      className="bg-white border-slate-200 h-9 rounded-lg font-bold text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Clean View / Print Mode */
              <div className="space-y-3 py-2 text-xs font-mono text-slate-800 leading-relaxed">
                <div className="border-b border-dashed border-slate-300 pb-2">
                  <p><strong>Date:</strong> {billDate}</p>
                  <p><strong>Vehicle No:</strong> {vehicleNo}</p>
                  <p><strong>Location:</strong> {location}</p>
                </div>

                <div className="border-b border-dashed border-slate-300 pb-2">
                  <p><strong>Farmer Name:</strong> {farmerName}</p>
                  <p><strong>Farmer Contact:</strong> {farmerContact}</p>
                </div>

                <div className="border-b border-dashed border-slate-300 pb-2">
                  <p><strong>Line Name:</strong> {lineName}</p>
                  <p><strong>Supervisor Name:</strong> {supervisorName}</p>
                  <p><strong>Vendor Name:</strong> {vendorName}</p>
                  <p><strong>Deal Person Name:</strong> {dealPersonName || "-"}</p>
                </div>

                <div className="border-b border-dashed border-slate-300 pb-2 space-y-0.5">
                  <p className="font-bold underline">Chemical Used (ml / kg):</p>
                  <p>Tilt: {tiltPickup}</p>
                  <p>C chemical: {cChemPickup}</p>
                  <p>Bavistin: {bavistinPickup}</p>
                </div>

                <div className="border-b border-dashed border-slate-300 pb-2 space-y-0.5">
                  <p className="font-bold underline">Particulars (box brand):</p>
                  <p>{orchardParticulars}</p>
                  <p className="pt-1 font-bold">Total box: {loadedBoxesCount}</p>
                  <p className="text-[11px] text-slate-600">
                    Hand Breakdown: 4H:{box4H}, 5H:{box5H}, 6H:{box6H}, 7H:{box7H}, 8H:{box8H}
                  </p>
                </div>

                <div className="border-b border-dashed border-slate-300 pb-2 space-y-0.5">
                  <p><strong>Total Box:</strong> {loadedBoxesCount}</p>
                  <p><strong>Rate:</strong> ₹{rate}/T</p>
                  <p><strong>Wastage:</strong> {wastage}</p>
                </div>

                <div className="pt-1 font-bold text-emerald-800">
                  Destination: {destinationColdStorage}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setIsEditingBill(!isEditingBill)}
                className="rounded-xl font-bold h-11 border-slate-300"
              >
                {isEditingBill ? "Switch to Preview" : "Edit Fields"}
              </Button>
              <Button onClick={handleFinalDispatch} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-md gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Confirm Bill &amp; Dispatch Truck
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* WhatsApp Dispatch Popup Notification to Cold Storage */}
      {showColdStorageWhatsAppModal && (
        <Dialog open onOpenChange={() => setShowColdStorageWhatsAppModal(false)}>
          <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700 text-lg font-bold">
                <Share2 className="w-5 h-5" />
                Send Dispatch Alert to Cold Storage on WhatsApp
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs font-medium text-slate-700">
              <p className="text-slate-600">
                Vehicle is dispatched. Send this dispatch notification to the <strong>Cold Storage Admin</strong> and group:
              </p>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] whitespace-pre-wrap">
                {coldStorageWhatsAppMsg}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowColdStorageWhatsAppModal(false);
                  router.push("/admin/cold-storage");
                }}
                className="rounded-xl font-semibold"
              >
                Go to Cold Storage
              </Button>
              <a href={coldStorageWhatsAppUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5">
                  <Share2 className="w-4 h-4" /> Share Alert to Cold Storage
                </Button>
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
