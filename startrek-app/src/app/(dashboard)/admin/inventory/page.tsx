"use client";

import { useState, useEffect } from "react";
import { store, useStartrekStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Warehouse,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Package,
  ShieldCheck,
} from "lucide-react";
import { InventoryReturnRequest, BOX_TYPE_LABELS } from "@/types";
import { toast } from "sonner";

export default function InventoryAdminPage() {
  const { inventoryStock, inventoryReturns } = useStartrekStore();

  useEffect(() => {
    const fetchData = () => {
      fetch("/api/inventory")
        .then((r) => {
          if (r.status === 401) window.location.href = '/login';
          return r.json();
        })
        .then((data) => {
          if (data.items) {
            store.setInventoryStock(data.items);
          }
          if (data.returns) {
            store.setInventoryReturns(data.returns);
          }
        })
        .catch(() => {});
    };

    fetchData();

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const [verifyTarget, setVerifyTarget] = useState<InventoryReturnRequest | null>(null);
  const [actualReturnedInput, setActualReturnedInput] = useState<number>(50);

  const handleOpenVerify = (req: InventoryReturnRequest) => {
    setVerifyTarget(req);
    setActualReturnedInput(req.expectedReturnBoxes);
  };

  const expected = verifyTarget ? verifyTarget.expectedReturnBoxes : 0;
  const wastageCalculated = expected - actualReturnedInput > 0 ? expected - actualReturnedInput : 0;

  const handleConfirmRestock = async () => {
    if (!verifyTarget) return;

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_RETURN",
          returnId: verifyTarget.id,
          actualReturnedBoxes: actualReturnedInput,
        }),
      });

      if (!res.ok) throw new Error("API error");

      store.verifyInventoryReturn(verifyTarget.id, actualReturnedInput);

      toast.success("Boxes Verified & Restocked to Inventory!", {
        description: `${actualReturnedInput} good boxes credited back to ${BOX_TYPE_LABELS[verifyTarget.boxType]} stock. ${wastageCalculated} recorded as wastage.`,
      });
    } catch (e) {
      console.error("Failed to sync inventory return to db", e);
      toast.error("Failed to verify return with server");
    }

    setVerifyTarget(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 font-heading">
                Main Inventory & Empty Box Return Verification
              </h1>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                Inventory Admin
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Manage stock levels, verify leftover box returns, and record damage wastage
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Inventory Stock Levels Grid */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Current Box Inventory Stock Levels & Bundle Readiness
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {inventoryStock.map((item) => {
              const topBundles = Math.ceil(item.availableStock / 25);
              const bottomBundles = Math.ceil(item.availableStock / 20);
              return (
                <Card key={item.boxType} className="border-slate-200 bg-white shadow-card rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{BOX_TYPE_LABELS[item.boxType]}</span>
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 text-[10px] font-bold">
                      {item.boxType}
                    </Badge>
                  </div>
                  <div className="flex items-baseline justify-between pt-1 border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">Available Stock</span>
                      <span className="text-2xl font-black text-emerald-700 font-heading">
                        {item.availableStock}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-medium block">Issued</span>
                      <span className="text-sm font-bold text-amber-700">{item.issuedStock}</span>
                    </div>
                  </div>

                  {/* Bundle math breakdown */}
                  <div className="bg-slate-50 p-2 rounded-xl text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Top (25s):</span>
                      <strong className="text-slate-900">{topBundles} bundles</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Bottom (20s):</span>
                      <strong className="text-slate-900">{bottomBundles} bundles</strong>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Pending Supervisor Return Requests Table */}
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
              <RotateCcw className="w-4.5 h-4.5 text-indigo-600" />
              Supervisor Empty Box Return Queue (Pending Reconciliation)
            </CardTitle>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold px-2.5 py-0.5">
              {inventoryReturns.filter((r) => r.status === "PENDING_RETURN").length} Pending Verification
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase pl-6 py-3">Farmer & Supervisor</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Box Type</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Picked Up</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Loaded / Used</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Expected Return</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Status</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase pr-6 text-right py-3">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryReturns.map((req) => (
                  <TableRow key={req.id} className="border-b border-slate-100">
                    <TableCell className="pl-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{req.farmerName}</p>
                        <p className="text-xs text-slate-500">Sup: {req.supervisorName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="bg-white border-slate-200 text-slate-800 text-xs font-bold">
                        {BOX_TYPE_LABELS[req.boxType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 font-bold text-slate-900">{req.pickedUpBoxes}</TableCell>
                    <TableCell className="py-4 font-bold text-emerald-700">{req.loadedBoxes}</TableCell>
                    <TableCell className="py-4 font-bold text-amber-700">{req.expectedReturnBoxes}</TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold px-2.5 py-0.5 border ${
                          req.status === "PENDING_RETURN"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {req.status === "PENDING_RETURN" ? "PENDING VERIFICATION" : "RESTOCKED"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right py-4">
                      {req.status === "PENDING_RETURN" ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenVerify(req)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Verify & Restock
                        </Button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Restocked
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Verification Modal */}
        {verifyTarget && (
          <Dialog open onOpenChange={() => setVerifyTarget(null)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-indigo-700 text-lg font-bold">
                  <ShieldCheck className="w-5 h-5" />
                  Verify Returned Empty Boxes & Reconcile
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <p><strong>Farmer:</strong> {verifyTarget.farmerName}</p>
                  <p><strong>Supervisor:</strong> {verifyTarget.supervisorName}</p>
                  <p><strong>Box Type:</strong> {BOX_TYPE_LABELS[verifyTarget.boxType]}</p>
                  <p><strong>Picked Up:</strong> {verifyTarget.pickedUpBoxes} | <strong>Loaded:</strong> {verifyTarget.loadedBoxes}</p>
                  <p className="text-amber-800 font-bold pt-1">Expected Return Count: {verifyTarget.expectedReturnBoxes} Boxes</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Actual Physically Returned Good Boxes</Label>
                  <Input
                    type="number"
                    value={actualReturnedInput}
                    onChange={(e) => setActualReturnedInput(parseInt(e.target.value) || 0)}
                    className="bg-white border-slate-300 text-slate-900 font-black h-12 rounded-xl text-base"
                  />
                </div>

                {wastageCalculated > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-rose-900 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-rose-600" /> Discrepancy Mismatch Detected
                    </p>
                    <p className="text-rose-800">
                      <strong>{wastageCalculated} missing/damaged boxes</strong> will be recorded directly as <strong>Wastage Stock</strong>.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setVerifyTarget(null)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button onClick={handleConfirmRestock} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Confirm Verification & Restock
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
