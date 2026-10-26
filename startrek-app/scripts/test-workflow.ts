import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runWorkflowTest() {
  console.log("🚀 Starting End-to-End Workflow Test...");

  try {
    // 1. Create a dummy Farmer
    console.log("\n[1/6] Creating test farmer...");
    const farmer = await prisma.farmer.create({
      data: {
        name: 'Workflow Test Farmer',
        mobileNumber: '5550009999',
        address: 'Test Village, Some District',
      }
    });
    console.log(`✅ Created Farmer: ${farmer.name} (ID: ${farmer.id})`);

    // 2. Create a dummy Supervisor
    console.log("\n[2/6] Creating test supervisor...");
    const supervisor = await prisma.user.create({
      data: {
        name: 'Test Supervisor',
        email: 'supervisor_test@example.com',
        passwordHash: 'dummyhash',
        role: 'PROCUREMENT_SUPERVISOR',
        isActive: true
      }
    });
    console.log(`✅ Created Supervisor: ${supervisor.name} (ID: ${supervisor.id})`);

    // 3. Create a Procurement Task (Field Intake)
    console.log("\n[3/6] Supervisor initiates field intake...");
    const procurementTask = await prisma.procurementTask.create({
      data: {
        farmerId: farmer.id,
        supervisorId: supervisor.id,
        status: 'PENDING_ASSIGNMENT',
        approxTonnage: 50.5
      }
    });
    console.log(`✅ Procurement Task Created: ID ${procurementTask.id}`);

    // 4. Supervisor Submits Field Report
    console.log("\n[4/6] Supervisor submits field quality report...");
    const updatedTask = await prisma.procurementTask.update({
      where: { id: procurementTask.id },
      data: {
        status: 'FIELD_SUBMITTED',
        quality: 'EXCELLENT',
        supervisorRatePerKg: 25.50,
        supervisorSubmittedAt: new Date(),
        chilling: false,
        caliberNumber: 42
      }
    });
    console.log(`✅ Task Updated to: ${updatedTask.status}, Grade: ${updatedTask.quality}`);

    // 5. Admin Approves and creates Harvesting Task
    console.log("\n[5/6] Admin locks rate & transitions to Harvesting...");
    // Simulate API logic where Admin approves procurement task -> creates harvest task
    await prisma.$transaction(async (tx) => {
      await tx.procurementTask.update({
        where: { id: updatedTask.id },
        data: {
          status: 'APPROVED_PROCUREMENT',
          finalRate: 25.00,
          approvedAt: new Date()
        }
      });
      
      const harvestTask = await tx.harvestTask.create({
        data: {
          procurementTaskId: updatedTask.id,
          farmerId: farmer.id,
          tonnage: updatedTask.approxTonnage,
          quality: updatedTask.quality!,
          finalRate: 25.00,
          status: 'READY_FOR_HARVEST',
        }
      });
      console.log(`✅ Rate Locked! Harvest Task Created: ID ${harvestTask.id}`);
      
      // 6. Complete Harvest & Dispatch to Cold Storage
      console.log("\n[6/6] Completing Harvest & Dispatching to Cold Storage...");
      const finalTask = await tx.harvestTask.update({
        where: { id: harvestTask.id },
        data: {
          status: 'DISPATCHED_TO_COLD_STORAGE',
          harvestedBoxes: 500,
          brandName: 'PREMIUM_BRAND',
          truckNumber: 'TEST-TRUCK-99',
          dispatchedAt: new Date()
        }
      });
      console.log(`✅ Dispatched to Cold Storage! Status: ${finalTask.status}, Boxes: ${finalTask.harvestedBoxes}`);
    });

    console.log("\n🎉 Workflow Test Completed Successfully!");

  } catch (error) {
    console.error("❌ Workflow Test Failed:", error);
  } finally {
    // Cleanup Test Data
    console.log("\n🧹 Cleaning up test data...");
    
    // delete related harvesting tasks
    await prisma.harvestTask.deleteMany({
      where: { farmer: { mobileNumber: '5550009999' } }
    });
    // delete related procurement tasks
    await prisma.procurementTask.deleteMany({
      where: { farmer: { mobileNumber: '5550009999' } }
    });
    // delete farmer
    await prisma.farmer.deleteMany({
      where: { mobileNumber: '5550009999' }
    });
    // delete supervisor
    await prisma.user.deleteMany({
      where: { email: 'supervisor_test@example.com' }
    });
    
    await prisma.$disconnect();
    console.log("✅ Cleanup complete.");
  }
}

runWorkflowTest();
