import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const task = await prisma.procurementTask.findFirst();
    if (!task) return console.log("No task found");
    
    const updateData: any = {
      actualTonnage: 12.3,
      ratioPercentage: 80,
      quality: "EXCELLENT",
      supervisorRatePerKg: 22.5,
      status: "FIELD_SUBMITTED",
      particulars: {
        deleteMany: {},
        create: [{ boxType: "BOX_13KG" }]
      }
    };
    
    const updated = await prisma.procurementTask.update({
      where: { id: task.id },
      data: updateData,
      include: { particulars: true }
    });
    console.log("Success!");
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
