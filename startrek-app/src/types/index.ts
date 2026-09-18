export type UserRole =
  | "MAIN_ADMIN"
  | "OFFICE_ADMIN"
  | "FIELD_SUPERVISOR"
  | "PROCUREMENT_SUPERVISOR"
  | "INVENTORY_ADMIN"
  | "COLD_STORAGE_ADMIN";

export type ProcurementStatus =
  | "PENDING_ASSIGNMENT"
  | "ASSIGNED"
  | "FIELD_SUBMITTED"
  | "APPROVED_PROCUREMENT";

export type QualityType = "EXCELLENT" | "GOOD" | "AVERAGE" | "REJECT";

export type BoxType = "5KG" | "7KG" | "13KG" | "13_5KG" | "16KG";

/* ─── Vehicle Supplier ────────────────────────────────────────── */
export interface VehicleSupplier {
  id: string;
  supplierName: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
}

/* ─── Labour Harvesting Team ─────────────────────────────────── */
export interface LabourTeam {
  id: string;
  teamName: string;
  leaderName: string;
  contactNumber: string;
  memberCount: number;
  isActive: boolean;
}

/* ─── Leftover Box Return Request (Inventory Reconciliation) ──── */
export type ReturnRequestStatus = "PENDING_VERIFICATION" | "VERIFIED_RESTOCKED";

export interface InventoryReturnRequest {
  id: string;
  taskId: string;
  farmerName: string;
  supervisorName: string;
  boxType: BoxType;
  pickedUpBoxes: number;
  loadedBoxes: number;
  expectedReturnBoxes: number; // pickedUpBoxes - loadedBoxes
  actualReturnedBoxes?: number;
  wastageBoxes?: number; // expectedReturnBoxes - actualReturnedBoxes
  status: ReturnRequestStatus;
  submittedAt: Date;
  verifiedAt?: Date;
}

/* ─── Cold Storage Receiving & Multi-Brand Room Allocation ──────── */
export type ColdStorageStatus =
  | "DISPATCHED"
  | "VERIFIED_RECEIVED"
  | "ALLOCATED_TO_ROOMS";

export interface ColdRoomAllocation {
  id: string;
  roomNumber: string; // e.g. "Room 1", "Room 2", "Cold Room A"
  brandName: string;  // e.g. "StarPremium Export Grade"
  boxType?: BoxType | `BOX_${BoxType}` | null;
  shippedBoxes?: number;
  boxCount: number;
  box3H?: number;
  box4H?: number;
  box5H?: number;
  box6H?: number;
  box7H?: number;
  box8H?: number;
  allocatedAt: Date;
}

export interface KDColdStorageQualityReport {
  date: string;
  vehicleNo: string;
  lineName: string;
  supervisorName: string;
  vendorName: string;
  outerBoxQuality: "GOOD" | "FAIR" | "POOR";
  packingQuality: "EXPORT" | "DOMESTIC" | "DEFECTIVE";
  numberOfHands: string;
  fingerLengthDiameter: string;
  boxWeightKg: number;
  damageOnHand: "NONE" | "LOW" | "HIGH";
  latexSpots: boolean;
  redRust: boolean; // Derived: true when redRustPercentage > 0
  redRustPercentage?: number; // Typed red-rust percentage (e.g. 1.5 = 1.5%)
  flowerRemoved: boolean;
  overallQuality: "A_GRADE_EXPORT" | "B_GRADE" | "REJECTED";
  box3H: number;
  box4H: number;
  box5H: number;
  box6H: number;
  box7H: number;
  box8H: number;
  totalBox: number;
  damageBox: number;
  boxBrand: string;
}

export interface ColdStorageReceipt {
  id: string;
  harvestTaskId: string;
  farmerName: string;
  brandName?: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  billData: ProcurementBillData;
  dispatchedTotalBoxes: number;
  verifiedBoxCount?: number;
  discrepancyNote?: string;
  allocations?: ColdRoomAllocation[];
  qualityReport?: KDColdStorageQualityReport;
  status: ColdStorageStatus;
  receivedAt?: Date;
  allocatedAt?: Date;
}

/* ─── Harvesting Types (Module 2) ─────────────────────────────── */

export type HarvestTaskStatus =
  | "READY_FOR_HARVEST"
  | "HARVEST_ASSIGNED"
  | "PICKUP_COMPLETED"
  | "WORK_STARTED"
  | "HARVEST_IN_PROGRESS"
  | "HARVEST_COMPLETED"
  | "DISPATCHED_TO_COLD_STORAGE";

