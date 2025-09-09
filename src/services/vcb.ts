import axios from "axios";
import { type VcbRateRaw } from "../types";

// Netlify serverless function endpoint
const VCB_XML_URL = "/.netlify/functions/vcb";

export async function fetchVcbRates(): Promise<VcbRateRaw[]> {
  const res = await axios.get(VCB_XML_URL, { responseType: "text" });
  const xml = res.data as string;

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");

  const srows = Array.from(doc.getElementsByTagName("SROW"));

  const rates: VcbRateRaw[] = srows.map((el) => {
    const currency = el.getAttribute("Currency") || "";
    const buy = parseNumberSafe(el.getAttribute("Buy"));
    const transfer = parseNumberSafe(el.getAttribute("Transfer"));
    const sell = parseNumberSafe(el.getAttribute("Sell"));
    return { Currency: currency, Buy: buy, Transfer: transfer, Sell: sell };
  });

  return rates;
}

function parseNumberSafe(v: string | null): number | null {
  if (!v) return null;
  const cleaned = v.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
