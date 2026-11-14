import {
  BoxType,
  calculateBagsKg,
  calculateBags7KgKg,
  calculateBags13KgKg,
  calculateBundlePlan,
  ExtraConsumableItem,
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
  bagsKg7?: number | null;
  bagsKg13?: number | null;
  germEthylenePaperSheets?: number | null;
  foamUnit?: number | null;
  extraConsumables?: ExtraConsumableItem[] | null;
  hasChemicalTreatment?: boolean | null;
  chemicals?: string[] | null;
  chemicalQuantities?: Record<string, string> | null;
}

export const STANDARD_CONSUMABLE_LABELS: Record<string, string> = {
  C_CHEMICAL: "C Chemical",
  TURTI: "Turti",
  TILT: "Tilt",
  BAVISTIN: "Bavistin",
  FOAM_PADS: "Foam",
  GERM_ETHYLENE_PAPER: "Germination Paper / Ethylene Pouch",
  FAVILOC: "Faviloc (1 kg packets)",
  RUBBER: "Rubber (Packets)",
  BAGS_7KG: "7KG Packing Bags",
  BAGS_13KG: "13KG Packing Bags",
  TOP_BUNDLE: "Top Bundles (25 tops each)",
  BOTTOM_BUNDLE: "Bottom Bundles (20 bottoms each)",
  BOX_BUNDLE_16KG: "16KG Complete-Box Bundles (10 each)",
};

export const STANDARD_CONSUMABLE_UNITS: Record<string, string> = {
  FOAM_PADS: "units",
  GERM_ETHYLENE_PAPER: "sheets",
  FAVILOC: "packets (1 kg each)",
  RUBBER: "packets",
  BAGS_7KG: "kg",
  BAGS_13KG: "kg",
  TOP_BUNDLE: "bundles (25 tops each)",
  BOTTOM_BUNDLE: "bundles (20 bottoms each)",
  BOX_BUNDLE_16KG: "bundles (10 complete boxes each)",
};

export const CORE_HARVEST_PACKING_KEYS = new Set<string>([
  "TOP_BUNDLE",
  "BOTTOM_BUNDLE",
  "BOX_BUNDLE_16KG",
  "FAVILOC",
  "RUBBER",
  "GERM_ETHYLENE_PAPER",
  "BAGS_7KG",
  "BAGS_13KG",
  "FOAM_PADS",
]);

export const KG_CONSUMABLE_KEYS = new Set<string>(["BAGS_7KG", "BAGS_13KG"]);

export const SHEETS_PER_BOX = 350;

export function roundStockQty(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function isKgConsumable(itemType: string, unit?: string | null): boolean {
  const clean = normalizeConsumableItemType(itemType);
  if (KG_CONSUMABLE_KEYS.has(clean)) return true;
  const normUnit = String(unit || "").trim().toLowerCase();
  return normUnit === "kg" || normUnit === "kgs" || normUnit === "kilogram" || normUnit === "kilograms";
}

export function convertKgConsumableInput(amount: number, inputUnit?: string | null): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const normUnit = String(inputUnit || "kg").trim().toLowerCase();
  if (normUnit === "gm" || normUnit === "g" || normUnit === "grams" || normUnit === "gram") {
    return roundStockQty(amount / 1000);
  }
  return roundStockQty(amount);
}

export function formatConsumableLabel(itemType: string): string {
  const chemKey = normalizeChemicalKey(itemType);
  if (chemKey) return CHEMICAL_CONFIG[chemKey].label;
  const clean = normalizeConsumableItemType(itemType);
  if (STANDARD_CONSUMABLE_LABELS[clean]) return STANDARD_CONSUMABLE_LABELS[clean];
  return clean
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeExtraConsumables(raw: unknown): ExtraConsumableItem[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, ExtraConsumableItem>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const itemType = normalizeConsumableItemType(String(rec.itemType || rec.label || ""));
    const quantity = roundStockQty(Number(rec.quantity));
    if (!itemType || quantity <= 0) continue;
    const label = String(rec.label || "").trim() || formatConsumableLabel(itemType);
    const unit = String(rec.unit || "").trim() || STANDARD_CONSUMABLE_UNITS[itemType] || "units";
    const prev = merged.get(itemType);
    merged.set(itemType, {
      itemType,
      label,
      quantity: roundStockQty((prev?.quantity || 0) + quantity),
      unit,
    });
  }
  return Array.from(merged.values());
}