export type ChemicalOption =
  | "C_CHEMICAL"
  | "TURTI"
  | "TILT"
  | "BAVISTIN";

export const CHEMICAL_LABELS: Record<ChemicalOption, string> = {
  C_CHEMICAL: "C Chemical",
  TURTI: "Turti",
  TILT: "Tilt",
  BAVISTIN: "Bavistin",
};

// Standard issue quantities (editable at assignment time)
export const CHEMICAL_DEFAULT_QUANTITIES: Record<ChemicalOption, string> = {
  C_CHEMICAL: "50 gm",
  TURTI: "2 kg",
  TILT: "200 ml",
  BAVISTIN: "1 kg",
};

/* ─── Box ↔ Bundle conversion (Module 4) ──────────────────────────────── */
// 2-part boxes: 1 box = top + bottom. Tops & bottoms ship in separate bundles.
// 16KG boxes are one-piece and ship in complete-box bundles.
export const TOP_PER_BUNDLE = 25; // 1 top bundle = 25 tops
export const BOTTOM_PER_BUNDLE = 20; // 1 bottom bundle = 20 bottoms
export const COMPLETE_BOX_PER_BUNDLE = 10; // 1 sixteen-KG bundle = 10 complete boxes
export const ALL_BOX_TYPES: BoxType[] = ["5KG", "7KG", "13KG", "13_5KG", "16KG"];
export const TWO_PART_BOX_TYPES: BoxType[] = ["5KG", "7KG", "13KG", "13_5KG"];
export const COMPLETE_BOX_TYPES: BoxType[] = ["16KG"];

export interface BoxBundlePlan {
  topBundles: number;
  bottomBundles: number;
  completeBundles: number;
  totalBoxes: number;
  totalBundles: number;
}

export function calculateBundlePlan(
  counts: Partial<Record<BoxType, number>>
): BoxBundlePlan {
  let topsNeeded = 0;
  let bottomsNeeded = 0;
  let completeNeeded = 0;

  for (const [boxType, count] of Object.entries(counts)) {
    const n = count || 0;
    if (COMPLETE_BOX_TYPES.includes(boxType as BoxType)) {
      completeNeeded += n;
    } else {
      topsNeeded += n;
      bottomsNeeded += n;
    }
  }

  const topBundles = Math.ceil(topsNeeded / TOP_PER_BUNDLE);
  const bottomBundles = Math.ceil(bottomsNeeded / BOTTOM_PER_BUNDLE);
  const completeBundles = Math.ceil(completeNeeded / COMPLETE_BOX_PER_BUNDLE);

  return {
    topBundles,
    bottomBundles,
    completeBundles,
    totalBoxes: topsNeeded + completeNeeded,
    totalBundles: topBundles + bottomBundles + completeBundles,
  };
}

/* ─── Official Procurement Bill Interface (Kiran Doke Fruit) ──── */
export interface ProcurementBillData {
  // Auto Pre-filled (Editable)
  date: string;
  vehicleNo: string;
  location: string;
  farmerName: string;
  farmerContact: string;
  lineName: string;
  supervisorName: string;
  vendorName: string;
  dealPersonName: string;
  rate: number;

  // On-Site Fillable Fields (Chemicals with unit string e.g. 150 ML, 50 gm, 1 kg)
  tiltDosage: string;
  cChemicalDosage: string;
  bavistinDosage: string;

  // Orchard & Box particulars (e.g. Orchard Banana 7kg)
  orchardParticulars: string;

  box3H: number;
  box4H: number;
  box5H: number;
  box6H: number;
  box7H: number;
  box8H: number;

  totalBoxCount: number;
  wastage: number; // e.g. 470 kg
  destinationColdStorage: string; // e.g. Reva cold storage
}

export interface HarvestTask {
  id: string;
  procurementTaskId: string;
  farmerName: string;
  mobileNumber: string;
  address: string;
  tonnage: number;
  quality: QualityType;
  finalRate: number;
  status: HarvestTaskStatus;

  // Additional pre-fill staff & location fields
  teamName?: string;
  lineName?: string;
  supervisorId?: string;
  supervisorName?: string;
  supervisor?: Partial<User>;
  vendorName?: string;
  dealPersonName?: string;
  destinationColdStorage?: string;
  isHighPriority?: boolean; // High Priority Flag

