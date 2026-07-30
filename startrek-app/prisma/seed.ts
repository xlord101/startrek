import { PrismaClient, UserRole, ProcurementStatus, QualityType, BoxType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Startrek database...");

  // 1. Seed Staff Users
  const mainAdmin = await prisma.user.upsert({
    where: { email: "rajesh@startrek.com" },
    update: {},
    create: {
      name: "Rajesh Kumar",
      email: "rajesh@startrek.com",
      passwordHash: "$2a$12$eImiTXuWVxfM37uY4JANjO5E/8vGvh2uJ/S5wP6tMvS2/K9r1.M4i", // Demo password: "password123"
      role: UserRole.MAIN_ADMIN,
      isActive: true,
    },
  });

  const officeAdmin = await prisma.user.upsert({
    where: { email: "priya@startrek.com" },
    update: {},
    create: {
      name: "Priya Menon",
      email: "priya@startrek.com",
      passwordHash: "$2a$12$eImiTXuWVxfM37uY4JANjO5E/8vGvh2uJ/S5wP6tMvS2/K9r1.M4i",
      role: UserRole.OFFICE_ADMIN,
      isActive: true,
    },
  });

  const supervisorArjun = await prisma.user.upsert({
    where: { email: "arjun@startrek.com" },
    update: {},
    create: {
      name: "Arjun Nair",
      email: "arjun@startrek.com",
      passwordHash: "$2a$12$eImiTXuWVxfM37uY4JANjO5E/8vGvh2uJ/S5wP6tMvS2/K9r1.M4i",
      role: UserRole.SUPERVISOR,
      isActive: true,
    },
  });

  const supervisorSuresh = await prisma.user.upsert({
    where: { email: "suresh@startrek.com" },
    update: {},
    create: {
      name: "Suresh Pillai",
      email: "suresh@startrek.com",
      passwordHash: "$2a$12$eImiTXuWVxfM37uY4JANjO5E/8vGvh2uJ/S5wP6tMvS2/K9r1.M4i",
      role: UserRole.SUPERVISOR,
      isActive: true,
    },
  });

  console.log("✅ Seeded 4 staff accounts.");

  // 2. Seed Farmers
  const farmer1 = await prisma.farmer.upsert({
    where: { mobileNumber: "9876543210" },
    update: {},
    create: {
      name: "Murugan Selvam",
      mobileNumber: "9876543210",
      address: "Thovalai, Kanyakumari District, Tamil Nadu",
    },
  });

  const farmer2 = await prisma.farmer.upsert({
    where: { mobileNumber: "9865432109" },
    update: {},
    create: {
      name: "Rajan Krishnan",
      mobileNumber: "9865432109",
      address: "Agastheeswaram, Kanyakumari District, Tamil Nadu",
    },
  });

  const farmer3 = await prisma.farmer.upsert({
    where: { mobileNumber: "9754321098" },
    update: {},
    create: {
      name: "Chandran Pillai",
      mobileNumber: "9754321098",
      address: "Marthandam, Kanyakumari District, Tamil Nadu",
    },
  });

  console.log("✅ Seeded 3 farmers.");

  // 3. Seed Sample Procurement Tasks
  const task1 = await prisma.procurementTask.create({
    data: {
      farmerId: farmer1.id,
      approxTonnage: 12.0,
      status: ProcurementStatus.APPROVED_PROCUREMENT,
      supervisorId: supervisorArjun.id,
      assignedAt: new Date("2026-07-20T09:00:00Z"),
      actualTonnage: 11.4,
      ratioPercentage: 78.0,
      quality: QualityType.GOOD,
      rate: 2200,
      supervisorSubmittedAt: new Date("2026-07-21T14:30:00Z"),
      finalRate: 2200,
      approvedById: officeAdmin.id,
      approvedAt: new Date("2026-07-22T10:00:00Z"),
      particulars: {
        create: [
          { boxType: BoxType.BOX_13KG },
          { boxType: BoxType.BOX_16KG },
        ],
      },
    },
  });

  const task2 = await prisma.procurementTask.create({
    data: {
      farmerId: farmer2.id,
      approxTonnage: 8.0,
      status: ProcurementStatus.FIELD_SUBMITTED,
      supervisorId: supervisorSuresh.id,
      assignedAt: new Date("2026-07-25T09:00:00Z"),
      actualTonnage: 7.2,
      ratioPercentage: 82.0,
      quality: QualityType.EXCELLENT,
      supervisorSubmittedAt: new Date("2026-07-26T16:00:00Z"),
      particulars: {
        create: [
          { boxType: BoxType.BOX_13KG },
          { boxType: BoxType.BOX_13_5KG },
        ],
      },
    },
  });

  const task3 = await prisma.procurementTask.create({
    data: {
      farmerId: farmer3.id,
      approxTonnage: 15.0,
      status: ProcurementStatus.PENDING_ASSIGNMENT,
    },
  });

  console.log("✅ Seeded procurement tasks.");
  console.log("🚀 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
