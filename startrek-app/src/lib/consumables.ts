import {
  BoxType,
  calculateBagsKg,
  calculateBundlePlan,
  calculateGerminationPaperKg,
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
  ethylenePacksCount?: number | null;
  germinationPaperPcs?: number | null;
  bagsKg?: number | null;
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
  ETHYLENE_POUCH: "Ethylene Pouch (100 pcs each)",
  GERMINATION_PAPER: "Germination Paper (Kg)",
  FAVILOC: "Faviloc (1 kg packets)",
  RUBBER: "Rubber (Packets)",
  BAGS: "Packing Bags (Kg)",
  TOP_BUNDLE: "Top Bundles (25 tops each)",
  BOTTOM_BUNDLE: "Bottom Bundles (20 bottoms each)",
  BOX_BUNDLE_16KG: "16KG Complete-Box Bundles (10 each)",
};

export const STANDARD_CONSUMABLE_UNITS: Record<string, string> = {
  FOAM_PADS: "units",
  ETHYLENE_POUCH: "pouches (100 pcs each)",
  GERMINATION_PAPER: "kg",
  FAVILOC: "packets (1 kg each)",
  RUBBER: "packets",
  BAGS: "kg",
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
  "ETHYLENE_POUCH",
  "GERMINATION_PAPER",
  "BAGS",
  "FOAM_PADS",
]);

export const KG_CONSUMABLE_KEYS = new Set<string>(["GERMINATION_PAPER", "BAGS"]);

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

/** Clean obsolete consumables (corner guards) and enforce kg unit for germination paper & bags */
export async function ensureStandardConsumables(prisma: any): Promise<void> {
  await ensureFixedChemicals(prisma);
  if (!prisma?.consumableInventoryStock) return;

  // Remove obsolete Pallet Corner Guards entries
  if (typeof prisma.consumableInventoryStock.deleteMany === "function") {
    await prisma.consumableInventoryStock.deleteMany({
      where: { itemType: { in: ["CORNER_GUARDS", "CONSUMABLE_CORNER_GUARDS"] } },
    });
  }

  // Normalize Germination Paper and Bags units to "kg"
  const kgRows = await prisma.consumableInventoryStock.findMany({
    where: { itemType: { in: ["GERMINATION_PAPER", "BAGS"] } },
  });
  for (const row of kgRows) {
    if (String(row.unit || "").trim().toLowerCase() !== "kg") {
      await prisma.consumableInventoryStock.update({
        where: { id: row.id },
        data: { unit: "kg" },
      });
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
  const computedBagsKg = computedBagsRaw > 0 ? roundStockQty(computedBagsRaw) : 0;

  const computedGermRaw =
    input.germinationPaperPcs !== undefined && input.germinationPaperPcs !== null
      ? Number(input.germinationPaperPcs)
      : calculateGerminationPaperKg(counts);
  const computedGermKg = computedGermRaw > 0 ? roundStockQty(computedGermRaw) : 0;

  const computedEthylenePouches =
    input.ethylenePacksCount !== undefined && input.ethylenePacksCount !== null
      ? Math.round(Number(input.ethylenePacksCount))
      : Math.ceil((Number(input.targetRequiredBoxes) || plan.totalBoxes) / 100);

  const deductions: ConsumableDeductionItem[] = [
    { itemType: "TOP_BUNDLE", qty: Math.round(plan.topBundles || 0), unit: STANDARD_CONSUMABLE_UNITS.TOP_BUNDLE },
    { itemType: "BOTTOM_BUNDLE", qty: Math.round(plan.bottomBundles || 0), unit: STANDARD_CONSUMABLE_UNITS.BOTTOM_BUNDLE },
    { itemType: "BOX_BUNDLE_16KG", qty: Math.round(plan.completeBundles || 0), unit: STANDARD_CONSUMABLE_UNITS.BOX_BUNDLE_16KG },
    { itemType: "FAVILOC", qty: Math.round(Number(input.favilocPackets) || 0), unit: STANDARD_CONSUMABLE_UNITS.FAVILOC },
    { itemType: "RUBBER", qty: Math.round(Number(input.rubberPackets) || 0), unit: STANDARD_CONSUMABLE_UNITS.RUBBER },
    { itemType: "ETHYLENE_POUCH", qty: Math.max(0, computedEthylenePouches), unit: STANDARD_CONSUMABLE_UNITS.ETHYLENE_POUCH },
    { itemType: "GERMINATION_PAPER", qty: computedGermKg, unit: "kg" },
    { itemType: "BAGS", qty: computedBagsKg, unit: "kg" },
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

