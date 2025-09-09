import axios from "axios";

export interface VcbRate {
  code: string;
  name: string;
  buy: number | null;
  transfer: number | null;
  sell: number | null;
}

const VCB_JSON_URL = "/.netlify/functions/vcb";

export function parseNumberSafe(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).trim().replace(/\./g, "").replace(/,/g, ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumber(value: string | number | null): string | null {
  if (value === null || value === undefined) return null;

  let num: number;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    num = value;
  } else {
    let s = value.trim();

    // Remove currency symbols/letters/spaces but keep digits, dot, comma, minus
    s = s.replace(/[^\d.,-]/g, "");

    if (!s || s === "-" || s === "." || s === ",") return null;

    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");

    if (lastDot !== -1 && lastComma !== -1) {
      // both present -> the later one is the decimal separator
      if (lastComma > lastDot) {
        // comma is decimal: remove dots (thousands) and convert comma -> dot
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        // dot is decimal: remove commas (thousands)
        s = s.replace(/,/g, "");
      }
    } else if (lastComma !== -1) {
      const decimals = s.length - lastComma - 1;
      if (decimals <= 2) {
        s = s.replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (lastDot !== -1) {
      const decimals = s.length - lastDot - 1;
      if (decimals <= 2) {
        // dot is decimal, leave it
      } else {
        s = s.replace(/\./g, "");
      }
    }

    const parsed = Number(s);
    if (!Number.isFinite(parsed)) return null;
    num = parsed;
  }

  // Format with grouping (dot) + decimal comma
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function normalizeItem(item: any): VcbRate {
  return {
    code: String(item.code || ""),
    name: String(item.name || ""),
    buy: parseNumberSafe(item.buy),
    transfer: parseNumberSafe(item.transfer),
    sell: parseNumberSafe(item.sell),
  };
}

export async function fetchVcbRates(): Promise<VcbRate[]> {
  try {
    const res = await axios.get(VCB_JSON_URL, { responseType: "json" });
    const payload = res.data;

    if (!Array.isArray(payload)) {
      console.error("Expected array from VCB API, got:", payload);
      return [];
    }

    return payload.map(normalizeItem).filter((item) => item.code && item.name);
  } catch (error) {
    console.error("Failed to fetch VCB rates:", error);
    return [];
  }
}
