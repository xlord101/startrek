"use client";

import { useState, useCallback } from "react";
import { store, useStartrekStore } from "@/lib/store";
import { useLiveData } from "@/hooks/useLiveData";
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
  Plus,
} from "lucide-react";
import { InventoryReturnRequest, BOX_TYPE_LABELS, BoxType } from "@/types";
import { toast } from "sonner";

const CONSUMABLE_LABELS: Record<string, string> = {
  "CONSUMABLE_ETHYLENE_POUCH": "Ethylene Pouch (Units)",
  "CONSUMABLE_FUNGICIDE": "Fungicide Dip (Liters)",
  "CONSUMABLE_PAPER": "Packing Paper (Bundles)",
};

export default function InventoryAdminPage() {
  const { inventoryStock, consumableInventoryStock, inventoryReturns, pendingMaterialRequests, dispatchedMaterialLogs } = useStartrekStore();

  const fetchInventory = useCallback(() => {
    fetch("/api/inventory")
      .then((r) => {
        if (r.status === 401) window.location.href = '/login';
        return r.json();
      })
      .then((data) => {
        if (data.items) {
          store.setInventoryStock(data.items);
        }
        if (data.consumableItems) {
          store.setConsumableInventoryStock(data.consumableItems);
        }
        if (data.returns) {
          store.setInventoryReturns(data.returns);
        }
        if (data.pendingRequests) {
          store.setPendingMaterialRequests(data.pendingRequests);
        }
        if (data.dispatchedLogs) {
          store.setDispatchedMaterialLogs(data.dispatchedLogs);
        }
      })
      .catch(() => {});
  }, []);

  // Focus/visibility-aware live refresh instead of blind 5s polling
  useLiveData([fetchInventory]);

  const [verifyTarget, setVerifyTarget] = useState<InventoryReturnRequest | null>(null);
  const [actualReturnedInput, setActualReturnedInput] = useState<number>(50);

  const [dispatchTarget, setDispatchTarget] = useState<any>(null);
  const [dispatchCounts, setDispatchCounts] = useState<Record<string, number>>({});
  const [dispatchConsumables, setDispatchConsumables] = useState<Record<string, number>>({});

  const handleOpenVerify = (req: InventoryReturnRequest) => {
    setVerifyTarget(req);
    setActualReturnedInput(req.expectedReturnBoxes);
  };

  const expected = verifyTarget ? verifyTarget.expectedReturnBoxes : 0;
  const wastageCalculated = expected - actualReturnedInput > 0 ? expected - actualReturnedInput : 0;

  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockCategory, setAddStockCategory] = useState<"BOX" | "CONSUMABLE">("BOX");
  const [addStockType, setAddStockType] = useState<string>("BOX_7KG");
  const [addStockQty, setAddStockQty] = useState<number>(0);

  const openAddBoxStock = (type?: string) => {
    setAddStockCategory("BOX");
    setAddStockType(type || "BOX_7KG");
    setAddStockQty(0);
    setShowAddStockModal(true);
  };

  const openAddConsumableStock = (type?: string) => {
    setAddStockCategory("CONSUMABLE");
    setAddStockType(type || "CONSUMABLE_ETHYLENE_POUCH");
    setAddStockQty(0);
    setShowAddStockModal(true);
  };

  const handleConfirmAddStock = async () => {
    if (addStockQty <= 0) {
      toast.error("Please enter a valid positive quantity");
      return;
    }
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_STOCK",
          boxType: addStockType,
          quantity: addStockQty,
          unit: addStockType === "CONSUMABLE_FUNGICIDE" ? "Liters" : addStockType === "CONSUMABLE_PAPER" ? "Bundles" : "Units",
        }),
      });

      if (!res.ok) throw new Error("API error");

      if (addStockType.startsWith("CONSUMABLE_")) {
        store.addConsumableInventoryStock(addStockType.replace("CONSUMABLE_", ""), addStockQty, addStockType === "CONSUMABLE_FUNGICIDE" ? "Liters" : addStockType === "CONSUMABLE_PAPER" ? "Bundles" : "Units");
      } else {
        store.addInventoryStock(addStockType, addStockQty);
      }
      toast.success("Stock added successfully!", {
        description: `Added ${addStockQty} of ${addStockType.startsWith("CONSUMABLE_") ? CONSUMABLE_LABELS[addStockType] : BOX_TYPE_LABELS[addStockType as BoxType]}.`,
      });
      setShowAddStockModal(false);
      setAddStockQty(0);
    } catch (e) {
      console.error("Failed to add stock", e);
      toast.error("Failed to add stock with server");
    }
  };

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

  const handleConfirmDispatch = async () => {
    if (!dispatchTarget) return;

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISPATCH_MATERIALS",
          taskId: dispatchTarget.id,
          dispatchedCounts: dispatchCounts,
          dispatchedConsumables: dispatchConsumables,
        }),
      });

      if (!res.ok) throw new Error("API error");

      store.dispatchMaterials(dispatchTarget.id, dispatchCounts, dispatchConsumables);
      toast.success("Materials Dispatched Successfully!");
    } catch (e) {
      console.error("Failed to dispatch materials", e);
      toast.error("Failed to dispatch materials with server");
    }

    setDispatchTarget(null);
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
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Empty Corrugated Box Inventory Stock Levels & Bundle Readiness
            </h2>
            <Button 
              size="sm" 
              onClick={() => openAddBoxStock()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs h-8 px-3 gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Box Stock
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {inventoryStock.map((item) => {
              const topBundles = Math.ceil(item.availableStock / 25);
              const bottomBundles = Math.ceil(item.availableStock / 20);
              return (
                <Card key={item.boxType} className="border-slate-200 bg-white shadow-card rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{BOX_TYPE_LABELS[item.boxType as BoxType] || item.boxType}</span>
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
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAddBoxStock(item.boxType as BoxType)}
                    className="w-full text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-xs font-bold h-7 gap-1 rounded-lg mt-1"
                  >
                    <Plus className="w-3 h-3" /> Add {BOX_TYPE_LABELS[item.boxType as BoxType] || item.boxType} Stock
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Consumable Inventory Stock Levels Grid */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Consumable Packing Materials & Chemicals
            </h2>
            <Button 
              size="sm" 
              onClick={() => openAddConsumableStock()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs h-8 px-3 gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Consumable Stock
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {consumableInventoryStock?.map((item) => {
              const label = CONSUMABLE_LABELS[`CONSUMABLE_${item.itemType}`] || item.itemType;
              return (
                <Card key={item.itemType} className="border-slate-200 bg-white shadow-card rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{label}</span>
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 text-[10px] font-bold">
                        {item.unit}
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
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openAddConsumableStock(`CONSUMABLE_${item.itemType}`)}
                    className="w-full text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-xs font-bold h-7 gap-1 rounded-lg mt-1"
                  >
                    <Plus className="w-3 h-3" /> Add {item.itemType.replace("_", " ")} Stock
                  </Button>
                </Card>
              );
            })}
            {(!consumableInventoryStock || consumableInventoryStock.length === 0) && (
              <div className="text-sm text-slate-500 italic p-4">No consumable stock available. Please add stock.</div>
            )}
          </div>
        </div>

        {/* Pending Material Dispatch Requests Table */}
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
              <Package className="w-4.5 h-4.5 text-orange-600" />
              Pending Material Dispatch Requests (Harvest)
            </CardTitle>
            <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs font-bold px-2.5 py-0.5">
              {pendingMaterialRequests?.length || 0} Pending Dispatch
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase pl-6 py-3">Farmer & Supervisor</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Team & Truck</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Materials Requested</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase pr-6 text-right py-3">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingMaterialRequests?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-slate-500 text-sm italic">
                      No pending material requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingMaterialRequests?.map((req: any) => (
                    <TableRow key={req.id} className="border-b border-slate-100">
                      <TableCell className="pl-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{req.farmerName || req.farmer?.name}</p>
                          <p className="text-xs text-slate-500">Sup: {req.supervisorName || req.supervisor?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <p className="text-sm text-slate-800 font-medium">{req.labourTeam || 'N/A'}</p>
                        {req.vehicleSupplierId && <p className="text-xs text-slate-500 truncate max-w-[150px]">Truck: Allocated</p>}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1">
                          {req.requiredBoxCounts && Object.entries(req.requiredBoxCounts).map(([bType, count]: any) => {
                            if (!count) return null;
                            return (
                              <Badge key={bType} variant="outline" className="w-fit bg-slate-50 text-slate-800 text-[10px] font-bold">
                                {BOX_TYPE_LABELS[bType as BoxType]}: {count}
                              </Badge>
                            );
                          })}
                          {req.hasEthylenePaper && (
                            <Badge variant="outline" className="w-fit bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                              Ethylene: {req.ethylenePacksCount} Packs
                            </Badge>
                          )}
                          {req.chemicals?.length > 0 && (
                            <Badge variant="outline" className="w-fit bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-bold">
                              Chemicals Applied
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right py-4">
                        <Button
                          size="sm"
                          onClick={() => {
                            setDispatchTarget(req);
                            setDispatchCounts(req.requiredBoxCounts || {});
                            setDispatchConsumables({
                              "ETHYLENE_POUCH": 0,
                              "FUNGICIDE": 0,
                              "PAPER": 0,
                            });
                          }}
                          className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-xs"
                        >
                          <Package className="w-3.5 h-3.5" /> Dispatch Materials
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Confirmed Material Dispatch Log Table */}
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
              Approved & Confirmed Material Dispatch Log (Issued History)
            </CardTitle>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold px-2.5 py-0.5">
              {dispatchedMaterialLogs?.length || 0} Dispatched Logs
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase pl-6 py-3">Farmer & Supervisor</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Team & Destination</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase py-3">Dispatched Materials & Quantities</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 uppercase pr-6 text-right py-3">Dispatch Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatchedMaterialLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-slate-500 text-sm italic">
                      No dispatched material logs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  dispatchedMaterialLogs?.map((log: any) => (
                    <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <TableCell className="pl-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{log.farmerName || log.farmer?.name}</p>
                          <p className="text-xs text-slate-500">Sup: {log.supervisorName || log.supervisor?.name || 'Assigned'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <p className="text-sm text-slate-800 font-medium">{log.labourTeam || 'Harvest Team'}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[180px]">{log.destinationColdStorage || 'Cold Storage Transit'}</p>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {log.requiredBoxCounts && Object.entries(log.requiredBoxCounts).map(([bType, count]: any) => {
                            if (!count) return null;
                            return (
                              <Badge key={bType} variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                                {BOX_TYPE_LABELS[bType as BoxType] || bType}: {count} Box
                              </Badge>
                            );
                          })}
                          {log.hasEthylenePaper && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                              Ethylene: {log.ethylenePacksCount || 'Standard'} Packs
                            </Badge>
                          )}
                          {log.chemicals?.length > 0 && (
                            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-bold">
                              Chemicals Issued
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right py-4">
                        <Badge className="bg-emerald-600 text-white font-bold text-[11px] px-2.5 py-0.5 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> DISPATCHED
                        </Badge>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                          {new Date(log.updatedAt || log.createdAt).toLocaleDateString()} {new Date(log.updatedAt || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Supervisor Return Requests Table */}
        <Card className="border-slate-200 bg-white shadow-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
              <RotateCcw className="w-4.5 h-4.5 text-indigo-600" />
              Supervisor Empty Box Return Queue (Pending Reconciliation)
            </CardTitle>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold px-2.5 py-0.5">
              {inventoryReturns.filter((r) => r.status === "PENDING_VERIFICATION").length} Pending Verification
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
                          req.status === "PENDING_VERIFICATION"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {req.status === "PENDING_VERIFICATION" ? "PENDING VERIFICATION" : "RESTOCKED"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right py-4">
                      {req.status === "PENDING_VERIFICATION" ? (
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

        {/* Dispatch Modal */}
        {dispatchTarget && (
          <Dialog open onOpenChange={() => setDispatchTarget(null)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-orange-700 text-lg font-bold">
                  <Package className="w-5 h-5" />
                  Issue & Dispatch Materials
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2 text-sm">
                <p className="text-slate-600">Please confirm the dispatch of the following materials for <strong>{dispatchTarget.farmerName || dispatchTarget.farmer?.name}</strong> (Supervisor: {dispatchTarget.supervisorName || dispatchTarget.supervisor?.name}).</p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-sm">
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Adjust Dispatch Quantities</h4>
                  <p className="text-xs text-slate-500 mb-2">Adjust quantities to account for overhead/damage.</p>
                  {dispatchTarget.requiredBoxCounts && Object.entries(dispatchTarget.requiredBoxCounts).map(([bType, count]: any) => {
                    if (!count) return null;
                    return (
                      <div key={bType} className="flex justify-between items-center text-slate-700">
                        <Label className="text-sm font-bold text-slate-700">{BOX_TYPE_LABELS[bType as BoxType]}</Label>
                        <Input
                          type="number"
                          value={dispatchCounts[bType] || 0}
                          onChange={(e) => setDispatchCounts({ ...dispatchCounts, [bType]: parseInt(e.target.value) || 0 })}
                          className="w-24 bg-white border-slate-300 text-slate-900 font-bold h-10 rounded-lg text-sm text-right"
                        />
                      </div>
                    );
                  })}
                  {(!dispatchTarget.requiredBoxCounts || Object.keys(dispatchTarget.requiredBoxCounts).length === 0) && (
                    <span className="text-slate-400 italic">No boxes requested.</span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-sm">
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">Consumables & Materials</h4>
                  {["ETHYLENE_POUCH", "FUNGICIDE", "PAPER"].map((cType) => (
                    <div key={cType} className="flex justify-between items-center text-slate-700">
                      <Label className="text-sm font-bold text-slate-700">{CONSUMABLE_LABELS[`CONSUMABLE_${cType}`]}</Label>
                      <Input
                        type="number"
                        value={dispatchConsumables[cType] || 0}
                        onChange={(e) => setDispatchConsumables({ ...dispatchConsumables, [cType]: parseInt(e.target.value) || 0 })}
                        className="w-24 bg-white border-slate-300 text-slate-900 font-bold h-10 rounded-lg text-sm text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setDispatchTarget(null)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button onClick={handleConfirmDispatch} className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Confirm Dispatch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

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

        {/* Add Stock Modal */}
        {showAddStockModal && (
          <Dialog open onOpenChange={() => setShowAddStockModal(false)}>
            <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl p-6">
              <DialogHeader>
                <DialogTitle className={`flex items-center gap-2 text-lg font-bold ${addStockCategory === "BOX" ? "text-indigo-700" : "text-emerald-700"}`}>
                  <Plus className="w-5 h-5" />
                  {addStockCategory === "BOX" ? "Add Empty Corrugated Box Stock" : "Add Consumable & Chemical Stock"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    {addStockCategory === "BOX" ? "Corrugated Box Type" : "Consumable Item"}
                  </Label>
                  <select
                    value={addStockType}
                    onChange={(e) => setAddStockType(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 font-bold h-12 rounded-xl text-base px-3"
                  >
                    {addStockCategory === "BOX"
                      ? Object.entries(BOX_TYPE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))
                      : Object.entries(CONSUMABLE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))
                    }
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">Quantity to Add</Label>
                  <Input
                    type="number"
                    value={addStockQty}
                    onChange={(e) => setAddStockQty(parseInt(e.target.value) || 0)}
                    className="bg-white border-slate-300 text-slate-900 font-black h-12 rounded-xl text-base"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAddStockModal(false)} className="rounded-xl font-bold">
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmAddStock} 
                  className={`text-white font-bold rounded-xl gap-1.5 ${addStockCategory === "BOX" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Add Stock
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
