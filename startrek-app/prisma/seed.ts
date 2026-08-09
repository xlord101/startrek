import { PrismaClient, UserRole, ProcurementStatus, QualityType, BoxType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Startrek enterprise database...");

  // 1. Seed Staff Users for all 5 RBAC Roles
  const mainAdmin = await prisma.user.upsert({
    where: { email: "rajesh@startrek.com" },
    update: { role: UserRole.MAIN_ADMIN },
    create: {
      name: "Rajesh Kumar (Main Admin)",
      email: "rajesh@startrek.com",
      passwordHash: "$2a$12$eImiTXuWVxfM37uY4JANjO5E/8vGvh2uJ/S5wP6tMvS2/K9r1.M4i", // "password123"
      role: UserRole.MAIN_ADMIN,
      isActive: true,
    },
  });

  const officeAdmin = await prisma.user.upsert({
    where: { email: "priya@startrek.com" },
    update: { role: UserRole.OFFICE_ADMIN },
    create: {
      name: "Priya Menon (Office Admin)",
      email: "priya@startrek.com",
      passwordHash: "$2a$12$eImiTXuWVxfM37uY4JANjO5E/8vGvh2uJ/S5wP6tMvS2/K9r1.M4i",
      role: UserRole.OFFICE_ADMIN,
      isActive: true,
    },
  });

  const supervisorNair = await prisma.user.upsert({
    where: { email: "arjun@startrek.com" },
    update: { role: UserRole.SUPERVISOR },
    create: {
      name: "Arjun Nair (Supervisor)",
      email: "arjun@startrek.com",
      passwordHash: "$2a$12$eImiTXuWVxfM37uY4JANjO5E/8vGvh2uJ/S5wP6tMvS2/K9r1.M4i",
      role: UserRole.SUPERVISOR,
      isActive: true,
    },
  });

  const inventoryAdmin = await prisma.user.upsert({
    where: { email: "inventory@startrek.com" },
    update: { role: UserRole.INVENTORY_ADMIN },
    create: {
      name: "Ramesh Sharma (Inventory Admin)",
      email: "inventory@startrek.com",
      passwordHash: "$2a$12$eImiTXuWVxfM37uY4JANjO5E/8vGvh2uJ/S5wP6tMvS2/K9r1.M4i",
      role: UserRole.INVENTORY_ADMIN,
      isActive: true,
    },
  });

  const coldStorageAdmin = await prisma.user.upsert({
    where: { email: "coldstorage@startrek.com" },
    update: { role: UserRole.COLD_STORAGE_ADMIN },
    create: {
      name: "Sunil Doke (Cold Storage Admin)",
      email: "coldstorage@startrek.com",
      passwordHash: "$2a$12$eImiTXuWVxfM37uY4JANjO5E/8vGvh2uJ/S5wP6tMvS2/K9r1.M4i",
      role: UserRole.COLD_STORAGE_ADMIN,
      isActive: true,
    },
  });

  console.log("✅ Seeded 5 staff accounts covering all RBAC roles.");

  // 2. Seed Main Inventory Warehouse Stock Levels
  const stockItems = [
    { boxType: BoxType.BOX_5KG, availableStock: 1200, issuedStock: 300 },
    { boxType: BoxType.BOX_7KG, availableStock: 2500, issuedStock: 450 },
    { boxType: BoxType.BOX_13KG, availableStock: 3800, issuedStock: 900 },
    { boxType: BoxType.BOX_13_5KG, availableStock: 1500, issuedStock: 200 },
    { boxType: BoxType.BOX_16KG, availableStock: 800, issuedStock: 150 },
  ];

  for (const item of stockItems) {
    await prisma.inventoryStock.upsert({
      where: { boxType: item.boxType },
      update: { availableStock: item.availableStock, issuedStock: item.issuedStock },
      create: item,
    });
  }

  console.log("✅ Seeded inventory box stock levels & bundle readiness.");

  // 3. Seed Farmers
  const farmer1 = await prisma.farmer.upsert({
    where: { mobileNumber: "9825860047" },
    update: {},
    create: {
      name: "Naresh Bhai Sankar Bhai",
      mobileNumber: "9825860047",
      address: "Bhacharwada, Kandar, Solapur, Maharashtra",
    },
  });

  const farmer2 = await prisma.farmer.upsert({
    where: { mobileNumber: "9823435133" },
    update: {},
    create: {
      name: "Kiran Doke",
      mobileNumber: "9823435133",
      address: "Gat No 455/3B, Kandar, Solapur, Maharashtra",
    },
  });

  console.log("✅ Seeded farmers.");
  console.log("🚀 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
