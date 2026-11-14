import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import {
  CHEMICAL_CONFIG,
  convertChemicalToBase,
  isChemicalItem,
  normalizeChemicalKey,
  parseChemicalUsageToBase,
} from "@/lib/chemicals";
import {
  buildHarvestConsumableDeductions,
  ConsumableDeductionItem,
  convertGermEthyleneInput,
  convertKgConsumableInput,
  deductConsumableStock,
  ensureFixedChemicals,
  ensureStandardConsumables,
  formatConsumableLabel,
  isGermEthylenePaper,
  isKgConsumable,
  normalizeConsumableItemType,
  normalizeExtraConsumables,
  roundStockQty,
  STANDARD_CONSUMABLE_UNITS,
} from "@/lib/consumables";

// GET /api/inventory — Return current inventory levels
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (
      !payload ||
      (payload.role !== "MAIN_ADMIN" &&
        payload.role !== "OFFICE_ADMIN" &&
        payload.role !== "INVENTORY_ADMIN")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ensure fixed chemicals and canonical consumable units (kg for germination paper & bags, remove obsolete items)
    await ensureStandardConsumables(prisma);

    const items = await prisma.inventoryStock.findMany({
      orderBy: { boxType: "asc" },
    });

    const consumableItems = await prisma.consumableInventoryStock.findMany({
      orderBy: { itemType: "asc" },
    });

    const returns = await prisma.inventoryReturnRequest.findMany({
      orderBy: { submittedAt: "desc" },
    });

    const boxBrands = await (prisma as any).boxBrand.findMany({
      where: {
        OR: [
          { isActive: true },
          { stocks: { some: {} } },
        ],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    const brandStock = await (prisma as any).boxBrandStock.findMany({
      include: { brand: { select: { name: true } } },
      orderBy: [{ brand: { name: "asc" } }, { boxType: "asc" }],
    });

    const pendingRequests = await prisma.harvestTask.findMany({
      where: {
        status: "HARVEST_ASSIGNED",
        materialsIssued: false,
      },
      include: {
        farmer: true,
        supervisor: true,
      },
      orderBy: {
        assignedAt: "desc"
      }
    });

    const dispatchedLogs = await prisma.harvestTask.findMany({
      where: {
        materialsIssued: true,
      },
      include: {
        farmer: true,
        supervisor: true,
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 30,
    });

    const flatBrandStock = brandStock.map((row: any) => ({
      id: row.id,
      brandId: row.brandId,
      brandName: row.brand?.name || "",
      boxType: String(row.boxType).replace("BOX_", ""),
      availableStock: row.availableStock,
      issuedStock: row.issuedStock,
      updatedAt: row.updatedAt,
    }));

    return NextResponse.json({ items, consumableItems, returns, pendingRequests, dispatchedLogs, boxBrands, brandStock: flatBrandStock });
  } catch (error) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory stock" }, { status: 500 });
  }
}

// PATCH /api/inventory — Update inventory return requests and restock
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN" && payload.role !== "INVENTORY_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, returnId, actualReturnedBoxes, actualReturnedSheets } = body;

    if (action === "VERIFY_RETURN" && returnId) {
      // 1. Get the return request
      const returnReq = await prisma.inventoryReturnRequest.findUnique({
        where: { id: returnId },
      });

      if (!returnReq) {
        return NextResponse.json({ error: "Return request not found" }, { status: 404 });
      }

      const numBoxes = actualReturnedBoxes !== undefined ? Math.max(0, Math.round(Number(actualReturnedBoxes) || 0)) : (returnReq.expectedReturnBoxes || 0);
      const numSheets = actualReturnedSheets !== undefined ? Math.max(0, Math.round(Number(actualReturnedSheets) || 0)) : (returnReq.expectedReturnSheets || 0);

      const wastageBoxes = Math.max(0, (returnReq.expectedReturnBoxes || 0) - numBoxes);
      const wastageSheets = Math.max(0, (returnReq.expectedReturnSheets || 0) - numSheets);

      // 2. Update the return request
      const updatedReturn = await prisma.inventoryReturnRequest.update({
        where: { id: returnId },
        data: {
          status: "VERIFIED_RESTOCKED",
          actualReturnedBoxes: numBoxes,
          wastageBoxes,
          actualReturnedSheets: numSheets,
          wastageSheets,
          verifiedAt: new Date(),
        },
      });

      // 3. Update inventory stock (add back good boxes)
      if (numBoxes > 0) {
        await prisma.inventoryStock.update({
          where: { boxType: returnReq.boxType },
          data: {
            availableStock: { increment: numBoxes },
            issuedStock: { decrement: numBoxes },
          },
        }).catch(() => {});
      }

      if (wastageBoxes > 0) {
        // Just decrement issued stock for damaged/wasted boxes
        await prisma.inventoryStock.update({
          where: { boxType: returnReq.boxType },
          data: {
            issuedStock: { decrement: wastageBoxes },
          },
        }).catch(() => {});
      }

      // 4. Update consumable stock for returned sheets
      if (numSheets > 0) {
        await prisma.consumableInventoryStock.update({
          where: { itemType: "GERM_ETHYLENE_PAPER" },
          data: {
            availableStock: { increment: numSheets },
            issuedStock: { decrement: numSheets },
          },
        }).catch(() => {});
      }
      if (wastageSheets > 0) {
        await prisma.consumableInventoryStock.update({
          where: { itemType: "GERM_ETHYLENE_PAPER" },
          data: {
            issuedStock: { decrement: wastageSheets },
          },
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, returnRequest: updatedReturn });
    }

    if (action === "DISPATCH_MATERIALS" && body.taskId) {
      const task = await prisma.harvestTask.findUnique({
        where: { id: body.taskId }
      });

      if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      if (task.materialsIssued) return NextResponse.json({ error: "Already issued" }, { status: 400 });

      // Update box stock based on dispatchedCounts if provided, else fallback
      const countsToDispatch = body.dispatchedCounts || task.requiredBoxCounts || {};
      const brandBoxCounts = (task.brandBoxCounts && typeof task.brandBoxCounts === "object")
        ? (task.brandBoxCounts as Record<string, Record<string, number>>)
        : null;

      if (brandBoxCounts && Object.keys(brandBoxCounts).length > 0) {
        for (const [brand, counts] of Object.entries(brandBoxCounts)) {
          const brandRec = await (prisma as any).boxBrand.findUnique({ where: { name: brand } });
          if (!brandRec) continue;
          for (const [bt, raw] of Object.entries(counts || {})) {
            const n = Math.max(0, Math.round(Number(raw) || 0));
            if (n <= 0) continue;
            const prismaBoxType = bt.startsWith("BOX_") ? bt : `BOX_${bt}`;
            const row = await (prisma as any).boxBrandStock.findUnique({
              where: { brandId_boxType: { brandId: brandRec.id, boxType: prismaBoxType } },
            });
            if (row) {
              const deduct = Math.min(row.availableStock || 0, n);
              await (prisma as any).boxBrandStock.update({
                where: { brandId_boxType: { brandId: brandRec.id, boxType: prismaBoxType } },
                data: {
                  availableStock: Math.max(0, (row.availableStock || 0) - deduct),
                  issuedStock: (row.issuedStock || 0) + n,
                },
              });
            }
          }
        }
      } else if (typeof countsToDispatch === "object") {
        for (const [boxType, qtyStr] of Object.entries(countsToDispatch as Record<string, any>)) {
          const qty = Math.round(Number(qtyStr) || 0);
          if (qty > 0) {
            const prismaBoxType = boxType.startsWith("BOX_") ? boxType : `BOX_${boxType}`;
            await prisma.inventoryStock.updateMany({
              where: { boxType: prismaBoxType as any },
              data: {
                availableStock: { decrement: qty },
                issuedStock: { increment: qty },
              },
            });
          }
        }
      }

      // Compute complete consumable & fixed chemical deductions for this task
      const existingTaskExtras = normalizeExtraConsumables((task as any).extraConsumables);
      const baseDeductions = buildHarvestConsumableDeductions({
        requiredBoxCounts: countsToDispatch as Record<string, number>,
        targetRequiredBoxes: task.targetRequiredBoxes,
        favilocPackets: task.favilocPackets,
        rubberPackets: task.rubberPackets,
        germEthylenePaperSheets: (task as any).germEthylenePaperSheets,
        bagsKg7: (task as any).bagsKg7,
        bagsKg13: (task as any).bagsKg13,
        foamUnit: task.foamUnit,
        extraConsumables: existingTaskExtras,
        hasChemicalTreatment: task.hasChemicalTreatment,
        chemicals: Array.isArray(task.chemicals) ? (task.chemicals as string[]) : [],
        chemicalQuantities: (task.chemicalQuantities as Record<string, string>) || undefined,
      });

      const deductionMap = new Map<string, ConsumableDeductionItem>(
        baseDeductions.map((d) => [d.itemType, d])
      );

      const CORE_SKIP_EXTRA = new Set([
        "TOP_BUNDLE",
        "BOTTOM_BUNDLE",
        "BOX_BUNDLE_16KG",
        "GERM_ETHYLENE_PAPER",
        "BAGS_7KG",
        "BAGS_13KG",
        "FOAM_PADS",
        "FAVILOC",
        "RUBBER",
      ]);
      const extraMetaMap = new Map(existingTaskExtras.map((e) => [e.itemType, e]));

      // Merge any explicit overrides passed in body.dispatchedConsumables
      const consumablesToDispatch = body.dispatchedConsumables;
      if (consumablesToDispatch && typeof consumablesToDispatch === "object") {
        for (const [rawKey, rawVal] of Object.entries(consumablesToDispatch as Record<string, unknown>)) {
          const cleanKey = normalizeConsumableItemType(rawKey);
          if (!cleanKey) continue;
          const chemKey = normalizeChemicalKey(cleanKey);

          if (chemKey) {
            const qty =
              typeof rawVal === "string"
                ? parseChemicalUsageToBase(chemKey, rawVal)
                : Math.max(0, Math.round(Number(rawVal) || 0));
            if (qty > 0) {
              deductionMap.set(chemKey, {
                itemType: chemKey,
                qty,
                unit: CHEMICAL_CONFIG[chemKey].baseUnit,
              });
            }
          } else if (rawVal !== undefined && rawVal !== null) {
            const qty = Math.max(0, roundStockQty(Number(rawVal) || 0));
            if (qty > 0) {
              deductionMap.set(cleanKey, {
                itemType: cleanKey,
                qty,
                unit:
                  STANDARD_CONSUMABLE_UNITS[cleanKey] ||
                  extraMetaMap.get(cleanKey)?.unit ||
                  deductionMap.get(cleanKey)?.unit ||
                  "units",
              });
            } else {
              deductionMap.delete(cleanKey);
            }
          }
        }
      }

      await deductConsumableStock(prisma, Array.from(deductionMap.values()));

      const updatedExtras = Array.from(deductionMap.values())
        .filter((d) => !isChemicalItem(d.itemType) && !CORE_SKIP_EXTRA.has(d.itemType) && d.qty > 0)
        .map((d) => ({
          itemType: d.itemType,
          label: extraMetaMap.get(d.itemType)?.label || formatConsumableLabel(d.itemType),
          quantity: d.qty,
          unit: d.unit,
        }));

      const updatedTask = await prisma.harvestTask.update({
        where: { id: body.taskId },
        data: {
          materialsIssued: true,
          requiredBoxCounts: countsToDispatch,
          ...(deductionMap.has("GERM_ETHYLENE_PAPER")
            ? { germEthylenePaperSheets: Math.round(deductionMap.get("GERM_ETHYLENE_PAPER")!.qty) }
            : {}),
          ...(deductionMap.has("BAGS_7KG") ? { bagsKg7: deductionMap.get("BAGS_7KG")!.qty } : {}),
          ...(deductionMap.has("BAGS_13KG") ? { bagsKg13: deductionMap.get("BAGS_13KG")!.qty } : {}),
          ...(deductionMap.has("FOAM_PADS") ? { foamUnit: Math.round(deductionMap.get("FOAM_PADS")!.qty) } : {}),
          ...(updatedExtras.length > 0 || existingTaskExtras.length > 0
            ? { extraConsumables: updatedExtras }
            : {}),
        },
      });

      return NextResponse.json({ success: true, task: updatedTask });
    }

    // ---- Box brand management (admin): create/rename/deactivate brands ----
    if (action === "CREATE_BRAND" && body.name) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
      const created = await (prisma as any).boxBrand.upsert({
        where: { name },
        update: { isActive: true },
        create: { name },
      });
      return NextResponse.json({ success: true, brand: created });
    }

    if (action === "RENAME_BRAND" && body.id && body.name) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
      const renamed = await (prisma as any).boxBrand.update({
        where: { id: body.id },
        data: { name },
      });
      return NextResponse.json({ success: true, brand: renamed });
    }

    if (action === "SET_BRAND_ACTIVE" && body.id && typeof body.isActive === "boolean") {
      const updated = await (prisma as any).boxBrand.update({
        where: { id: body.id },
        data: { isActive: body.isActive },
      });
      return NextResponse.json({ success: true, brand: updated });
    }

    // ---- Brand-wise box stock: ADD / REMOVE / RESET per brand + size ----
    if (action === "ADD_BRAND_STOCK" && body.brandName && body.boxType && body.quantity) {
      const brandName = String(body.brandName).trim();
      const prismaBoxType = body.boxType.startsWith("BOX_") ? body.boxType : `BOX_${body.boxType}`;
      const brandRec = await (prisma as any).boxBrand.upsert({
        where: { name: brandName },
        update: { isActive: true },
        create: { name: brandName },
      });
      const updated = await (prisma as any).boxBrandStock.upsert({
        where: { brandId_boxType: { brandId: brandRec.id, boxType: prismaBoxType } },
        update: { availableStock: { increment: Number(body.quantity) } },
        create: {
          brandId: brandRec.id,
          boxType: prismaBoxType,
          availableStock: Number(body.quantity),
          issuedStock: 0,
        },
      });
      return NextResponse.json({ success: true, brandStock: updated });
    }

    if (action === "REMOVE_BRAND_STOCK" && body.brandName && body.boxType && body.quantity) {
      const brandRec = await (prisma as any).boxBrand.findUnique({ where: { name: String(body.brandName).trim() } });
      if (!brandRec) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      const prismaBoxType = body.boxType.startsWith("BOX_") ? body.boxType : `BOX_${body.boxType}`;
      const current = await (prisma as any).boxBrandStock.findUnique({
        where: { brandId_boxType: { brandId: brandRec.id, boxType: prismaBoxType } },
      });
      const newAvailable = Math.max(0, (current?.availableStock || 0) - Math.max(0, Number(body.quantity)));
      const updated = await (prisma as any).boxBrandStock.update({
        where: { brandId_boxType: { brandId: brandRec.id, boxType: prismaBoxType } },
        data: { availableStock: newAvailable },
      });
      return NextResponse.json({ success: true, brandStock: updated });
    }

    if (action === "RESET_BRAND_STOCK" && body.brandName && body.boxType) {
      const brandRec = await (prisma as any).boxBrand.findUnique({ where: { name: String(body.brandName).trim() } });
      if (!brandRec) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      const prismaBoxType = body.boxType.startsWith("BOX_") ? body.boxType : `BOX_${body.boxType}`;
      const updated = await (prisma as any).boxBrandStock.update({
        where: { brandId_boxType: { brandId: brandRec.id, boxType: prismaBoxType } },
        data: { availableStock: 0 },
      });
      return NextResponse.json({ success: true, brandStock: updated });
    }

    if (action === "DELETE_BRAND_STOCK") {
      if (body.id) {
        await (prisma as any).boxBrandStock.delete({ where: { id: body.id } }).catch(() => {});
        return NextResponse.json({ success: true, deleted: body.id });
      }
      if (body.brandName && body.boxType) {
        const brandRec = await (prisma as any).boxBrand.findUnique({ where: { name: String(body.brandName).trim() } });
        if (!brandRec) return NextResponse.json({ error: "Brand not found" }, { status: 404 });
        const prismaBoxType = body.boxType.startsWith("BOX_") ? body.boxType : `BOX_${body.boxType}`;
        await (prisma as any).boxBrandStock.deleteMany({
          where: { brandId: brandRec.id, boxType: prismaBoxType },
        });
        return NextResponse.json({ success: true, deleted: true });
      }
    }

    if (action === "DELETE_BRAND" && (body.id || body.brandName)) {
      if (body.id) {
        await (prisma as any).boxBrand.delete({ where: { id: body.id } }).catch(() => {});
        return NextResponse.json({ success: true, deleted: body.id });
      }
      if (body.brandName) {
        await (prisma as any).boxBrand.delete({ where: { name: String(body.brandName).trim() } }).catch(() => {});
        return NextResponse.json({ success: true, deleted: body.brandName });
      }
    }

    if (action === "ADD_STOCK" && body.boxType && body.quantity !== undefined) {
      if (body.boxType.startsWith("CONSUMABLE_") || isChemicalItem(body.boxType)) {
        const itemType = normalizeConsumableItemType(body.boxType);
        const chemKey = normalizeChemicalKey(itemType);

        if (chemKey) {
          await ensureFixedChemicals(prisma);
          const baseUnit = CHEMICAL_CONFIG[chemKey].baseUnit;
          const baseQty = convertChemicalToBase(
            chemKey,
            Number(body.quantity),
            String(body.unit || baseUnit)
          );
          if (baseQty <= 0) {
            return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });
          }
          const updatedStock = await prisma.consumableInventoryStock.upsert({
            where: { itemType: chemKey },
            update: {
              availableStock: { increment: baseQty },
              unit: baseUnit,
            },
            create: {
              itemType: chemKey,
              availableStock: baseQty,
              issuedStock: 0,
              unit: baseUnit,
            },
          });
          return NextResponse.json({ success: true, consumableStock: updatedStock });
        }

        const rawNum = Number(body.quantity);
        const existingItem = await prisma.consumableInventoryStock.findUnique({ where: { itemType } });
        const isKg = isKgConsumable(itemType, body.unit || existingItem?.unit);
        const isPaper = isGermEthylenePaper(itemType);
        const qty = isPaper
          ? convertGermEthyleneInput(rawNum, body.unit)
          : isKg
          ? convertKgConsumableInput(rawNum, body.unit)
          : roundStockQty(rawNum);
        if (!Number.isFinite(qty) || qty <= 0) {
          return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });
        }
        const unit = isPaper
          ? "sheets"
          : isKg
          ? "kg"
          : STANDARD_CONSUMABLE_UNITS[itemType] || body.unit || existingItem?.unit || "units";
        const nextAvail = roundStockQty((existingItem?.availableStock || 0) + qty);
        const updatedStock = await prisma.consumableInventoryStock.upsert({
          where: { itemType },
          update: {
            availableStock: nextAvail,
            ...(isPaper ? { unit: "sheets" } : isKg ? { unit: "kg" } : {}),
          },
          create: {
            itemType,
            availableStock: qty,
            issuedStock: 0,
            unit,
          },
        });
        return NextResponse.json({ success: true, consumableStock: updatedStock });
      } else {
        const qty = Math.round(Number(body.quantity));
        if (!Number.isFinite(qty) || qty <= 0) {
          return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });
        }
        const prismaBoxType = body.boxType.startsWith("BOX_") ? body.boxType : `BOX_${body.boxType}`;
        const updatedStock = await prisma.inventoryStock.upsert({
          where: { boxType: prismaBoxType as any },
          update: { availableStock: { increment: qty } },
          create: {
            boxType: prismaBoxType as any,
            availableStock: qty,
            issuedStock: 0,
          },
        });
        return NextResponse.json({ success: true, stock: updatedStock });
      }
    }

    if (action === "REMOVE_STOCK" && body.boxType && body.quantity !== undefined) {
      if (body.boxType.startsWith("CONSUMABLE_") || isChemicalItem(body.boxType)) {
        const itemType = normalizeConsumableItemType(body.boxType);
        const chemKey = normalizeChemicalKey(itemType);

        if (chemKey) {
          await ensureFixedChemicals(prisma);
          const baseUnit = CHEMICAL_CONFIG[chemKey].baseUnit;
          const baseQty = convertChemicalToBase(
            chemKey,
            Number(body.quantity),
            String(body.unit || baseUnit)
          );
          if (baseQty <= 0) {
            return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });
          }
          const current = await prisma.consumableInventoryStock.findUnique({ where: { itemType: chemKey } });
          const newAvailable = Math.max(0, (current?.availableStock || 0) - baseQty);
          const updatedStock = await prisma.consumableInventoryStock.upsert({
            where: { itemType: chemKey },
            update: { availableStock: newAvailable, unit: baseUnit },
            create: { itemType: chemKey, availableStock: 0, issuedStock: 0, unit: baseUnit },
          });
          return NextResponse.json({ success: true, consumableStock: updatedStock });
        }

        const current = await prisma.consumableInventoryStock.findUnique({ where: { itemType } });
        if (!current) {
          return NextResponse.json({ error: "Consumable item not found" }, { status: 404 });
        }
        const rawNum = Number(body.quantity);
        const isKg = isKgConsumable(itemType, body.unit || current.unit);
        const isPaper = isGermEthylenePaper(itemType);
        const qtyToRemove = isPaper
          ? convertGermEthyleneInput(rawNum, body.unit)
          : isKg
          ? convertKgConsumableInput(rawNum, body.unit)
          : Math.max(0, roundStockQty(rawNum));
        if (!Number.isFinite(qtyToRemove) || qtyToRemove <= 0) {
          return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });
        }
        const newAvailable = roundStockQty(Math.max(0, (current.availableStock || 0) - qtyToRemove));
        const updatedStock = await prisma.consumableInventoryStock.update({
          where: { itemType },
          data: {
            availableStock: newAvailable,
            ...(isPaper ? { unit: "sheets" } : isKg ? { unit: "kg" } : {}),
          },
        });
        return NextResponse.json({ success: true, consumableStock: updatedStock });
      } else {
        const qtyToRemove = Math.max(0, Math.round(Number(body.quantity)));
        const prismaBoxType = body.boxType.startsWith("BOX_") ? body.boxType : `BOX_${body.boxType}`;
        const current = await prisma.inventoryStock.findUnique({ where: { boxType: prismaBoxType as any } });
        const newAvailable = Math.max(0, (current?.availableStock || 0) - qtyToRemove);
        const updatedStock = await prisma.inventoryStock.update({
          where: { boxType: prismaBoxType as any },
          data: { availableStock: newAvailable },
        });
        return NextResponse.json({ success: true, stock: updatedStock });
      }
    }

    if (action === "RESET_STOCK" && body.boxType) {
      if (body.boxType.startsWith("CONSUMABLE_") || isChemicalItem(body.boxType)) {
        const itemType = normalizeConsumableItemType(body.boxType);
        const chemKey = normalizeChemicalKey(itemType);
        if (chemKey) {
          await ensureFixedChemicals(prisma);
        }
        const updatedStock = await prisma.consumableInventoryStock.upsert({
          where: { itemType },
          update: { availableStock: 0 },
          create: {
            itemType,
            availableStock: 0,
            issuedStock: 0,
            unit: chemKey
              ? CHEMICAL_CONFIG[chemKey].baseUnit
              : STANDARD_CONSUMABLE_UNITS[itemType] || "units",
          },
        });
        return NextResponse.json({ success: true, consumableStock: updatedStock });
      } else {
        const prismaBoxType = body.boxType.startsWith("BOX_") ? body.boxType : `BOX_${body.boxType}`;
        const updatedStock = await prisma.inventoryStock.update({
          where: { boxType: prismaBoxType as any },
          data: { availableStock: 0 },
        });
        return NextResponse.json({ success: true, stock: updatedStock });
      }
    }

    if (action === "DELETE_CONSUMABLE" && body.itemType) {
      const cleanType = normalizeConsumableItemType(body.itemType);
      if (isChemicalItem(cleanType)) {
        return NextResponse.json(
          { error: "Fixed chemicals cannot be deleted. Only stock can be updated." },
          { status: 400 }
        );
      }
      await prisma.consumableInventoryStock.deleteMany({
        where: { itemType: { in: [body.itemType, cleanType] } },
      });
      return NextResponse.json({ success: true, deleted: cleanType });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/inventory error:", error);
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}

