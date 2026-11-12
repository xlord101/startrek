import {
  BoxType,
  calculateBagsKg,
  calculateBundlePlan,
  calculateGerminationPaperKg,
} from "@/types";
import {
  CHEMICAL_CONFIG,
  FIXED_CHEMICAL_KEYS,
  isChemicalItem,
  normalizeChemicalKey,
  parseChemicalUsageToBase,
} from "./chemicals";

export interface ConsumableDeductionItem {
  itemType: string;
  qty: number;
  unit: string;
}

export interface HarvestConsumableInput {
  requiredBoxCounts?: Partial<Record<BoxType, number>> | Record<string, number> | null;
  targetRequiredBoxes?: number | null;
  favilocPackets?: number | null;
  rubberPackets?: number | null;
  ethylenePacksCount?: number | null;
  germinationPaperPcs?: number | null;
  bagsKg?: number | null;
  foamUnit?: number | null;
  hasChemicalTreatment?: boolean | null;
  chemicals?: string[] | null;
  chemicalQuantities?: Record<string, string> | null;
}

/** Normalize legacy or prefixed consumable itemType names to canonical DB keys */
export function normalizeConsumableItemType(rawType: string): string {
  const clean = String(rawType || "").trim().toUpperCase().replace(/^CONSUMABLE_/, "");
  if (clean === "FOAM") return "FOAM_PADS";
  if (clean === "ETHYLENE_SACHETS") return "ETHYLENE_POUCH";
  return clean;
}

function isLegacyWeightOrVolumeUnit(chemKey: string, unit?: string | null): boolean {
  const norm = String(unit || "").trim().toLowerCase();
  if (chemKey === "TILT") {
    return norm !== "ml" && (norm === "l" || norm.startsWith("liter"));
  }
  return norm !== "gm" && norm !== "g" && (norm === "kg" || norm === "kgs" || norm.startsWith("kilogram"));
}

/** Ensure all 4 fixed chemicals exist in ConsumableInventoryStock in base units (gm / ml) */
export async function ensureFixedChemicals(prisma: any): Promise<void> {
  if (!prisma?.consumableInventoryStock) return;

  const candidateKeys = [
    ...FIXED_CHEMICAL_KEYS,
    ...FIXED_CHEMICAL_KEYS.map((k) => `CONSUMABLE_${k}`),
  ];
  const existingRows: Array<{
    id: string;
    itemType: string;
    availableStock: number;
    issuedStock: number;
    unit: string;
  }> = await prisma.consumableInventoryStock.findMany({
    where: { itemType: { in: candidateKeys } },
  });

  const byType = new Map(existingRows.map((r) => [r.itemType, r]));

  for (const key of FIXED_CHEMICAL_KEYS) {
    const meta = CHEMICAL_CONFIG[key];
    const direct = byType.get(key);
    const legacy = byType.get(`CONSUMABLE_${key}`);

    if (!direct && !legacy) {
      await prisma.consumableInventoryStock.create({
        data: {
          itemType: key,
          availableStock: 0,
          issuedStock: 0,
          unit: meta.baseUnit,
        },
      });
      continue;
    }

    if (direct) {
      let avail = direct.availableStock || 0;
      let issued = direct.issuedStock || 0;
      let changed = false;

      if (isLegacyWeightOrVolumeUnit(key, direct.unit)) {
        avail = Math.round(avail * 1000);
        issued = Math.round(issued * 1000);
        changed = true;
      }
      if (direct.unit !== meta.baseUnit) {
        changed = true;
      }

      if (legacy) {
        const legacyAvail = isLegacyWeightOrVolumeUnit(key, legacy.unit)
          ? Math.round((legacy.availableStock || 0) * 1000)
          : legacy.availableStock || 0;
        const legacyIssued = isLegacyWeightOrVolumeUnit(key, legacy.unit)
          ? Math.round((legacy.issuedStock || 0) * 1000)
          : legacy.issuedStock || 0;
        avail += legacyAvail;
        issued += legacyIssued;
        changed = true;
        await prisma.consumableInventoryStock.delete({ where: { id: legacy.id } });
      }

      if (changed) {
        await prisma.consumableInventoryStock.update({
          where: { id: direct.id },
          data: {
            availableStock: avail,
            issuedStock: issued,
            unit: meta.baseUnit,
          },
        });
      }
    } else if (legacy) {
      const converted = isLegacyWeightOrVolumeUnit(key, legacy.unit);
      await prisma.consumableInventoryStock.create({
        data: {
          itemType: key,
          availableStock: converted ? Math.round((legacy.availableStock || 0) * 1000) : legacy.availableStock || 0,
          issuedStock: converted ? Math.round((legacy.issuedStock || 0) * 1000) : legacy.issuedStock || 0,
          unit: meta.baseUnit,
        },
      });
      await prisma.consumableInventoryStock.delete({ where: { id: legacy.id } });
    }
  }
}

