import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.harvestTask.findMany();
  console.dir(tasks.map(t => ({
    id: t.id,
    status: t.status,
    requiredBoxCounts: t.requiredBoxCounts
  })), { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
