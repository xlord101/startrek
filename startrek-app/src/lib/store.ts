"use client";

import { useSyncExternalStore } from "react";
import {
  ProcurementTask,
  HarvestTask,
  InventoryReturnRequest,
  ColdStorageReceipt,
  Farmer,
  User,
  BoxType,
  QualityType,
  ChemicalOption,
  ProcurementBillData,
  ColdRoomAllocation,
} from "@/types";

/* ─── Initial Data Setup ─────────────────────────────────────── */

export interface InventoryStockItem {
  boxType: BoxType | string;
  totalStock?: number;
  availableStock: number;
  issuedStock: number;
  damagedStock?: number;
}

export interface ConsumableInventoryStockItem {
  id?: string;
  itemType: string;
  availableStock: number;
  issuedStock: number;
  unit: string;
}

const initialStockItems: InventoryStockItem[] = [
  { boxType: "5KG", totalStock: 150, availableStock: 150, issuedStock: 0, damagedStock: 0 },
  { boxType: "7KG", totalStock: 200, availableStock: 200, issuedStock: 0, damagedStock: 0 },
  { boxType: "13KG", totalStock: 180, availableStock: 180, issuedStock: 0, damagedStock: 0 },
  { boxType: "13_5KG", totalStock: 200, availableStock: 200, issuedStock: 0, damagedStock: 0 },
  { boxType: "16KG", totalStock: 120, availableStock: 120, issuedStock: 0, damagedStock: 0 },
];

const initialConsumableItems: ConsumableInventoryStockItem[] = [
  { itemType: "ETHYLENE_WASH", availableStock: 25, issuedStock: 0, unit: "Liters" },
  { itemType: "FUNGICIDE_DIP", availableStock: 15, issuedStock: 0, unit: "Liters" },
  { itemType: "BAVISTIN", availableStock: 10, issuedStock: 0, unit: "Kg" },
  { itemType: "TILT", availableStock: 8, issuedStock: 0, unit: "Liters" },
  { itemType: "FOAM_PADS", availableStock: 300, issuedStock: 0, unit: "Units" },
  { itemType: "ETHYLENE_SACHETS", availableStock: 200, issuedStock: 0, unit: "Pouches" },
  { itemType: "GERMINATION_PAPER", availableStock: 250, issuedStock: 0, unit: "Sheets" },
  { itemType: "CORNER_GUARDS", availableStock: 150, issuedStock: 0, unit: "Pieces" },
];

const initialReturnRequests: InventoryReturnRequest[] = [];

const initialColdStorageReceipts: ColdStorageReceipt[] = [];

/* ─── State Store Interface ──────────────────────────────────── */

interface StateStore {
  farmers: Farmer[];
  procurementTasks: ProcurementTask[];
  harvestTasks: HarvestTask[];
  inventoryStock: InventoryStockItem[];
  consumableInventoryStock: ConsumableInventoryStockItem[];
  inventoryReturns: InventoryReturnRequest[];
  pendingMaterialRequests: HarvestTask[];
  dispatchedMaterialLogs: HarvestTask[];
  coldStorageReceipts: ColdStorageReceipt[];
  coldRoomAllocations: ColdRoomAllocation[];
}

const initialServerState: StateStore = {
  farmers: [],
  procurementTasks: [],
  harvestTasks: [],
  inventoryStock: [],
  consumableInventoryStock: [],
  inventoryReturns: [],
  pendingMaterialRequests: [],
  dispatchedMaterialLogs: [],
  coldStorageReceipts: [],
  coldRoomAllocations: [],
};

let storeState: StateStore = {
  ...initialServerState,
};

// Hydration from API will handle populating the store State

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((l) => l());
}

/* ─── Reactive Store API & Mutations ─────────────────────────── */

