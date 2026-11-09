export const DEFAULT_OFFICE_NUMBER = "+91 94220 00000";

export interface HarvestWorkOrderSMSParams {
  farmerName: string;
  farmerPhone?: string;
  farmerAddress?: string;
  tonnage?: number | string;
  quality?: string;
  supervisorName?: string;
  supervisorPhone?: string;
  labourTeam: string;
  labourTeamPhone: string;
  vehicleNumber?: string;
  vehicleSupplierName?: string;
  driverName?: string;
  driverPhone?: string;
  brandBoxCounts?: Record<string, Partial<Record<string, number>>>;
  requiredBoxCounts?: Partial<Record<string, number>>;
  totalBoxes?: number;
  topBundles?: number;
  bottomBundles?: number;
  completeBundles?: number;
  totalBundles?: number;
  favilocPackets?: number;
  rubberPackets?: number;
  foamUnit?: number;
  hasChemicalTreatment?: boolean;
  chemicals?: string[];
  chemicalQuantities?: Partial<Record<string, string>>;
  officeNumber?: string;
}

/**
 * Builds the complete text message containing the entire filled Schedule & Harvest form
 * to send to the labour contractor / squad leader.
 */
export function formatHarvestWorkOrderSMS(data: HarvestWorkOrderSMSParams): string {
  const officeNo = data.officeNumber || DEFAULT_OFFICE_NUMBER;
  const lines: string[] = [];

  lines.push("🌾 KIRAN DOKE FRUITS — HARVEST WORK ORDER 🌾");
  lines.push(`Date: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}`);
  lines.push("--------------------------------");
  lines.push(`👨‍🌾 FARMER: ${data.farmerName}`);
  if (data.farmerPhone) lines.push(`📞 Phone: ${data.farmerPhone}`);
  if (data.farmerAddress) lines.push(`📍 Farm Location: ${data.farmerAddress}`);
  if (data.tonnage) lines.push(`⚖️ Yield: ${data.tonnage} Tons (${data.quality || "Standard"} Grade)`);

  lines.push("");
  lines.push(`👷 SUPERVISOR: ${data.supervisorName || "Assigned Supervisor"}`);
  if (data.supervisorPhone) lines.push(`📞 Supervisor Ph: ${data.supervisorPhone}`);

  lines.push("");
  lines.push(`👥 LABOUR SQUAD: ${data.labourTeam}`);
  lines.push(`📱 Leader Mobile: ${data.labourTeamPhone}`);

  lines.push("");
  lines.push("📦 BOX REQUIREMENTS:");
  if (data.brandBoxCounts && Object.keys(data.brandBoxCounts).length > 0) {
    for (const [brand, counts] of Object.entries(data.brandBoxCounts)) {
      const parts: string[] = [];
      for (const [bt, n] of Object.entries(counts || {})) {
        if (Number(n) > 0) parts.push(`${bt}: ${n}`);
      }
      if (parts.length > 0) {
        lines.push(`• ${brand}: ${parts.join(", ")}`);
      }
    }
  } else if (data.requiredBoxCounts) {
    for (const [bt, n] of Object.entries(data.requiredBoxCounts)) {
      if (Number(n) > 0) lines.push(`• ${bt}: ${n} boxes`);
    }
  }
  lines.push(`Total Boxes: ${data.totalBoxes || 0} boxes`);

  if (data.totalBundles && data.totalBundles > 0) {
    lines.push("");
    lines.push("📦 BUNDLE PICKUP PLAN:");
    if (data.topBundles && data.topBundles > 0) lines.push(`• Top Bundles: ${data.topBundles} (25/bundle)`);
    if (data.bottomBundles && data.bottomBundles > 0) lines.push(`• Bottom Bundles: ${data.bottomBundles} (20/bundle)`);
    if (data.completeBundles && data.completeBundles > 0) lines.push(`• 16KG Bundles: ${data.completeBundles} (10/bundle)`);
    lines.push(`• Total Bundles: ${data.totalBundles}`);
  }

  lines.push("");
  lines.push("🚚 LOGISTICS & VEHICLE:");
  lines.push(`• Vehicle: ${data.vehicleNumber || "Assigned Truck"} ${data.vehicleSupplierName ? `(${data.vehicleSupplierName})` : ""}`);
  if (data.driverName) lines.push(`• Driver: ${data.driverName} (${data.driverPhone || "N/A"})`);

  lines.push("");
  lines.push("🧪 POST-HARVEST TREATMENT:");
  if (data.hasChemicalTreatment && data.chemicals && data.chemicals.length > 0) {
    lines.push("• Treatment: Required");
    for (const c of data.chemicals) {
      const qty = data.chemicalQuantities?.[c] || "Standard";
      lines.push(`  - ${c.replace(/_/g, " ")}: ${qty}`);
    }
  } else {
    lines.push("• Treatment: None Required");
  }

  lines.push("--------------------------------");
  lines.push(`🏢 Sent from Office Dispatch Line: ${officeNo}`);
  lines.push("Please acknowledge arrival on farm upon start of cutting.");

  return lines.join("\n");
}
