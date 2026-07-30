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

/* ─── Harvesting Types (Module 2) ─────────────────────────────── */

export type HarvestTaskStatus =
  | "READY_FOR_HARVEST"
  | "HARVEST_ASSIGNED"
  | "HARVEST_IN_PROGRESS"
  | "HARVEST_COMPLETED"
  | "DISPATCHED_TO_COLD_STORAGE";

export type ChemicalOption =
  | "ETHYLENE_WASH"
  | "FUNGICIDE_DIP"
  | "ALUM_TREATMENT"
  | "PROTECTIVE_COATING";

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

  // Scheduling details
  teamName?: string;
  brandName?: string;
  chemicals?: ChemicalOption[];
  pingIntervalHours?: number; // Default 2 hours

  // Logistics & dispatch details
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

  // Field inspection
  actualTonnage?: number;
  ratioPercentage?: number;
  quality?: QualityType;
  rejectionReason?: string;
  altMobileNumber?: string;
  rate?: number;
  supervisorSubmittedAt?: Date;
  particulars?: TaskParticular[];

  // Final approval
  finalRate?: number;
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
  HARVEST_ASSIGNED: "Team Assigned",
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

export const ROLE_LABELS: Record<UserRole, string> = {
  MAIN_ADMIN: "Main Admin",
  OFFICE_ADMIN: "Office Admin",
  SUPERVISOR: "Supervisor",
  INVENTORY_ADMIN: "Inventory Admin",
  COLD_STORAGE_ADMIN: "Cold Storage Admin",
};
