import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const harvestTasks = await prisma.harvestTask.findMany({ include: { supervisor: true }});
  console.log(JSON.stringify(harvestTasks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
