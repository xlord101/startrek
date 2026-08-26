import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logAuditEvent } from "@/lib/audit";
// GET /api/harvest — Return harvest tasks
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tasks = await prisma.harvestTask.findMany({
      include: {
        farmer: true,
        supervisor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mappedTasks = tasks.map(t => ({
      ...t,
      selectedBoxTypes: t.selectedBoxTypes.map(b => b.replace("BOX_", ""))
    }));

    return NextResponse.json({ tasks: mappedTasks });
  } catch (error) {
    console.error("GET /api/harvest error:", error);
    return NextResponse.json({ error: "Failed to fetch harvest tasks" }, { status: 500 });
  }
}

// PATCH /api/harvest — Update harvest task state
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { taskId, action, ...updateData } = body;

    if (!taskId) return NextResponse.json({ error: "Task ID is required" }, { status: 400 });

    let finalData: any = {};

    switch (action) {
      case "SCHEDULE_HARVEST":
        finalData = {
          status: "HARVEST_ASSIGNED",
          supervisorId: updateData.supervisorId,
          isHighPriority: updateData.isHighPriority,
          selectedBoxTypes: (updateData.selectedBoxTypes || []).map((t: string) => t.startsWith('BOX_') ? t : `BOX_${t}`),
          requiredBoxCounts: updateData.requiredBoxCounts,
          targetRequiredBoxes: updateData.targetRequiredBoxes,
          brandName: updateData.brandName,
          vehicleSupplierId: updateData.vehicleSupplierId,
          labourTeam: updateData.labourTeam,
          hasChemicalTreatment: updateData.hasChemicalTreatment,
          chemicals: updateData.chemicals,
          hasEthylenePaper: updateData.hasEthylenePaper,
          ethylenePacksCount: updateData.ethylenePacksCount,
          germinationPaperPcs: updateData.germinationPaperPcs,
          topBundlesCount: updateData.topBundlesCount,
          bottomBundlesCount: updateData.bottomBundlesCount,
          pingIntervalHours: updateData.pingIntervalHours,
          assignedAt: new Date(),
        };
        break;
      case "CONFIRM_PICKUP":
        finalData = {
          status: "PICKUP_COMPLETED",
          actualBoxPickups: updateData.actualBoxPickups,
        };
        // Also need to deduct inventory
        if (updateData.actualBoxPickups) {
          for (const [boxType, count] of Object.entries(updateData.actualBoxPickups)) {
            // we skip inventory update logic for now or implement it via a separate inventory endpoint or inside here
            // prisma.inventoryStock update...
          }
        }
        break;
      case "WORK_STARTED":
        finalData = {
          status: "WORK_STARTED",
          qualityCheck: updateData.qualityCheck,
          workStartedAt: new Date(),
        };
        break;
      case "UPDATE_PROGRESS":
        finalData = {
          status: "HARVEST_IN_PROGRESS",
          currentFilledBoxes: updateData.currentFilledBoxes,
          gapBoxes: updateData.gapBoxes,
        };
        break;
      case "FORCE_COMPLETE":
        finalData = {
          status: "HARVEST_COMPLETED",
          currentFilledBoxes: updateData.currentFilledBoxes,
          gapBoxes: updateData.gapBoxes,
          shortfallReason: updateData.shortfallReason,
          isForceCompleted: true,
          completedAt: new Date(),
        };
        break;
      case "DISPATCH_BILL":
        finalData = {
          status: "DISPATCHED_TO_COLD_STORAGE",
          billData: updateData.billData,
          truckNumber: updateData.billData?.vehicleNo,
          harvestedBoxes: updateData.loadedBoxesCount,
          dispatchedAt: new Date(),
        };
        break;
      default:
        // Generic update
        finalData = { ...updateData };
        break;
    }

    const updatedTask = await prisma.harvestTask.update({
      where: { id: taskId },
      data: finalData,
      include: {
        farmer: true,
        supervisor: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // If Dispatch Bill, we should create a return request and a cold storage receipt
    if (action === "DISPATCH_BILL") {
      const leftoverBoxes = Math.max(0, updateData.totalBoxesPickedUp - updateData.loadedBoxesCount);
      
      const newReceipt = await prisma.coldStorageReceipt.upsert({
        where: { harvestTaskId: taskId },
        update: {
          farmerName: updateData.billData.farmerName,
          vehicleNo: updateData.billData.vehicleNo,
          driverName: updatedTask.driverName || "Unknown",
          driverPhone: updatedTask.driverPhone || "Unknown",
          dispatchedTotalBoxes: updateData.loadedBoxesCount,
        },
        create: {
          harvestTaskId: taskId,
          farmerName: updateData.billData.farmerName,
          vehicleNo: updateData.billData.vehicleNo,
          driverName: updatedTask.driverName || "Unknown",
          driverPhone: updatedTask.driverPhone || "Unknown",
          dispatchedTotalBoxes: updateData.loadedBoxesCount,
          status: "DISPATCHED",
        }
      });

      // Clear any previous return requests for this task if they exist to avoid duplicates
      await prisma.inventoryReturnRequest.deleteMany({
        where: { harvestTaskId: taskId }
      });

      if (leftoverBoxes > 0) {
        const mainBoxType = updatedTask.selectedBoxTypes?.[0] || "BOX_7KG";
        await prisma.inventoryReturnRequest.create({
          data: {
            harvestTaskId: taskId,
            farmerName: updateData.billData.farmerName,
            boxType: mainBoxType as any,
            expectedReturnBoxes: leftoverBoxes,
            status: "PENDING_VERIFICATION",
          }
        });
      }

      await logAuditEvent({
        userId: payload.userId,
        userRole: payload.role,
        action: "HARVEST_DISPATCHED",
        entityType: "HARVEST_TASK",
        entityId: taskId,
        details: `Dispatched ${updateData.loadedBoxesCount} boxes from ${updateData.billData?.farmerName || "farm"} via truck ${updateData.billData?.vehicleNo || "-"} to cold storage`,
      });
    }

    const mappedUpdatedTask = {
      ...updatedTask,
      selectedBoxTypes: updatedTask.selectedBoxTypes.map(b => b.replace("BOX_", ""))
    };

    return NextResponse.json({ message: "Harvest state updated", task: mappedUpdatedTask });
  } catch (error) {
    console.error("PATCH /api/harvest error:", error);
    return NextResponse.json({ error: "Failed to update harvest task" }, { status: 500 });
  }
}
