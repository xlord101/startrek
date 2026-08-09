import {
  ProcurementTask,
  User,
  Farmer,
  HarvestTask,
  VehicleSupplier,
  BoxType,
} from "@/types";

/* ─── Mock Users ─────────────────────────────────────────────── */
export const mockUsers: User[] = [
  {
    id: "u1",
    name: "Rajesh Kumar",
    email: "rajesh@startrek.com",
    role: "MAIN_ADMIN",
    isActive: true,
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "u2",
    name: "Priya Menon",
    email: "priya@startrek.com",
    role: "OFFICE_ADMIN",
    isActive: true,
    createdAt: new Date("2026-01-05"),
  },
  {
    id: "s1",
    name: "Arjun Nair",
    email: "arjun@startrek.com",
    role: "SUPERVISOR",
    isActive: true,
    createdAt: new Date("2026-02-01"),
  },
  {
    id: "s2",
    name: "Suresh Pillai",
    email: "suresh@startrek.com",
    role: "SUPERVISOR",
    isActive: true,
    createdAt: new Date("2026-02-10"),
  },
  {
    id: "s3",
    name: "Deepak Raj",
    email: "deepak@startrek.com",
    role: "SUPERVISOR",
    isActive: true,
    createdAt: new Date("2026-03-01"),
  },
];

/* ─── Mock Farmers ───────────────────────────────────────────── */
export const mockFarmers: Farmer[] = [
  {
    id: "f1",
    name: "Murugan Selvam",
    mobileNumber: "9876543210",
    address: "Thovalai, Kanyakumari District, Tamil Nadu",
    createdAt: new Date("2026-05-10"),
  },
  {
    id: "f2",
    name: "Rajan Krishnan",
    mobileNumber: "9865432109",
    address: "Agastheeswaram, Kanyakumari District, Tamil Nadu",
    createdAt: new Date("2026-06-01"),
  },
  {
    id: "f3",
    name: "Chandran Pillai",
    mobileNumber: "9754321098",
    address: "Marthandam, Kanyakumari District, Tamil Nadu",
    createdAt: new Date("2026-06-15"),
  },
  {
    id: "f4",
    name: "Govindasamy",
    mobileNumber: "9643210987",
    address: "Colachel, Kanyakumari District, Tamil Nadu",
    createdAt: new Date("2026-07-01"),
  },
  {
    id: "f5",
    name: "Balan Pillai",
    mobileNumber: "9532109876",
    address: "Nagercoil, Kanyakumari District, Tamil Nadu",
    createdAt: new Date("2026-07-10"),
  },
];

/* ─── Mock Vehicle Suppliers ─────────────────────────────────── */
export const mockVehicleSuppliers: VehicleSupplier[] = [
  {
    id: "vs1",
    supplierName: "Kiran Doke Logistics",
    vehicleNumber: "GJ-22-U-2117",
    driverName: "Shanmugam",
    driverPhone: "+91 9412345678",
  },
  {
    id: "vs2",
    supplierName: "Solapur Express Transport",
    vehicleNumber: "MH-13-AX-4553",
    driverName: "Vikram Patil",
    driverPhone: "+91 9823435133",
  },
  {
    id: "vs3",
    supplierName: "Reva Cargo Services",
    vehicleNumber: "MH-12-CT-9012",
    driverName: "Mahesh Deshmukh",
    driverPhone: "+91 9112385133",
  },
];

/* ─── Mock Inventory Stock ──────────────────────────────────── */
export const mockInventoryStock = {
  boxes: {
    "5KG": 2500,
    "7KG": 4000,
    "13KG": 6000,
    "13_5KG": 3500,
    "16KG": 3000,
  } as Record<BoxType, number>,
  chemicals: {
    ETHYLENE_WASH: "500 L",
    FUNGICIDE_DIP: "200 L",
    ALUM_TREATMENT: "150 kg",
    PROTECTIVE_COATING: "300 L",
  },
};

