import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { logAuditEvent } from "@/lib/audit";
import { calculateBundlePlan, BoxType, ALL_BOX_TYPES } from "@/types";
import { BoxType as PrismaBoxType } from "@prisma/client";
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

    const mappedTasks = tasks.map(t => {
      let mappedRequired = t.requiredBoxCounts;
      if (mappedRequired && typeof mappedRequired === 'object') {
        mappedRequired = Object.fromEntries(
          Object.entries(mappedRequired).map(([k, v]) => [k.replace("BOX_", ""), v])
        );
      }
      let mappedActual = t.actualBoxPickups;
      if (mappedActual && typeof mappedActual === 'object') {
        mappedActual = Object.fromEntries(
          Object.entries(mappedActual).map(([k, v]) => [k.replace("BOX_", ""), v])
        );
      }
      return {
        ...t,
        farmerName: t.farmer?.name || (t as any).farmerName || "Farmer",
        address: t.farmer?.address || (t as any).address || "Farm Location",
        mobileNumber: t.farmer?.mobileNumber || (t as any).mobileNumber || "",
        farmerPhone: t.farmer?.mobileNumber || (t as any).farmerPhone || "",
        supervisorName: t.supervisor?.name,
        selectedBoxTypes: t.selectedBoxTypes.map(b => b.replace("BOX_", "")),
        requiredBoxCounts: mappedRequired,
        actualBoxPickups: mappedActual
      };
    });

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
          brandBoxCounts: updateData.brandBoxCounts,
          chemicalQuantities: updateData.chemicalQuantities,
          favilocPackets: updateData.favilocPackets,
          rubberPackets: updateData.rubberPackets,
          vehicleSupplierId: updateData.vehicleSupplierId,
          labourTeam: updateData.labourTeam,
          hasChemicalTreatment: updateData.hasChemicalTreatment,
          chemicals: updateData.chemicals,
          hasEthylenePaper: updateData.hasEthylenePaper,
          ethylenePacksCount: updateData.ethylenePacksCount,
          germinationPaperPcs: updateData.germinationPaperPcs,
          topBundlesCount: updateData.topBundlesCount,
          bottomBundlesCount: updateData.bottomBundlesCount,
          completeBundlesCount: updateData.completeBundlesCount,
          pingIntervalHours: updateData.pingIntervalHours,
          assignedAt: new Date(),
        };

        // Deduct materials from inventory based on the generated plan (server-computed)
        if (updateData.requiredBoxCounts && typeof updateData.requiredBoxCounts === "object") {
          const plan = calculateBundlePlan(updateData.requiredBoxCounts as Partial<Record<BoxType, number>>);
          finalData.bundleInfo = plan;
          finalData.materialsIssued = true;

          // 1) Box stock per type (boxes issued for this task)
          for (const [boxType, count] of Object.entries(updateData.requiredBoxCounts)) {
            const n = Number(count) || 0;
            if (n <= 0) continue;
            const enumKey = `BOX_${boxType}` as PrismaBoxType;
            if (!ALL_BOX_TYPES.includes(boxType as BoxType)) continue;
            await prisma.inventoryStock.upsert({
              where: { boxType: enumKey },
              update: {
                availableStock: { decrement: n },
                issuedStock: { increment: n },
              },
              create: {
                boxType: enumKey,
                availableStock: Math.max(0, 1000 - n),
                issuedStock: n,
              },
            });
          }

          // 2) Bundles & consumables (top=25/bundle, bottom=20/bundle, 16KG complete=10/bundle)
          const consumableDeductions: Array<[string, number, string]> = [
            ["CONSUMABLE_TOP_BUNDLE", plan.topBundles, "bundles (25 tops each)"],
            ["CONSUMABLE_BOTTOM_BUNDLE", plan.bottomBundles, "bundles (20 bottoms each)"],
            ["CONSUMABLE_BOX_BUNDLE_16KG", plan.completeBundles, "bundles (10 complete boxes each)"],
            ["CONSUMABLE_ETHYLENE_SACHETS", Math.ceil(plan.totalBoxes / 100), "pouches (100 pcs each)"],
            ["CONSUMABLE_FAVILOC", Number(updateData.favilocPackets) || 0, "packets (1 kg each)"],
            ["CONSUMABLE_RUBBER", Number(updateData.rubberPackets) || 0, "packets"],
          ];
          for (const [itemType, qty, unit] of consumableDeductions) {
            if (qty <= 0) continue;
            await prisma.consumableInventoryStock.upsert({
              where: { itemType },
              update: {
                availableStock: { decrement: qty },
                issuedStock: { increment: qty },
              },
              create: {
                itemType,
                availableStock: Math.max(0, 500 - qty),
                issuedStock: qty,
                unit,
              },
            });
          }
        }
        break;
      case "CONFIRM_PICKUP":
        finalData = {
          status: "PICKUP_COMPLETED",
          actualBoxPickups: updateData.actualBoxPickups,
        };
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
          fieldDamagedBoxes: updateData.fieldDamagedBoxes,
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
        const frontendBoxType = updatedTask.selectedBoxTypes?.[0] || "7KG";
        const mainBoxType = frontendBoxType.startsWith("BOX_") ? frontendBoxType : `BOX_${frontendBoxType}`;
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

    let mappedRequiredUpdate = updatedTask.requiredBoxCounts;
    if (mappedRequiredUpdate && typeof mappedRequiredUpdate === 'object') {
      mappedRequiredUpdate = Object.fromEntries(
        Object.entries(mappedRequiredUpdate).map(([k, v]) => [k.replace("BOX_", ""), v])
      );
    }
    let mappedActualUpdate = updatedTask.actualBoxPickups;
    if (mappedActualUpdate && typeof mappedActualUpdate === 'object') {
      mappedActualUpdate = Object.fromEntries(
        Object.entries(mappedActualUpdate).map(([k, v]) => [k.replace("BOX_", ""), v])
      );
    }
    
    const mappedUpdatedTask = {
      ...updatedTask,
      supervisorName: updatedTask.supervisor?.name,
      selectedBoxTypes: updatedTask.selectedBoxTypes.map(b => b.replace("BOX_", "")),
      requiredBoxCounts: mappedRequiredUpdate,
      actualBoxPickups: mappedActualUpdate
    };

    return NextResponse.json({ message: "Harvest state updated", task: mappedUpdatedTask });
  } catch (error) {
    console.error("PATCH /api/harvest error:", error);
    return NextResponse.json({ error: "Failed to update harvest task" }, { status: 500 });
  }
}
