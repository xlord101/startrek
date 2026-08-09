import { PrismaClient, UserRole, BoxType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding KD Export enterprise database...");

  // Hash passwords
  const adminHash = await bcrypt.hash("admin123", 12);
  const officeHash = await bcrypt.hash("office123", 12);
  const supervisorHash = await bcrypt.hash("super123", 12);
  const inventoryHash = await bcrypt.hash("inv123", 12);
  const coldHash = await bcrypt.hash("cold123", 12);

  // 1. Seed Staff Users — KD Export credentials
  await prisma.user.upsert({
    where: { email: "admin@kdexport.com" },
    update: { passwordHash: adminHash, role: UserRole.MAIN_ADMIN, isActive: true },
    create: {
      name: "Main Admin",
      email: "admin@kdexport.com",
      passwordHash: adminHash,
      role: UserRole.MAIN_ADMIN,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "office@kdexport.com" },
    update: { passwordHash: officeHash, role: UserRole.OFFICE_ADMIN, isActive: true },
    create: {
      name: "Office Admin",
      email: "office@kdexport.com",
      passwordHash: officeHash,
      role: UserRole.OFFICE_ADMIN,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "supervisor@kdexport.com" },
    update: { passwordHash: supervisorHash, role: UserRole.SUPERVISOR, isActive: true },
    create: {
      name: "Field Supervisor",
      email: "supervisor@kdexport.com",
      passwordHash: supervisorHash,
      role: UserRole.SUPERVISOR,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "inventory@kdexport.com" },
    update: { passwordHash: inventoryHash, role: UserRole.INVENTORY_ADMIN, isActive: true },
    create: {
      name: "Inventory Admin",
      email: "inventory@kdexport.com",
      passwordHash: inventoryHash,
      role: UserRole.INVENTORY_ADMIN,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "coldstorage@kdexport.com" },
    update: { passwordHash: coldHash, role: UserRole.COLD_STORAGE_ADMIN, isActive: true },
    create: {
      name: "Cold Storage Admin",
      email: "coldstorage@kdexport.com",
      passwordHash: coldHash,
      role: UserRole.COLD_STORAGE_ADMIN,
      isActive: true,
    },
  });

  console.log("✅ Seeded 5 staff accounts covering all RBAC roles.");

  // 2. Seed Inventory Box Stock Levels
  const stockItems = [
    { boxType: BoxType.BOX_5KG, availableStock: 1200, issuedStock: 0 },
    { boxType: BoxType.BOX_7KG, availableStock: 2500, issuedStock: 0 },
    { boxType: BoxType.BOX_13KG, availableStock: 3800, issuedStock: 0 },
    { boxType: BoxType.BOX_13_5KG, availableStock: 1500, issuedStock: 0 },
    { boxType: BoxType.BOX_16KG, availableStock: 800, issuedStock: 0 },
  ];

  for (const item of stockItems) {
    await prisma.inventoryStock.upsert({
      where: { boxType: item.boxType },
      update: { availableStock: item.availableStock, issuedStock: item.issuedStock },
      create: item,
    });
  }

  console.log("✅ Seeded inventory box stock levels.");
  console.log("🚀 Database seeding completed successfully!");
  console.log("");
  console.log("Login credentials:");
  console.log("  Main Admin    → admin@kdexport.com / admin123");
  console.log("  Office Admin  → office@kdexport.com / office123");
  console.log("  Supervisor    → supervisor@kdexport.com / super123");
  console.log("  Inventory     → inventory@kdexport.com / inv123");
  console.log("  Cold Storage  → coldstorage@kdexport.com / cold123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
