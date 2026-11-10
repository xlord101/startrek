/**
 * KD EXPORT — Universal Brand Name Normalization & Cleansing
 *
 * Strips legacy, dirty, or vendor-prefixed strings like:
 * - "Orchard Banana — joy banana" -> "Joy Banana"
 * - "Orchard Banana — Star"       -> "Star"
 * - "Orchid-Joy"                  -> "Joy Banana"
 * - "Orchard Banana 7kg"          -> "Star"
 * - "StarPremium Export Grade"    -> "Star"
 * - "joy banana"                  -> "Joy Banana"
 */
export function cleanBrandName(name?: string | null): string {
  if (!name) return "Joy Banana";
  let s = String(name).trim();

  // 1. Strip leading "Orchard Banana", "Orchid Banana", "Orchard", "Orchid" with any separator (-, —, –, :, |, /, space)
  s = s.replace(/^(Orchard\s*Banana|Orchid\s*Banana|Orchard|Orchid)\s*([-—–:|/]\s*)?/i, "").trim();

  // 2. If only a weight is left (e.g. "7kg", "13kg", "7 kg") or string is empty, normalize to Star
  if (/^(7|13|5|13\.5|16)\s*kg$/i.test(s) || !s) {
    return "Star";
  }

  // 3. Strip trailing weight suffix if present (e.g. "Joy Banana 7kg" -> "Joy Banana")
  s = s.replace(/\s*[-—–(]?\s*(7|13|5|13\.5|16)\s*kg\)?$/i, "").trim();

  // 4. Standardize known company brands
  if (/^joy(\s*banana)?$/i.test(s)) return "Joy Banana";
  if (/^star(\s*premium)?(\s*export\s*grade)?$/i.test(s)) return "Star";
  if (/^sunstar$/i.test(s)) return "Sunstar";
  if (/^new\s*premium$/i.test(s)) return "New Premium";
  if (/^golden\s*sparrow$/i.test(s)) return "Golden Sparrow";
  if (/^green\s*gold(\s*export)?$/i.test(s)) return "Green Gold Export";
  if (/^kiran\s*doke\s*royal$/i.test(s)) return "Kiran Doke Royal";

  // 5. Title Case for any other custom brand names
  return s
    .split(/\s+/)
    .map((word) => {
      if (word.toUpperCase() === word && word.length <= 3) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

