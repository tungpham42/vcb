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

export function parseNumberSafeVN(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  const str = String(value).trim();

  // Remove thousand separators (commas)
  const noThousand = str.replace(/,/g, "");

  // Parse normally (JS expects dot as decimal separator)
  const parsed = Number(noThousand);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeItem(item: any): VcbRate {
  return {
    code: String(item.code || ""),
    name: String(item.name || ""),
    buy: parseNumberSafeVN(item.buy),
    transfer: parseNumberSafeVN(item.transfer),
    sell: parseNumberSafeVN(item.sell),
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
