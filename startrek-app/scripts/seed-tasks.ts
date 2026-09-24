import { PrismaClient, UserRole, BoxType, HarvestTaskStatus, ProcurementStatus } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  // Find farmers (create one if not exists)
  let farmer = await prisma.farmer.findFirst();
  if (!farmer) {
    farmer = await prisma.farmer.create({
      data: {
        name: "Test Farmer",
        mobileNumber: "1234567890",
        address: "Test Village"
      }
    });
  }

  // Find users
  const admin = await prisma.user.findFirst({ where: { role: UserRole.MAIN_ADMIN } });
  const fieldSup = await prisma.user.findFirst({ where: { role: UserRole.FIELD_SUPERVISOR } });
  const procSup = await prisma.user.findFirst({ where: { role: UserRole.PROCUREMENT_SUPERVISOR } });

  // 1. Create a bunch of Procurement Tasks (Dense Data)
  for (let i = 0; i < 10; i++) {
    await prisma.procurementTask.create({
      data: {
        farmerId: farmer.id,
        approxTonnage: 5 + i,
        status: ProcurementStatus.APPROVED_PROCUREMENT,
        supervisorId: procSup?.id,
        finalRate: 15.5,
        actualTonnage: 5 + i,
        quality: "GOOD"
      }
    });
  }

  // 2. Create Harvest Tasks for the Field Supervisor
  const pTask = await prisma.procurementTask.create({
    data: {
      farmerId: farmer.id,
      approxTonnage: 20,
      status: ProcurementStatus.APPROVED_PROCUREMENT,
      supervisorId: procSup?.id,
    }
  });

  await prisma.harvestTask.create({
    data: {
      procurementTaskId: pTask.id,
      farmerId: farmer.id,
      tonnage: 20,
      quality: "GOOD",
      finalRate: 15,
      status: HarvestTaskStatus.HARVEST_ASSIGNED,
      supervisorId: fieldSup?.id,
      selectedBoxTypes: ["BOX_13KG", "BOX_7KG"],
      brandName: "KD Export",
      vehicleSupplierId: null,
      isHighPriority: true
    }
  });

  console.log("Dummy data seeded.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