/** Normalize legacy or prefixed consumable itemType names to canonical DB keys */
export function normalizeConsumableItemType(rawType: string): string {
  const clean = String(rawType || "")
    .trim()
    .toUpperCase()
    .replace(/^CONSUMABLE_/, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (clean === "FOAM") return "FOAM_PADS";
  if (clean === "BAGS") return "BAGS_7KG";
  if (
    clean === "ETHYLENE_SACHETS" ||
    clean === "ETHYLENE_POUCH" ||
    clean === "GERMINATION_PAPER" ||
    clean === "GERM_PAPER" ||
    clean === "GERMINATION_ETHYLENE_PAPER"
  ) {
    return "GERM_ETHYLENE_PAPER";
  }
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

/** Clean obsolete consumables and migrate legacy stock to new structure */
export async function ensureStandardConsumables(prisma: any): Promise<void> {
  await ensureFixedChemicals(prisma);
  if (!prisma?.consumableInventoryStock) return;

  // 1. Remove obsolete Pallet Corner Guards entries
  if (typeof prisma.consumableInventoryStock.deleteMany === "function") {
    await prisma.consumableInventoryStock.deleteMany({
      where: { itemType: { in: ["CORNER_GUARDS", "CONSUMABLE_CORNER_GUARDS"] } },
    });
  }

  // 2. Migrate legacy BAGS -> BAGS_7KG and BAGS_13KG
  const legacyBags = await prisma.consumableInventoryStock.findUnique({
    where: { itemType: "BAGS" },
  });
  if (legacyBags) {
    const existing7 = await prisma.consumableInventoryStock.findUnique({ where: { itemType: "BAGS_7KG" } });
    const existing13 = await prisma.consumableInventoryStock.findUnique({ where: { itemType: "BAGS_13KG" } });

    const halfAvail = roundStockQty((legacyBags.availableStock || 0) / 2);
    const halfIssued = roundStockQty((legacyBags.issuedStock || 0) / 2);

    if (!existing7) {
      await prisma.consumableInventoryStock.create({
        data: {
          itemType: "BAGS_7KG",
          availableStock: halfAvail,
          issuedStock: halfIssued,
          unit: "kg",
        },
      });
    }
    if (!existing13) {
      await prisma.consumableInventoryStock.create({
        data: {
          itemType: "BAGS_13KG",
          availableStock: halfAvail,
          issuedStock: halfIssued,
          unit: "kg",
        },
      });
    }
    await prisma.consumableInventoryStock.delete({ where: { id: legacyBags.id } });
  }

  // Ensure BAGS_7KG & BAGS_13KG rows exist
  for (const bagKey of ["BAGS_7KG", "BAGS_13KG"]) {
    const row = await prisma.consumableInventoryStock.findUnique({ where: { itemType: bagKey } });
    if (!row) {
      await prisma.consumableInventoryStock.create({
        data: { itemType: bagKey, availableStock: 0, issuedStock: 0, unit: "kg" },
      });
    } else if (String(row.unit || "").trim().toLowerCase() !== "kg") {
      await prisma.consumableInventoryStock.update({
        where: { id: row.id },
        data: { unit: "kg" },
      });
    }
  }

  // 3. Migrate legacy ETHYLENE_POUCH + GERMINATION_PAPER -> GERM_ETHYLENE_PAPER (sheets)
  const legacyPouch = await prisma.consumableInventoryStock.findUnique({ where: { itemType: "ETHYLENE_POUCH" } });
  const legacyGerm = await prisma.consumableInventoryStock.findUnique({ where: { itemType: "GERMINATION_PAPER" } });
  const existingPaper = await prisma.consumableInventoryStock.findUnique({ where: { itemType: "GERM_ETHYLENE_PAPER" } });

  if (!existingPaper) {
    // If legacy pouch had count, 1 pouch was 100 pcs; or if germination paper had kg, initialize
    const initAvail = Math.round((legacyPouch?.availableStock || 0) * 100);
    const initIssued = Math.round((legacyPouch?.issuedStock || 0) * 100);
    await prisma.consumableInventoryStock.create({
      data: {
        itemType: "GERM_ETHYLENE_PAPER",
        availableStock: initAvail,
        issuedStock: initIssued,
        unit: "sheets",
      },
    });
  } else if (String(existingPaper.unit || "").trim().toLowerCase() !== "sheets") {
    await prisma.consumableInventoryStock.update({
      where: { id: existingPaper.id },
      data: { unit: "sheets" },
    });
  }

  // Clean legacy rows if any still exist
  if (legacyPouch) {
    await prisma.consumableInventoryStock.delete({ where: { id: legacyPouch.id } }).catch(() => {});
  }
  if (legacyGerm) {
    await prisma.consumableInventoryStock.delete({ where: { id: legacyGerm.id } }).catch(() => {});
  }
}

/** Build the complete list of consumable + chemical inventory deductions for a harvest task */
export function buildHarvestConsumableDeductions(input: HarvestConsumableInput): ConsumableDeductionItem[] {
  const counts = (input.requiredBoxCounts || {}) as Partial<Record<BoxType, number>>;
  const plan = calculateBundlePlan(counts);

  const computed7KgBags =
    input.bagsKg7 !== undefined && input.bagsKg7 !== null
      ? roundStockQty(Number(input.bagsKg7))
      : calculateBags7KgKg(counts);

  const computed13KgBags =
    input.bagsKg13 !== undefined && input.bagsKg13 !== null
      ? roundStockQty(Number(input.bagsKg13))
      : calculateBags13KgKg(counts);

  const totalBoxes = Number(input.targetRequiredBoxes) || plan.totalBoxes || 0;
  const computedSheets =
    input.germEthylenePaperSheets !== undefined && input.germEthylenePaperSheets !== null
      ? Math.round(Number(input.germEthylenePaperSheets))
      : Math.max(totalBoxes, Math.ceil(totalBoxes / SHEETS_PER_BOX) * SHEETS_PER_BOX);

  const deductions: ConsumableDeductionItem[] = [
    { itemType: "TOP_BUNDLE", qty: Math.round(plan.topBundles || 0), unit: STANDARD_CONSUMABLE_UNITS.TOP_BUNDLE },
    { itemType: "BOTTOM_BUNDLE", qty: Math.round(plan.bottomBundles || 0), unit: STANDARD_CONSUMABLE_UNITS.BOTTOM_BUNDLE },
    { itemType: "BOX_BUNDLE_16KG", qty: Math.round(plan.completeBundles || 0), unit: STANDARD_CONSUMABLE_UNITS.BOX_BUNDLE_16KG },
    { itemType: "FAVILOC", qty: Math.round(Number(input.favilocPackets) || 0), unit: STANDARD_CONSUMABLE_UNITS.FAVILOC },
    { itemType: "RUBBER", qty: Math.round(Number(input.rubberPackets) || 0), unit: STANDARD_CONSUMABLE_UNITS.RUBBER },
    { itemType: "GERM_ETHYLENE_PAPER", qty: Math.max(0, computedSheets), unit: "sheets" },
    { itemType: "BAGS_7KG", qty: Math.max(0, computed7KgBags), unit: "kg" },
    { itemType: "BAGS_13KG", qty: Math.max(0, computed13KgBags), unit: "kg" },
    { itemType: "FOAM_PADS", qty: Math.round(Number(input.foamUnit) || 0), unit: STANDARD_CONSUMABLE_UNITS.FOAM_PADS },
  ];

  // Append custom/extra consumables synced from inventory & selected during scheduling
  for (const extra of normalizeExtraConsumables(input.extraConsumables)) {
    const existing = deductions.find((d) => d.itemType === extra.itemType);
    if (existing) {
      existing.qty = roundStockQty(existing.qty + extra.quantity);
    } else {
      deductions.push({
        itemType: extra.itemType,
        qty: extra.quantity,
        unit: extra.unit,
      });
    }
  }

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
    const qty = roundStockQty(Number(item.qty) || 0);
    if (!key || qty <= 0) continue;

    const existing = await prisma.consumableInventoryStock.findUnique({
      where: { itemType: key },
    });

    if (existing) {
      await prisma.consumableInventoryStock.update({
        where: { itemType: key },
        data: {
          availableStock: roundStockQty(Math.max(0, (existing.availableStock || 0) - qty)),
          issuedStock: roundStockQty((existing.issuedStock || 0) + qty),
          ...(KG_CONSUMABLE_KEYS.has(key) ? { unit: "kg" } : {}),
          ...(key === "GERM_ETHYLENE_PAPER" ? { unit: "sheets" } : {}),
        },
      });
    } else {
      await prisma.consumableInventoryStock.create({
        data: {
          itemType: key,
          availableStock: 0,
          issuedStock: qty,
          unit: STANDARD_CONSUMABLE_UNITS[key] || item.unit || "units",
        },
      });
    }
  }
}

