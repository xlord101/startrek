import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function inspectAndClean() {
  console.log("=== INSPECTING CURRENT DATABASE RECORDS ===");

  const farmersCount = await prisma.farmer.count();
  const procurementCount = await prisma.procurementTask.count();
  const particularsCount = await prisma.taskParticular.count();
  const harvestCount = await prisma.harvestTask.count();
  const returnRequestsCount = await prisma.inventoryReturnRequest.count();
  const receiptsCount = await prisma.coldStorageReceipt.count();
  const allocationsCount = await prisma.coldRoomAllocation.count();
  const qualityReportsCount = await prisma.kDColdStorageQualityReport.count();
  const containerDispatchesCount = await prisma.containerDispatch.count();
  const containerItemsCount = await prisma.containerDispatchItem.count();
  const exportOrdersCount = await prisma.exportOrder.count();
  const exportOrderItemsCount = await prisma.exportOrderItem.count();
  const auditLogsCount = await prisma.auditLog.count();
  const notificationsCount = await prisma.notification.count();

  const usersCount = await prisma.user.count();
  const labourTeamsCount = await prisma.labourTeam.count();
  const vehicleSuppliersCount = await prisma.vehicleSupplier.count();
  const boxBrandsCount = await prisma.boxBrand.count();
  const boxBrandStocksCount = await prisma.boxBrandStock.count();
  const inventoryStocksCount = await prisma.inventoryStock.count();
  const consumableStocksCount = await prisma.consumableInventoryStock.count();

  console.log("--- RECORDS TO BE CLEARED ---");
  console.log(`Farmers: ${farmersCount}`);
  console.log(`Procurement Tasks: ${procurementCount}`);
  console.log(`Task Particulars: ${particularsCount}`);
  console.log(`Harvest Tasks: ${harvestCount}`);
  console.log(`Inventory Return Requests: ${returnRequestsCount}`);
  console.log(`Cold Storage Receipts: ${receiptsCount}`);
  console.log(`Cold Room Allocations: ${allocationsCount}`);
  console.log(`Cold Storage Quality Reports: ${qualityReportsCount}`);
  console.log(`Container Dispatches: ${containerDispatchesCount}`);
  console.log(`Container Dispatch Items: ${containerItemsCount}`);
  console.log(`Export Orders: ${exportOrdersCount}`);
  console.log(`Export Order Items: ${exportOrderItemsCount}`);
  console.log(`Audit Logs: ${auditLogsCount}`);
  console.log(`Notifications: ${notificationsCount}`);

  console.log("\n--- RECORDS TO PRESERVE ---");
  console.log(`Users (Logins): ${usersCount}`);
  console.log(`Labour Teams: ${labourTeamsCount}`);
  console.log(`Vehicle Suppliers: ${vehicleSuppliersCount}`);
  console.log(`Box Brands: ${boxBrandsCount}`);
  console.log(`Box Brand Stocks: ${boxBrandStocksCount}`);
  console.log(`Inventory Stocks: ${inventoryStocksCount}`);
  console.log(`Consumable Stocks: ${consumableStocksCount}`);

  console.log("\n=== STARTING TRANSACTIONAL DELETION OF WORKFLOW DATA ===");

  await prisma.$transaction(async (tx) => {
    // 1. Delete Outbound Dispatches & Export Orders
    await tx.containerDispatchItem.deleteMany({});
    await tx.containerDispatch.deleteMany({});
    await tx.exportOrderItem.deleteMany({});
    await tx.exportOrder.deleteMany({});

    // 2. Delete Cold Storage data (Allocations, Reports, Receipts)
    await tx.coldRoomAllocation.deleteMany({});
    await tx.kDColdStorageQualityReport.deleteMany({});
    await tx.coldStorageReceipt.deleteMany({});

    // 3. Delete Inventory Returns & Material Requests
    await tx.inventoryReturnRequest.deleteMany({});

    // 4. Delete Harvest Tasks
    await tx.harvestTask.deleteMany({});

    // 5. Delete Procurement Tasks & Particulars
    await tx.taskParticular.deleteMany({});
    await tx.procurementTask.deleteMany({});

    // 6. Delete Farmers
    await tx.farmer.deleteMany({});

    // 7. Delete Operational Logs & Notifications
    await tx.notification.deleteMany({});
    await tx.auditLog.deleteMany({});

    // 8. Reset issuedStock to 0 across all inventory records (preserve availableStock)
    await tx.boxBrandStock.updateMany({ data: { issuedStock: 0 } });
    await tx.inventoryStock.updateMany({ data: { issuedStock: 0 } });
    await tx.consumableInventoryStock.updateMany({ data: { issuedStock: 0 } });
  });

  console.log("=== SUCCESS: ALL WORKFLOW DATA, LOGS, AND FARMERS CLEARED ===");
  console.log("Preserved: All Users/Logins, Teams, Labour, Box Brands, and Inventory available stocks.");
}

inspectAndClean()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
