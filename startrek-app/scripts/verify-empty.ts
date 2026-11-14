import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
  const [
    farmers,
    procurements,
    harvests,
    receipts,
    allocations,
    dispatches,
    orders,
    auditLogs,
    notifications,
    users,
    teams,
    suppliers,
    brands,
    consumables
  ] = await Promise.all([
    prisma.farmer.count(),
    prisma.procurementTask.count(),
    prisma.harvestTask.count(),
    prisma.coldStorageReceipt.count(),
    prisma.coldRoomAllocation.count(),
    prisma.containerDispatch.count(),
    prisma.exportOrder.count(),
    prisma.auditLog.count(),
    prisma.notification.count(),
    prisma.user.count(),
    prisma.labourTeam.count(),
    prisma.vehicleSupplier.count(),
    prisma.boxBrand.count(),
    prisma.consumableInventoryStock.count(),
  ]);

  console.log("=== POST-CLEANUP VERIFICATION ===");
  console.log("Active Farmers:", farmers);
  console.log("Active Procurement Tasks:", procurements);
  console.log("Active Harvest Tasks:", harvests);
  console.log("Active Cold Storage Receipts:", receipts);
  console.log("Active Cold Room Allocations:", allocations);
  console.log("Active Outbound Dispatches:", dispatches);
  console.log("Active Export Orders:", orders);
  console.log("Audit Logs:", auditLogs);
  console.log("Notifications:", notifications);
  console.log("--- PRESERVED SYSTEM MASTERS ---");
  console.log("Users (Logins):", users);
  console.log("Labour Teams:", teams);
  console.log("Vehicle Suppliers:", suppliers);
  console.log("Box Brands:", brands);
  console.log("Consumable Inventory Stock Items:", consumables);
}

verify().finally(() => prisma.$disconnect());

