import { ChemicalOption } from "@/types";

export interface ChemicalMeta {
  key: ChemicalOption;
  label: string;
  type: "LIQUID" | "SOLID";
  baseUnit: "ml" | "gm";
  standardUsageNumber: number; // in base units: Tilt = 200 ml, C_Chem = 50 gm, Turti = 2000 gm, Bavistin = 1000 gm
  standardUsageLabel: string; // "200 ml", "50 gm", "2 kg", "1 kg"
  allowedInputUnits: Array<"ml" | "L" | "gm" | "kg">;
}

export const CHEMICAL_CONFIG: Record<ChemicalOption, ChemicalMeta> = {
  C_CHEMICAL: {
    key: "C_CHEMICAL",
    label: "C Chemical",
    type: "SOLID",
    baseUnit: "gm",
    standardUsageNumber: 50,
    standardUsageLabel: "50 gm",
    allowedInputUnits: ["gm", "kg"],
  },
  TURTI: {
    key: "TURTI",
    label: "Turti",
    type: "SOLID",
    baseUnit: "gm",
    standardUsageNumber: 2000,
    standardUsageLabel: "2 kg",
    allowedInputUnits: ["kg", "gm"],
  },
  TILT: {
    key: "TILT",
    label: "Tilt",
    type: "LIQUID",
    baseUnit: "ml",
    standardUsageNumber: 200,
    standardUsageLabel: "200 ml",
    allowedInputUnits: ["L", "ml"],
  },
  BAVISTIN: {
    key: "BAVISTIN",
    label: "Bavistin",
    type: "SOLID",
    baseUnit: "gm",
    standardUsageNumber: 1000,
    standardUsageLabel: "1 kg",
    allowedInputUnits: ["kg", "gm"],
  },
};

export const FIXED_CHEMICAL_KEYS: ChemicalOption[] = ["C_CHEMICAL", "TURTI", "TILT", "BAVISTIN"];

export function normalizeChemicalKey(itemType: string): ChemicalOption | null {
  const clean = String(itemType || "").trim().toUpperCase().replace(/^CONSUMABLE_/, "") as ChemicalOption;
  return FIXED_CHEMICAL_KEYS.includes(clean) ? clean : null;
}

export function isChemicalItem(itemType: string): boolean {
  return normalizeChemicalKey(itemType) !== null;
}

export function getDefaultInputUnit(chemKey: string): "L" | "ml" | "kg" | "gm" {
  const clean = normalizeChemicalKey(chemKey);
  if (clean === "TILT") return "L";
  if (clean === "C_CHEMICAL") return "gm";
  return "kg";
}

/** Convert user input quantity + unit to base integer units (ml or gm) */
export function convertChemicalToBase(chemKey: string, amount: number, unit: string): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const normUnit = (unit || "").trim().toLowerCase();
  const clean = normalizeChemicalKey(chemKey);
  if (clean === "TILT") {
    if (normUnit === "l" || normUnit === "liters" || normUnit === "liter") {
      return Math.round(amount * 1000);
    }
    return Math.round(amount);
  }
  // Solids: C_CHEMICAL, TURTI, BAVISTIN
  if (normUnit === "kg" || normUnit === "kgs" || normUnit === "kilogram" || normUnit === "kilograms") {
    return Math.round(amount * 1000);
  }
  return Math.round(amount);
}

/** Parse quantity string (e.g. "50 gm", "2 kg", "200 ml") to base integer units */
export function parseChemicalUsageToBase(chemKey: string, rawVal?: string | null): number {
  const cleanKey = normalizeChemicalKey(chemKey);
  if (!cleanKey) return 0;
  if (!rawVal) {
    return CHEMICAL_CONFIG[cleanKey]?.standardUsageNumber ?? 0;
  }
  const str = String(rawVal).trim().toLowerCase();
  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) {
    return CHEMICAL_CONFIG[cleanKey]?.standardUsageNumber ?? 0;
  }
  if (str.includes("kg") || str.includes("kilogram")) return Math.round(num * 1000);
  if (str.includes("ml")) return Math.round(num);
  if (str.includes("l")) return Math.round(num * 1000);
  if (str.includes("gm") || str.includes("g")) return Math.round(num);

  // If bare number entered without unit:
  if (cleanKey === "TILT") {
    return num < 10 ? Math.round(num * 1000) : Math.round(num);
  }
  if (cleanKey === "TURTI" || cleanKey === "BAVISTIN") {
    return num <= 50 ? Math.round(num * 1000) : Math.round(num);
  }
  return Math.round(num);
}

/** Format chemical stock for UI display */
export function formatChemicalStock(chemKey: string, amount: number): string {
  const clean = normalizeChemicalKey(chemKey);
  const safe = Math.max(0, Math.round(Number(amount) || 0));
  if (clean === "TILT") {
    if (safe >= 1000) {
      const l = (safe / 1000).toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1");
      return `${l} L (${safe.toLocaleString()} ml)`;
    }
    return `${safe.toLocaleString()} ml`;
  }
  // Solids
  if (safe >= 1000) {
    const kg = (safe / 1000).toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1");
    return `${kg} kg (${safe.toLocaleString()} gm)`;
  }
  return `${safe.toLocaleString()} gm`;
}

/** Format usage label (compact, e.g. "200 ml", "50 gm", "2 kg", "1 kg") */
export function formatChemicalUsageLabel(chemKey: string, baseAmount: number): string {
  const clean = normalizeChemicalKey(chemKey);
  const safe = Math.max(0, Math.round(Number(baseAmount) || 0));
  if (clean === "TILT") {
    if (safe >= 1000) {
      const l = (safe / 1000).toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1");
      return `${l} L`;
    }
    return `${safe} ml`;
  }
  if (safe >= 1000) {
    const kg = (safe / 1000).toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1");
    return `${kg} kg`;
  }
  return `${safe} gm`;
}