  // Scheduling & Box Details
  selectedBoxTypes?: BoxType[];
  requiredBoxCounts?: Partial<Record<BoxType, number>>;
  brandName?: string;
  // Multi-brand packing plan: { [brandName]: { [boxType]: count } }
  brandBoxCounts?: Record<string, Partial<Record<BoxType, number>>>;
  // Per-chemical issue quantities: { "C_CHEMICAL": "50 gm", "TURTI": "2 kg", ... }
  chemicalQuantities?: Partial<Record<ChemicalOption, string>>;
  // Fixed consumables: Faviloc 5 packets/vehicle, Rubber 1 packet/vehicle
  favilocPackets?: number;
  rubberPackets?: number;
  vehicleSupplierId?: string;
  vehicleSupplier?: VehicleSupplier;
  labourTeam?: string; // Managed labour squad
  hasChemicalTreatment?: boolean; // Optional chemical toggle
  chemicals?: ChemicalOption[];
  hasEthylenePaper?: boolean;
  ethylenePacksCount?: number; // Auto: 1 pouch per 100 boxes (1 pouch = 100 pcs)
  germinationPaperPcs?: number; // Compulsory formula: Yield Kg / 40 pcs
  topBundlesCount?: number; // Top bundle = 25 pcs
  bottomBundlesCount?: number; // Bottom bundle = 20 pcs
  completeBundlesCount?: number; // 16KG complete-box bundle = 10 pcs
  fieldDamagedBoxes?: number; // Boxes damaged during packing/handling

  // Inventory Pickup Details (Supervisor On-Site Input)
  actualBoxPickups?: Partial<Record<BoxType, number>>;
  actualChemicalPickups?: Partial<Record<ChemicalOption, string>>;
  pickupSubmittedAt?: Date;

  // Quality Check & Work Start
  qualityCheck?: QualityType;
  workStartedAt?: Date;

  // 2-Hour Progress Pings & Gap Tracking
  currentFilledBoxes?: number;
  targetRequiredBoxes?: number;
  gapBoxes?: number;
  shortfallReason?: string;
  isForceCompleted?: boolean;
  pingIntervalHours?: number; // Default 2 hours

  // Logistics & Procurement Bill
  billData?: ProcurementBillData;

  harvestedBoxes?: number;
  truckNumber?: string;
  driverName?: string;
  driverPhone?: string;

  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  dispatchedAt?: Date;
  createdAt: Date;
}

/* ─── Farmer ─────────────────────────────────────────────────── */
export interface Farmer {
  id: string;
  name: string;
  mobileNumber: string;
  address: string;
  createdAt: Date;
}

/* ─── Procurement Task ───────────────────────────────────────── */
export interface ProcurementTask {
  id: string;
  farmerId: string;
  farmer: Farmer;
  approxTonnage: number;
  status: ProcurementStatus;

  supervisorId?: string;
  supervisor?: User;
  assignedAt?: Date;

  lineName?: string;
  vendorName?: string;
  dealPersonName?: string;

  // Field inspection
  actualTonnage?: number;
  ratioPercentage?: number;
  quality?: QualityType;
  rejectionReason?: string;
  altMobileNumber?: string;
  // Field inspection quality metrics (Module 2)
  chilling?: boolean;
  pulpPercentage?: number;
  redRustPercentage?: number;
  skinCosmeticsQuality?: "GOOD" | "EXCELLENT" | "AVERAGE";
  skinCosmeticsPercentage?: number;
  fingerLengthInch?: number;
  caliberNumber?: number;
  rate?: number; // Rate per Kg (e.g. ₹22.5/Kg)
  supervisorRatePerKg?: number; // Proposed by supervisor on first visit
  supervisorSubmittedAt?: Date;
  particulars?: TaskParticular[];

  // Final approval
  finalRate?: number; // Locked Rate per Kg (e.g. ₹23.5/Kg)
  approvedById?: string;
  approvedBy?: User;
  approvedAt?: Date;

  createdAt: Date;
}

/* ─── Task Particular ────────────────────────────────────────── */
export interface TaskParticular {
  id: string;
  taskId: string;
  boxType: BoxType;
}

/* ─── User ───────────────────────────────────────────────────── */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

/* ─── UI Helpers & Label Maps ─────────────────────────────────── */

export const BOX_TYPE_LABELS: Record<BoxType, string> = {
  "5KG": "5 kg",
  "7KG": "7 kg",
  "13KG": "13 kg",
  "13_5KG": "13.5 kg",
  "16KG": "16 kg",
};

export const QUALITY_LABELS: Record<QualityType, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  AVERAGE: "Average",
  REJECT: "Reject",
};