/** Build the complete list of consumable + chemical inventory deductions for a harvest task */
export function buildHarvestConsumableDeductions(input: HarvestConsumableInput): ConsumableDeductionItem[] {
  const counts = (input.requiredBoxCounts || {}) as Partial<Record<BoxType, number>>;
  const plan = calculateBundlePlan(counts);

  const computedBagsRaw =
    input.bagsKg !== undefined && input.bagsKg !== null
      ? Number(input.bagsKg)
      : calculateBagsKg(counts);
  const computedBagsKg = computedBagsRaw > 0 ? Math.max(1, Math.round(computedBagsRaw)) : 0;

  const computedGermRaw =
    input.germinationPaperPcs !== undefined && input.germinationPaperPcs !== null
      ? Number(input.germinationPaperPcs)
      : calculateGerminationPaperKg(counts);
  const computedGermKg = computedGermRaw > 0 ? Math.max(1, Math.round(computedGermRaw)) : 0;

  const computedEthylenePouches =
    input.ethylenePacksCount !== undefined && input.ethylenePacksCount !== null
      ? Math.round(Number(input.ethylenePacksCount))
      : Math.ceil((Number(input.targetRequiredBoxes) || plan.totalBoxes) / 100);

  const deductions: ConsumableDeductionItem[] = [
    { itemType: "TOP_BUNDLE", qty: Math.round(plan.topBundles || 0), unit: "bundles (25 tops each)" },
    { itemType: "BOTTOM_BUNDLE", qty: Math.round(plan.bottomBundles || 0), unit: "bundles (20 bottoms each)" },
    { itemType: "BOX_BUNDLE_16KG", qty: Math.round(plan.completeBundles || 0), unit: "bundles (10 complete boxes each)" },
    { itemType: "FAVILOC", qty: Math.round(Number(input.favilocPackets) || 0), unit: "packets (1 kg each)" },
    { itemType: "RUBBER", qty: Math.round(Number(input.rubberPackets) || 0), unit: "packets" },
    { itemType: "ETHYLENE_POUCH", qty: Math.max(0, computedEthylenePouches), unit: "pouches (100 pcs each)" },
    { itemType: "GERMINATION_PAPER", qty: computedGermKg, unit: "kg" },
    { itemType: "BAGS", qty: computedBagsKg, unit: "kg" },
    { itemType: "FOAM_PADS", qty: Math.round(Number(input.foamUnit) || 0), unit: "units" },
  ];

  if (input.hasChemicalTreatment !== false && Array.isArray(input.chemicals)) {
    const seenChems = new Set<string>();
    for (const rawChem of input.chemicals) {
      const chemKey = normalizeChemicalKey(rawChem);
      if (!chemKey || seenChems.has(chemKey)) continue;
      seenChems.add(chemKey);

      const rawQty =
        input.chemicalQuantities?.[chemKey] ??
        input.chemicalQuantities?.[rawChem] ??
        CHEMICAL_CONFIG[chemKey].standardUsageLabel;
      const baseQty = parseChemicalUsageToBase(chemKey, rawQty);
      if (baseQty > 0) {
        deductions.push({
          itemType: chemKey,
          qty: baseQty,
          unit: CHEMICAL_CONFIG[chemKey].baseUnit,
        });
      }
    }
  }

  return deductions.filter((d) => d.qty > 0);
}

/** Deduct consumables and fixed chemicals safely in ConsumableInventoryStock */
export async function deductConsumableStock(
  prisma: any,
  deductions: ConsumableDeductionItem[]
): Promise<void> {
  if (!prisma?.consumableInventoryStock || deductions.length === 0) return;

  if (deductions.some((d) => isChemicalItem(d.itemType))) {
    await ensureFixedChemicals(prisma);
  }

  for (const item of deductions) {
    const key = normalizeConsumableItemType(item.itemType);
    const qty = Math.round(Number(item.qty) || 0);
    if (!key || qty <= 0) continue;

    const existing = await prisma.consumableInventoryStock.findUnique({
      where: { itemType: key },
    });

    if (existing) {
      await prisma.consumableInventoryStock.update({
        where: { itemType: key },
        data: {
          availableStock: Math.max(0, (existing.availableStock || 0) - qty),
          issuedStock: (existing.issuedStock || 0) + qty,
        },
      });
    } else {
      await prisma.consumableInventoryStock.create({
        data: {
          itemType: key,
          availableStock: 0,
          issuedStock: qty,
          unit: item.unit || "units",
        },
      });
    }
  }
}

