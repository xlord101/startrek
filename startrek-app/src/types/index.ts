export type UserRole =
  | "MAIN_ADMIN"
  | "OFFICE_ADMIN"
  | "SUPERVISOR"
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
  boxCount: number;
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
  redRust: boolean;
  flowerRemoved: boolean;
  overallQuality: "A_GRADE_EXPORT" | "B_GRADE" | "REJECTED";
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
  | "ETHYLENE_WASH"
  | "FUNGICIDE_DIP"
  | "ALUM_TREATMENT"
  | "PROTECTIVE_COATING";

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
  vendorName?: string;
  dealPersonName?: string;
  destinationColdStorage?: string;
  isHighPriority?: boolean; // High Priority Flag

  // Scheduling & Box Details
  selectedBoxTypes?: BoxType[];
  requiredBoxCounts?: Partial<Record<BoxType, number>>;
  brandName?: string;
  vehicleSupplierId?: string;
  vehicleSupplier?: VehicleSupplier;
  labourTeam?: string; // Managed labour squad
  hasChemicalTreatment?: boolean; // Optional chemical toggle
  chemicals?: ChemicalOption[];
  hasEthylenePaper?: boolean;
  ethylenePacksCount?: number; // 1 Pack = 50 pcs
  germinationPaperPcs?: number; // Compulsory formula: Yield Kg / 40 pcs
  topBundlesCount?: number; // Top bundle = 25 pcs
  bottomBundlesCount?: number; // Bottom bundle = 20 pcs
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

export const CHEMICAL_LABELS: Record<ChemicalOption, string> = {
  ETHYLENE_WASH: "Ethylene Ripening Wash",
  FUNGICIDE_DIP: "Fungicide Dip Treatment",
  ALUM_TREATMENT: "Alum Latex Removal",
  PROTECTIVE_COATING: "Post-Harvest Wax Coating",
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

export const COLD_STORAGE_ROOMS = [
  "Cold Room 1 (Export)",
  "Cold Room 2 (Domestic)",
  "Cold Room 3 (Pre-Cooling)",
  "Cold Room 4 (Chiller)",
  "Cold Room A (High Capacity)",
  "Cold Room B (Holding Vault)",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  MAIN_ADMIN: "Main Admin",
  OFFICE_ADMIN: "Office Admin",
  SUPERVISOR: "Supervisor",
  INVENTORY_ADMIN: "Inventory Admin",
  COLD_STORAGE_ADMIN: "Cold Storage Admin",
};