export const STATUS_LABELS: Record<ProcurementStatus, string> = {
  PENDING_ASSIGNMENT: "Pending Assignment",
  ASSIGNED: "Assigned",
  FIELD_SUBMITTED: "Field Submitted",
  APPROVED_PROCUREMENT: "Approved",
};

export const HARVEST_STATUS_LABELS: Record<HarvestTaskStatus, string> = {
  READY_FOR_HARVEST: "Ready for Harvest",
  HARVEST_ASSIGNED: "Harvest Assigned",
  PICKUP_COMPLETED: "Boxes & Chemicals Picked Up",
  WORK_STARTED: "Work Started",
  HARVEST_IN_PROGRESS: "Harvest In Progress",
  HARVEST_COMPLETED: "Harvest Completed",
  DISPATCHED_TO_COLD_STORAGE: "Dispatched to Cold Storage",
};

export const HARVEST_TEAMS = [
  "Harvest Team 1 (North Kanyakumari)",
  "Harvest Team 2 (Agastheeswaram)",
  "Harvest Team 3 (Thovalai)",
  "Harvest Team 4 (Marthandam)",
  "Harvest Team 5 (Colachel)",
  "Harvest Team 6 (Nagercoil)",
  "Harvest Team 7 (Padmanabhapuram)",
  "Harvest Team 8 (Radhapuram)",
  "Harvest Team 9 (Vallioor)",
  "Harvest Team 10 (Express Squad)",
];

export const BRAND_NAMES = [
  "StarPremium Export Grade",
  "GreenGold Fresh",
  "Tropica Royal Select",
  "FreshHarvest Domestic",
];

/* ─── Cold Storage Rooms ─────────────────────────────────────── */

/** Fixed physical capacity of every cold room: 27,000 boxes. */
export const COLD_ROOM_CAPACITY = 27000;

export const COLD_STORAGE_ROOMS = [
  "Cold Room 1 (Export)",
  "Cold Room 2 (Domestic)",
  "Cold Room 3 (Pre-Cooling)",
  "Cold Room 4 (Chiller)",
  "Cold Room A (High Capacity)",
  "Cold Room B (Holding Vault)",
];

/* ─── Container Dispatch (Out-flow / Shipment) ───────────────── */

export type ContainerDispatchStatus =
  | "PENDING_LOADING"
  | "LOADED"
  | "PLUGIN_COOLING"
  | "READY_TO_DISPATCH"
  | "DISPATCHED";

export const CONTAINER_STATUS_LABELS: Record<ContainerDispatchStatus, string> = {
  PENDING_LOADING: "Pending Loading",
  LOADED: "Loading Completed — Awaiting Admin",
  PLUGIN_COOLING: "Plug-In Cooling",
  READY_TO_DISPATCH: "Ready to Dispatch",
  DISPATCHED: "Dispatched",
};

/** One planned line inside a container: a box type + brand + quantity. */
export interface ContainerDispatchItem {
  id?: string;
  dispatchId?: string;
  boxType: BoxType;
  brandName: string;
  quantity: number;
}

export interface ContainerDispatch {
  id: string;
  containerNo: string;
  sealNumber: string;
  vehicleNo: string;
  mobMobile: string;
  status: ContainerDispatchStatus;
  /** Plug-in cooling window, set when the admin chooses "Plug In" after loading. */
  pluginHours?: number | null;
  pluginStartedAt?: string | null;
  pluginReadyAt?: string | null;
  loadedAt?: string | null;
  dispatchedAt?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  items: ContainerDispatchItem[];
}

/** True once the plug-in cooling window has elapsed. */
export function isPluginReady(container: Pick<ContainerDispatch, "status" | "pluginReadyAt">): boolean {
  if (container.status === "READY_TO_DISPATCH") return true;
  if (container.status !== "PLUGIN_COOLING" || !container.pluginReadyAt) return false;
  return new Date(container.pluginReadyAt).getTime() <= Date.now();
}

/** Remaining plug-in time in whole hours (0 when ready). */
export function pluginHoursRemaining(
  container: Pick<ContainerDispatch, "status" | "pluginReadyAt">
): number {
  if (!container.pluginReadyAt || container.status === "READY_TO_DISPATCH") return 0;
  const ms = new Date(container.pluginReadyAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 3_600_000);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  MAIN_ADMIN: "Main Admin",
  OFFICE_ADMIN: "Office Admin",
  FIELD_SUPERVISOR: "Harvesting Supervisor",
  PROCUREMENT_SUPERVISOR: "Procurement Supervisor",
  INVENTORY_ADMIN: "Inventory Admin",
  COLD_STORAGE_ADMIN: "Cold Storage Admin",
};
