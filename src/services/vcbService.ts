import axios from "axios";

export interface VcbRate {
  code: string;
  name: string;
  buy: number | null;
  transfer: number | null;
  sell: number | null;
}

const VCB_JSON_URL = "/.netlify/functions/vcb";

export function parseNumberSafe(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
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