/* ─── Mock Procurement Tasks ─────────────────────────────────── */
export const mockTasks: ProcurementTask[] = [
  {
    id: "t1",
    farmerId: "f1",
    farmer: mockFarmers[0],
    approxTonnage: 12,
    status: "APPROVED_PROCUREMENT",
    supervisorId: "s1",
    supervisor: mockUsers[2],
    assignedAt: new Date("2026-07-20T09:00:00"),
    actualTonnage: 11.4,
    ratioPercentage: 78,
    quality: "GOOD",
    rate: 2200,
    supervisorSubmittedAt: new Date("2026-07-21T14:30:00"),
    particulars: [
      { id: "p1", taskId: "t1", boxType: "13KG" },
      { id: "p2", taskId: "t1", boxType: "16KG" },
    ],
    finalRate: 2200,
    approvedById: "u2",
    approvedBy: mockUsers[1],
    approvedAt: new Date("2026-07-22T10:00:00"),
    createdAt: new Date("2026-07-19T11:00:00"),
  },
  {
    id: "t2",
    farmerId: "f2",
    farmer: mockFarmers[1],
    approxTonnage: 8,
    status: "FIELD_SUBMITTED",
    supervisorId: "s2",
    supervisor: mockUsers[3],
    assignedAt: new Date("2026-07-25T09:00:00"),
    actualTonnage: 7.2,
    ratioPercentage: 82,
    quality: "EXCELLENT",
    supervisorSubmittedAt: new Date("2026-07-26T16:00:00"),
    particulars: [
      { id: "p3", taskId: "t2", boxType: "13KG" },
      { id: "p4", taskId: "t2", boxType: "13_5KG" },
    ],
    createdAt: new Date("2026-07-24T10:00:00"),
  },
];

/* Helper to add new intake tasks dynamically */
export function addMockProcurementTask(data: {
  farmerName: string;
  mobileNumber: string;
  address: string;
  approxTonnage: number;
}) {
  const newFarmer: Farmer = {
    id: `f_${Date.now()}`,
    name: data.farmerName,
    mobileNumber: data.mobileNumber,
    address: data.address,
    createdAt: new Date(),
  };
  mockFarmers.unshift(newFarmer);

  const newTask: ProcurementTask = {
    id: `t_${Date.now()}`,
    farmerId: newFarmer.id,
    farmer: newFarmer,
    approxTonnage: data.approxTonnage,
    status: "PENDING_ASSIGNMENT",
    createdAt: new Date(),
  };
  mockTasks.unshift(newTask);
  return newTask;
}

