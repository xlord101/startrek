import { PrismaClient, BoxType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("📦 Seeding realistic starter inventory stock...");

  // 1. Box Inventory Stock (100-200 units)
  const boxes = [
    { boxType: BoxType.BOX_5KG, availableStock: 150, issuedStock: 0 },
    { boxType: BoxType.BOX_7KG, availableStock: 200, issuedStock: 0 },
    { boxType: BoxType.BOX_13KG, availableStock: 180, issuedStock: 0 },
    { boxType: BoxType.BOX_13_5KG, availableStock: 200, issuedStock: 0 },
    { boxType: BoxType.BOX_16KG, availableStock: 120, issuedStock: 0 },
  ];

  for (const b of boxes) {
    await prisma.inventoryStock.upsert({
      where: { boxType: b.boxType },
      update: { availableStock: b.availableStock, issuedStock: 0 },
      create: b,
    });
    console.log(`  ✓ Box ${b.boxType}: ${b.availableStock} available`);
  }

  // 2. Consumable Materials & Chemicals
  const consumables = [
    { itemType: "ETHYLENE_WASH", availableStock: 25, issuedStock: 0, unit: "Liters" },
    { itemType: "FUNGICIDE_DIP", availableStock: 15, issuedStock: 0, unit: "Liters" },
    { itemType: "BAVISTIN", availableStock: 10, issuedStock: 0, unit: "Kg" },
    { itemType: "TILT", availableStock: 8, issuedStock: 0, unit: "Liters" },
    { itemType: "FOAM_PADS", availableStock: 300, issuedStock: 0, unit: "Units" },
    { itemType: "ETHYLENE_SACHETS", availableStock: 200, issuedStock: 0, unit: "Pouches" },
    { itemType: "GERMINATION_PAPER", availableStock: 250, issuedStock: 0, unit: "Sheets" },
    { itemType: "CORNER_GUARDS", availableStock: 150, issuedStock: 0, unit: "Pieces" },
  ];

  for (const c of consumables) {
    await prisma.consumableInventoryStock.upsert({
      where: { itemType: c.itemType },
      update: { availableStock: c.availableStock, issuedStock: 0, unit: c.unit },
      create: c,
    });
    console.log(`  ✓ Consumable ${c.itemType}: ${c.availableStock} ${c.unit}`);
  }

  console.log("✅ Realistic starter inventory successfully seeded!");
}

main()
  .catch((e) => {
    console.error("❌ Inventory seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