export const store = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot() {
    return storeState;
  },

  getServerSnapshot() {
    return initialServerState;
  },

  // Hydrate store from API database
  setFarmers(farmers: Farmer[]) {
    storeState = {
      ...storeState,
      farmers,
    };
    emitChange();
  },

  setProcurementTasks(tasks: ProcurementTask[]) {
    storeState = {
      ...storeState,
      procurementTasks: tasks,
    };
    emitChange();
  },

  setHarvestTasks(tasks: HarvestTask[]) {
    storeState = {
      ...storeState,
      harvestTasks: tasks,
    };
    emitChange();
  },

  setColdStorageReceipts(receipts: ColdStorageReceipt[]) {
    storeState = {
      ...storeState,
      coldStorageReceipts: receipts,
    };
    emitChange();
  },

  setInventoryStock(items: InventoryStockItem[]) {
    storeState = {
      ...storeState,
      inventoryStock: items,
    };
    emitChange();
  },

  setConsumableInventoryStock(items: ConsumableInventoryStockItem[]) {
    storeState = {
      ...storeState,
      consumableInventoryStock: items,
    };
    emitChange();
  },

  addInventoryStock(boxType: BoxType | string, quantity: number) {
    const existing = storeState.inventoryStock.find(s => s.boxType === boxType);
    let newStock;
    if (existing) {
      newStock = storeState.inventoryStock.map(s => 
        s.boxType === boxType ? { ...s, availableStock: s.availableStock + quantity } : s
      );
    } else {
      newStock = [...storeState.inventoryStock, { boxType, availableStock: quantity, issuedStock: 0 }];
    }
    storeState = { ...storeState, inventoryStock: newStock };
    emitChange();
  },

  addConsumableInventoryStock(itemType: string, quantity: number, unit: string = "units") {
    const existing = storeState.consumableInventoryStock.find(s => s.itemType === itemType);
    let newStock;
    if (existing) {
      newStock = storeState.consumableInventoryStock.map(s => 
        s.itemType === itemType ? { ...s, availableStock: s.availableStock + quantity } : s
      );
    } else {
      newStock = [...storeState.consumableInventoryStock, { itemType, availableStock: quantity, issuedStock: 0, unit }];
    }
    storeState = { ...storeState, consumableInventoryStock: newStock };
    emitChange();
  },

  setInventoryReturns(returns: InventoryReturnRequest[]) {
    storeState = {
      ...storeState,
      inventoryReturns: returns,
    };
    emitChange();
  },

  setPendingMaterialRequests(requests: HarvestTask[]) {
    storeState = {
      ...storeState,
      pendingMaterialRequests: requests,
    };
    emitChange();
  },

  setDispatchedMaterialLogs(logs: HarvestTask[]) {
    storeState = {
      ...storeState,
      dispatchedMaterialLogs: logs,
    };
    emitChange();
  },

  dispatchMaterials(taskId: string, dispatchedCounts: Record<string, number>, dispatchedConsumables: Record<string, number> = {}) {
    // Optimistically update stock
    const updatedStock = storeState.inventoryStock.map((st) => {
      const qty = dispatchedCounts[st.boxType] || 0;
      if (qty > 0) {
        return {
          ...st,
          availableStock: Math.max(0, st.availableStock - qty),
          issuedStock: st.issuedStock + qty,
        };
      }
      return st;
    });

    const updatedConsumables = storeState.consumableInventoryStock.map((st) => {
      const qty = dispatchedConsumables[st.itemType] || 0;
      if (qty > 0) {
        return {
          ...st,
          availableStock: Math.max(0, st.availableStock - qty),
          issuedStock: st.issuedStock + qty,
        };
      }
      return st;
    });

    storeState = {
      ...storeState,
      inventoryStock: updatedStock,
      consumableInventoryStock: updatedConsumables,
      pendingMaterialRequests: storeState.pendingMaterialRequests.filter(r => r.id !== taskId),
      harvestTasks: storeState.harvestTasks.map((h) => 
        h.id === taskId ? { ...h, materialsIssued: true, requiredBoxCounts: dispatchedCounts } : h
      )
    };
    emitChange();
  },

  // 1. Create Inbound Procurement Intake
  createIntake(data: {
    farmerName: string;
    mobileNumber: string;
    address: string;
    approxTonnage: number;
  }) {
    const farmerId = `f_${Date.now()}`;
    const newFarmer: Farmer = {
      id: farmerId,
      name: data.farmerName,
      mobileNumber: data.mobileNumber,
      address: data.address,
      createdAt: new Date(),
    };

    const taskId = `t_${Date.now()}`;
    const newTask: ProcurementTask = {
      id: taskId,
      farmerId: newFarmer.id,
      farmer: newFarmer,
      approxTonnage: data.approxTonnage,
      status: "PENDING_ASSIGNMENT",
      createdAt: new Date(),
    };

    storeState = {
      ...storeState,
      farmers: [newFarmer, ...storeState.farmers],
      procurementTasks: [newTask, ...storeState.procurementTasks],
    };
    emitChange();
    return newTask;
  },

  // 2. Assign Supervisor (or Office Admin) to Procurement Task
  assignSupervisor(taskId: string, supervisorId: string, supervisorName?: string) {
    storeState = {
      ...storeState,
      procurementTasks: storeState.procurementTasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              supervisorId,
              supervisor: { 
                id: supervisorId, 
                name: supervisorName || "Supervisor", 
                email: "", 
                role: "PROCUREMENT_SUPERVISOR",
                isActive: true,
                createdAt: new Date()
              } as any,
              assignedAt: new Date(),
              status: "ASSIGNED",
            }
          : t
      ),
    };
    emitChange();
  },

  // 3. Submit Field Inspection Report
  submitFieldInspection(
    taskId: string,
    actualTonnage: number,
    ratioPercentage: number,
    quality: QualityType,
    boxTypes: BoxType[],
    rejectionReason?: string,
    supervisorRatePerKg?: number
  ) {
    storeState = {
      ...storeState,
      procurementTasks: storeState.procurementTasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              actualTonnage,
              ratioPercentage,
              quality,
              rejectionReason,
              supervisorRatePerKg: supervisorRatePerKg || t.supervisorRatePerKg || 22.5,
              particulars: boxTypes.map((bt, i) => ({
                id: `p_${i}`,
                taskId,
                boxType: bt,
              })),
              supervisorSubmittedAt: new Date(),
              status: "FIELD_SUBMITTED",
            }
          : t
      ),
    };
    emitChange();
  },

  // 4. Final Approval & Rate Lock (Office Admin)
  approveProcurement(taskId: string, finalRate: number) {
    const targetTask = storeState.procurementTasks.find((t) => t.id === taskId);

    storeState = {
      ...storeState,
      procurementTasks: storeState.procurementTasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              finalRate,
              approvedAt: new Date(),
              status: "APPROVED_PROCUREMENT",
            }
          : t
      ),
    };

    if (targetTask && !storeState.harvestTasks.some((h) => h.procurementTaskId === taskId)) {
      const newHarvestTask: HarvestTask = {
        id: `ht_${Date.now()}`,
        procurementTaskId: taskId,
        farmerName: targetTask.farmer.name,
        mobileNumber: targetTask.farmer.mobileNumber,
        address: targetTask.farmer.address,
        tonnage: targetTask.actualTonnage || targetTask.approxTonnage,
        quality: targetTask.quality || "GOOD",
        finalRate: finalRate,
        status: "READY_FOR_HARVEST",
        supervisorId: targetTask.supervisorId,
        supervisorName: targetTask.supervisor?.name,
        createdAt: new Date(),
      };

      storeState = {
        ...storeState,
        harvestTasks: [newHarvestTask, ...storeState.harvestTasks],
      };
    }

    emitChange();
  },

  // 5. Schedule Harvest & Logistics Allocation
  scheduleHarvest(data: {
    harvestTaskId: string;
    supervisorId: string;
    supervisorName: string;
    isHighPriority: boolean;
    selectedBoxTypes: BoxType[];
    requiredBoxCounts: Partial<Record<BoxType, number>>;
    brandName: string;
    vehicleSupplierId: string;
    vehicleSupplier: any;
    labourTeam: string;
    hasChemicalTreatment?: boolean;
    chemicals: ChemicalOption[];
    hasEthylenePaper?: boolean;
    ethylenePacksCount?: number;
    pingIntervalHours: number;
  }) {
    const totalRequired = Object.values(data.requiredBoxCounts).reduce(
      (a, b) => (a || 0) + (b || 0),
      0
    );

    const targetHarvest = storeState.harvestTasks.find((h) => h.id === data.harvestTaskId);
    const yieldKg = Number(targetHarvest?.tonnage || 10) * 1000;
    const germinationPaperPcs = Math.round(yieldKg / 40); // 40 pcs per Kg formula
    const topBundlesCount = Math.ceil(totalRequired / 25); // Top bundle = 25 pcs
    const bottomBundlesCount = Math.ceil(totalRequired / 20); // Bottom bundle = 20 pcs

    storeState = {
      ...storeState,
      harvestTasks: storeState.harvestTasks.map((h) =>
        h.id === data.harvestTaskId
          ? {
              ...h,
              status: "HARVEST_ASSIGNED",
              supervisorId: data.supervisorId,
              supervisorName: data.supervisorName,
              isHighPriority: data.isHighPriority,
              selectedBoxTypes: data.selectedBoxTypes,
              requiredBoxCounts: data.requiredBoxCounts,
              targetRequiredBoxes: totalRequired,
              brandName: data.brandName,
              vehicleSupplierId: data.vehicleSupplierId,
              vehicleSupplier: data.vehicleSupplier,
              labourTeam: data.labourTeam,
              hasChemicalTreatment: data.hasChemicalTreatment ?? true,
              chemicals: data.hasChemicalTreatment ? data.chemicals : [],
              hasEthylenePaper: data.hasEthylenePaper ?? false,
              ethylenePacksCount: data.hasEthylenePaper ? data.ethylenePacksCount || 2 : 0,
              germinationPaperPcs,
              topBundlesCount,
              bottomBundlesCount,
              pingIntervalHours: data.pingIntervalHours,
              assignedAt: new Date(),
            }
          : h
      ),
    };
    emitChange();
  },

  // 6. Confirm Inventory Pickup (Deducts stock!)
  confirmHarvestPickup(
    harvestTaskId: string,
    actualBoxPickups: Partial<Record<BoxType, number>>
  ) {
    // Deduct stock per box type
    const updatedStock = storeState.inventoryStock.map((st) => {
      const picked = (actualBoxPickups as any)[st.boxType] || 0;
      return {
        ...st,
        availableStock: Math.max(0, st.availableStock - picked),
        issuedStock: st.issuedStock + picked,
      };
    });

    storeState = {
      ...storeState,
      inventoryStock: updatedStock,
      harvestTasks: storeState.harvestTasks.map((h) =>
        h.id === harvestTaskId
          ? {
              ...h,
              status: "PICKUP_COMPLETED",
              actualBoxPickups,
              pickupSubmittedAt: new Date(),
            }
          : h
      ),
    };
    emitChange();
  },

  // 7. Register Work Started & Quality
  registerWorkStarted(harvestTaskId: string, qualityCheck: QualityType) {
    storeState = {
      ...storeState,
      harvestTasks: storeState.harvestTasks.map((h) =>
        h.id === harvestTaskId
          ? {
              ...h,
              status: "WORK_STARTED",
              qualityCheck,
              workStartedAt: new Date(),
            }
          : h
      ),
    };
    emitChange();
  },

  // 8. 2-Hour Progress Update Ping
  updateHarvestProgress(harvestTaskId: string, currentFilledBoxes: number) {
    storeState = {
      ...storeState,
      harvestTasks: storeState.harvestTasks.map((h) => {
        if (h.id !== harvestTaskId) return h;
        const target = h.targetRequiredBoxes || 700;
        const gap = Math.max(0, target - currentFilledBoxes);
        return {
          ...h,
          status: "HARVEST_IN_PROGRESS",
          currentFilledBoxes,
          gapBoxes: gap,
        };
      }),
    };
    emitChange();
  },

  // 8b. Force Complete / Close Harvest with Shortfall & Gap Alert to Admin
  forceCompleteHarvest(
    harvestTaskId: string,
    filledBoxes: number,
    shortfallReason: string
  ) {
    const target = storeState.harvestTasks.find((h) => h.id === harvestTaskId);
    const targetRequired = target
      ? Object.values(target.requiredBoxCounts || {}).reduce((a, b) => a + (b || 0), 0)
      : 700;
    const gap = Math.max(0, targetRequired - filledBoxes);

    storeState = {
      ...storeState,
      harvestTasks: storeState.harvestTasks.map((h) =>
        h.id === harvestTaskId
          ? {
              ...h,
              currentFilledBoxes: filledBoxes,
              gapBoxes: gap,
              shortfallReason,
              isForceCompleted: true,
              status: "HARVEST_COMPLETED",
              completedAt: new Date(),
            }
          : h
      ),
    };
    emitChange();
  },

  // 9. Dispatch Kiran Doke Bill -> Pushes to Cold Storage & Queues Inventory Return!
  dispatchHarvestBill(
    harvestTaskId: string,
    billData: ProcurementBillData,
    totalBoxesPickedUp: number,
    loadedBoxesCount: number
  ) {
    const targetHarvestTask = storeState.harvestTasks.find((h) => h.id === harvestTaskId);

    // Create Cold Storage Receipt for Module 3
    const csId = `cs_${Date.now()}`;
    const newReceipt: ColdStorageReceipt = {
      id: csId,
      harvestTaskId,
      farmerName: billData.farmerName,
      vehicleNo: billData.vehicleNo,
      driverName: targetHarvestTask?.vehicleSupplier?.driverName || "",
      driverPhone: targetHarvestTask?.vehicleSupplier?.driverPhone || "",
      billData,
      dispatchedTotalBoxes: loadedBoxesCount,
      status: "DISPATCHED",
    };

    // Queue Leftover Box Return Request for Inventory Admin
    const leftoverBoxes = Math.max(0, totalBoxesPickedUp - loadedBoxesCount);
    let updatedReturns = storeState.inventoryReturns;
    if (leftoverBoxes > 0) {
      const retId = `ret_${Date.now()}`;
      const mainBoxType: BoxType = targetHarvestTask?.selectedBoxTypes?.[0] || "7KG";
      const newReturnRequest: InventoryReturnRequest = {
        id: retId,
        taskId: harvestTaskId,
        farmerName: billData.farmerName,
        supervisorName: billData.supervisorName,
        boxType: mainBoxType,
        pickedUpBoxes: totalBoxesPickedUp,
        loadedBoxes: loadedBoxesCount,
        expectedReturnBoxes: leftoverBoxes,
        status: "PENDING_VERIFICATION",
        submittedAt: new Date(),
      };
      updatedReturns = [newReturnRequest, ...updatedReturns];
    }

    storeState = {
      ...storeState,
      harvestTasks: storeState.harvestTasks.map((h) =>
        h.id === harvestTaskId
          ? {
              ...h,
              status: "DISPATCHED_TO_COLD_STORAGE",
              billData,
              truckNumber: billData.vehicleNo,
              harvestedBoxes: loadedBoxesCount,
              dispatchedAt: new Date(),
            }
          : h
      ),
      coldStorageReceipts: [newReceipt, ...storeState.coldStorageReceipts],
      inventoryReturns: updatedReturns,
    };
    emitChange();
  },

  // 10. Verify Inventory Return & Restock Stock
  verifyInventoryReturn(requestId: string, actualReturnedBoxes: number) {
    const req = storeState.inventoryReturns.find((r) => r.id === requestId);
    if (!req) return;

    const wastage = Math.max(0, req.expectedReturnBoxes - actualReturnedBoxes);

    // Credit good boxes back to inventory stock
    const updatedStock = storeState.inventoryStock.map((st) => {
      if (st.boxType !== req.boxType) return st;
      return {
        ...st,
        totalStock: (st.totalStock || 0) + actualReturnedBoxes,
        availableStock: (st.availableStock || 0) + actualReturnedBoxes,
        damagedStock: (st.damagedStock || 0) + wastage,
      };
    });

    storeState = {
      ...storeState,
      inventoryStock: updatedStock,
      inventoryReturns: storeState.inventoryReturns.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "VERIFIED_RESTOCKED",
              actualReturnedBoxes,
              wastageBoxes: wastage,
              verifiedAt: new Date(),
            }
          : r
      ),
    };
    emitChange();
  },

  // 11. Verify Cold Storage Unloading
  verifyColdStorageReceipt(receiptId: string, verifiedBoxCount: number) {
    storeState = {
      ...storeState,
      coldStorageReceipts: storeState.coldStorageReceipts.map((c) =>
        c.id === receiptId
          ? {
              ...c,
              status: "VERIFIED_RECEIVED",
              verifiedBoxCount,
              receivedAt: new Date(),
            }
          : c
      ),
    };
    emitChange();
  },

  // 12. Save Multi-Brand Room Allocation
  allocateColdStorageRooms(
    receiptId: string,
    allocations: { roomNumber: string; brandName: string; boxCount: number }[]
  ) {
    storeState = {
      ...storeState,
      coldStorageReceipts: storeState.coldStorageReceipts.map((c) =>
        c.id === receiptId
          ? {
              ...c,
              status: "ALLOCATED_TO_ROOMS",
              allocations: allocations.map((a, i) => ({
                id: `alloc_${i}`,
                roomNumber: a.roomNumber,
                brandName: a.brandName,
                boxCount: a.boxCount,
                allocatedAt: new Date(),
              })),
              allocatedAt: new Date(),
            }
          : c
      ),
    };
    emitChange();
  },

  // 13. Save KD Cold Storage Quality Report
  saveKDColdStorageQualityReport(receiptId: string, qualityReport: any) {
    storeState = {
      ...storeState,
      coldStorageReceipts: storeState.coldStorageReceipts.map((c) =>
        c.id === receiptId
          ? {
              ...c,
              qualityReport,
            }
          : c
      ),
    };
    emitChange();
  },
};

/* ─── Custom React Hook for Pages ────────────────────────────── */

export function useStartrekStore() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