/* ─── Mock Harvesting Tasks (Module 2) ────────────────────────── */
export const mockHarvestTasks: HarvestTask[] = [
  {
    id: "ht1",
    procurementTaskId: "t1",
    farmerName: "Murugan Selvam",
    mobileNumber: "9876543210",
    address: "Thovalai, Kanyakumari District",
    tonnage: 11.4,
    quality: "GOOD",
    finalRate: 2200,
    status: "READY_FOR_HARVEST",
    isHighPriority: true, // HIGH PRIORITY FLAG
    supervisorId: "s1",
    supervisorName: "Arjun Nair",
    selectedBoxTypes: ["7KG", "13KG"],
    requiredBoxCounts: { "7KG": 400, "13KG": 300 },
    targetRequiredBoxes: 700,
    brandName: "StarPremium Export Grade",
    vehicleSupplier: mockVehicleSuppliers[0],
    labourTeam: "Harvest Team 1 (North Kanyakumari)",
    chemicals: ["ETHYLENE_WASH", "FUNGICIDE_DIP"],
    createdAt: new Date("2026-07-22T10:05:00"),
  },
  {
    id: "ht2",
    procurementTaskId: "t102",
    farmerName: "Velusamy Pillai",
    mobileNumber: "9812345678",
    address: "Padmanabhapuram, Kanyakumari",
    tonnage: 14.2,
    quality: "EXCELLENT",
    finalRate: 2350,
    status: "HARVEST_ASSIGNED",
    isHighPriority: false,
    supervisorId: "s2",
    supervisorName: "Soyal & Yash",
    selectedBoxTypes: ["7KG"],
    requiredBoxCounts: { "7KG": 1050 },
    targetRequiredBoxes: 1050,
    brandName: "StarPremium Export Grade",
    vehicleSupplier: mockVehicleSuppliers[1],
    labourTeam: "Harvest Team 3 (Thovalai)",
    chemicals: ["ETHYLENE_WASH", "FUNGICIDE_DIP"],
    pingIntervalHours: 2,
    assignedAt: new Date("2026-07-28T08:00:00"),
    createdAt: new Date("2026-07-27T11:00:00"),
  },
  {
    id: "ht3",
    procurementTaskId: "t103",
    farmerName: "Karthik Raja",
    mobileNumber: "9712345678",
    address: "Radhapuram, Kanyakumari",
    tonnage: 9.8,
    quality: "GOOD",
    finalRate: 2150,
    status: "HARVEST_IN_PROGRESS",
    isHighPriority: true,
    supervisorId: "s1",
    supervisorName: "Arjun Nair",
    selectedBoxTypes: ["13KG", "16KG"],
    requiredBoxCounts: { "13KG": 400, "16KG": 200 },
    targetRequiredBoxes: 600,
    actualBoxPickups: { "13KG": 450, "16KG": 220 }, // +70 buffer
    currentFilledBoxes: 420,
    gapBoxes: 180, // 600 required - 420 filled = 180 gap
    brandName: "GreenGold Fresh",
    vehicleSupplier: mockVehicleSuppliers[2],
    labourTeam: "Harvest Team 1 (North Kanyakumari)",
    chemicals: ["ALUM_TREATMENT", "PROTECTIVE_COATING"],
    pingIntervalHours: 2,
    assignedAt: new Date("2026-07-29T07:00:00"),
    startedAt: new Date("2026-07-29T09:30:00"),
    createdAt: new Date("2026-07-28T10:00:00"),
  },
  {
    id: "ht4",
    procurementTaskId: "t104",
    farmerName: "Subramanian",
    mobileNumber: "9612345678",
    address: "Nagercoil, Kanyakumari",
    tonnage: 16.5,
    quality: "EXCELLENT",
    finalRate: 2400,
    status: "DISPATCHED_TO_COLD_STORAGE",
    isHighPriority: false,
    supervisorId: "s3",
    supervisorName: "Deepak Raj",
    selectedBoxTypes: ["7KG"],
    requiredBoxCounts: { "7KG": 1100 },
    targetRequiredBoxes: 1100,
    actualBoxPickups: { "7KG": 1150 },
    currentFilledBoxes: 1107,
    gapBoxes: 0,
    brandName: "StarPremium Export Grade",
    vehicleSupplier: mockVehicleSuppliers[0],
    labourTeam: "Harvest Team 6 (Nagercoil)",
    chemicals: ["ETHYLENE_WASH", "FUNGICIDE_DIP", "PROTECTIVE_COATING"],
    pingIntervalHours: 2,
    harvestedBoxes: 1107,
    truckNumber: "GJ.22.U.2117",
    driverName: "Shanmugam",
    driverPhone: "+91 9412345678",
    assignedAt: new Date("2026-07-26T08:00:00"),
    startedAt: new Date("2026-07-26T10:00:00"),
    completedAt: new Date("2026-07-26T16:00:00"),
    dispatchedAt: new Date("2026-07-26T17:30:00"),
    createdAt: new Date("2026-07-25T09:00:00"),
  },
];

/* ─── Logged-in User (mock session) ──────────────────────────── */
export const mockCurrentUser = {
  admin: mockUsers[0],      // MAIN_ADMIN
  office: mockUsers[1],     // OFFICE_ADMIN
  supervisor: mockUsers[2], // SUPERVISOR (Arjun)
};
