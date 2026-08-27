import { PrismaClient, UserRole, BoxType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding KD Export enterprise database...");

  // Hash password
  const defaultHash = await bcrypt.hash("Startrek@123", 12);

  const users = [
    { name: "Main Admin", email: "admin@kdexport.com", role: UserRole.MAIN_ADMIN },
    
    // Office Admin
    { name: "KD office", email: "kdoffice@kdexport.com", role: UserRole.OFFICE_ADMIN },
    { name: "Anis momin", email: "anis.momin@kdexport.com", role: UserRole.OFFICE_ADMIN },
    
    // Inventory Manager
    { name: "Ajit landge", email: "ajit.landge@kdexport.com", role: UserRole.INVENTORY_ADMIN },
    
    // Cold Storage
    { name: "Cold storage", email: "coldstorage@kdexport.com", role: UserRole.COLD_STORAGE_ADMIN },
    
    // Field Supervisors
    { name: "Ankush Shinde", email: "ankush.shinde@kdexport.com", role: UserRole.FIELD_SUPERVISOR },
    { name: "Dinesh magar", email: "dinesh.magar@kdexport.com", role: UserRole.FIELD_SUPERVISOR },
    { name: "soyal mujavar", email: "soyal.mujavar@kdexport.com", role: UserRole.FIELD_SUPERVISOR },
    
    // Procurement Supervisors
    { name: "Vishal Naykudae", email: "vishal.naykudae@kdexport.com", role: UserRole.PROCUREMENT_SUPERVISOR },
    { name: "Srirang Engale", email: "srirang.engale@kdexport.com", role: UserRole.PROCUREMENT_SUPERVISOR },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: defaultHash, role: u.role, isActive: true, name: u.name },
      create: {
        name: u.name,
        email: u.email,
        passwordHash: defaultHash,
        role: u.role,
        isActive: true,
      },
    });
  }

  console.log("✅ Seeded staff accounts covering all RBAC roles.");

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
  for (const u of users) {
    console.log(`  ${u.name.padEnd(20)} → ${u.email} / Startrek@123`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