// DELETE /api/inventory — Remove consumable item or zero box stock
export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== "MAIN_ADMIN" && payload.role !== "OFFICE_ADMIN" && payload.role !== "INVENTORY_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category"); // "BOX" | "CONSUMABLE"
    const itemType = searchParams.get("itemType");
    const boxType = searchParams.get("boxType");

    if (category === "CONSUMABLE" && itemType) {
      const cleanType = normalizeConsumableItemType(itemType);
      if (isChemicalItem(cleanType)) {
        return NextResponse.json(
          { error: "Fixed chemicals cannot be deleted. Only stock can be updated." },
          { status: 400 }
        );
      }
      await prisma.consumableInventoryStock.deleteMany({
        where: { itemType: { in: [itemType, cleanType] } },
      });
      return NextResponse.json({ success: true, deleted: cleanType });
    }

    if (category === "BOX" && boxType) {
      const prismaBoxType = boxType.startsWith("BOX_") ? boxType : `BOX_${boxType}`;
      await prisma.inventoryStock.updateMany({
        where: { boxType: prismaBoxType as any },
        data: { availableStock: 0, issuedStock: 0 },
      });
      return NextResponse.json({ success: true, reset: boxType });
    }

    if (category === "BRAND_STOCK" || category === "BOX_BRAND_STOCK") {
      const stockId = searchParams.get("id");
      if (stockId) {
        await (prisma as any).boxBrandStock.delete({ where: { id: stockId } }).catch(() => {});
        return NextResponse.json({ success: true, deleted: stockId });
      }
      const brandName = searchParams.get("brandName");
      if (brandName && boxType) {
        const bName = String(brandName || "").trim();
        const brandRec = await (prisma as any).boxBrand.findUnique({ where: { name: bName } });
        if (brandRec) {
          const prismaBoxType = boxType.startsWith("BOX_") ? boxType : `BOX_${boxType}`;
          await (prisma as any).boxBrandStock.deleteMany({
            where: { brandId: brandRec.id, boxType: prismaBoxType as any },
          });
          return NextResponse.json({ success: true, deleted: `${bName} ${boxType}` });
        }
      }
    }

    if (category === "BRAND") {
      const brandId = searchParams.get("id");
      const brandName = searchParams.get("brandName");
      if (brandId) {
        await (prisma as any).boxBrand.delete({ where: { id: brandId } }).catch(() => {});
        return NextResponse.json({ success: true, deleted: brandId });
      }
      if (brandName) {
        await (prisma as any).boxBrand.delete({ where: { name: String(brandName).trim() } }).catch(() => {});
        return NextResponse.json({ success: true, deleted: brandName });
      }
    }

    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  } catch (error) {
    console.error("DELETE /api/inventory error:", error);
    return NextResponse.json({ error: "Failed to delete item from inventory" }, { status: 500 });
  }
}
