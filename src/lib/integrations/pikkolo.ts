import "server-only";
import { getSetting } from "../settings";

/**
 * Pikkoló tenging.
 * Heimildir:
 *  - Skjölun frá Pikkoló ("Skjölun - Pikkoló - Fincafresh.pdf"): POST/GET/PUT /orders, POST /orders/{id}/cancel,
 *    GET /stations/available, haus "x-api-key".
 *  - Opinbera SDK-ið (https://qr.pikkolo.is/sdk/pikkolo-sdk.min.js): notar api.pikkolo.is (production) og
 *    api-staging.pikkolo.is (staging), hausinn "x-vendor-id" fyrir stöðvaleit og hash-fallið hér að neðan.
 */

export type PikkoloDeliveryTime = { id: string; available: boolean; date: string };
export type PikkoloStation = {
  id: string;
  name: string;
  address: { street: string; postalCode: string; city: string; countryCode?: string };
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  googleMapsLink?: string;
  nextAvailableDeliveryTime?: PikkoloDeliveryTime;
  deliveryTimes: PikkoloDeliveryTime[];
};

export async function pikkoloConfig() {
  const environment = (await getSetting("pikkolo.environment")) === "production" ? "production" : "staging";
  const vendorId = await getSetting("pikkolo.vendorId");
  const apiKey = await getSetting("pikkolo.apiKey");
  const baseUrl = environment === "production" ? "https://api.pikkolo.is/api/public/v1" : "https://api-staging.pikkolo.is/api/public/v1";
  return { environment, vendorId, apiKey, baseUrl, canSearch: !!vendorId, canSubmit: !!vendorId && !!apiKey };
}

/** Sama hash-fall og í SDK-inu (pikkoloHashEmail / pikkoloHashPhoneNumber) */
export function pikkoloHash(value: string): string {
  const e = value.replace(/ /g, "");
  let t = 0;
  for (let o = 0; o < e.length; o++) {
    t = (t << 5) - t + e.charCodeAt(o);
    t |= 0;
  }
  return Buffer.from(t.toString(16)).toString("base64");
}

export async function getAvailableStations(input: {
  postalCode: string;
  city: string;
  street?: string;
  email?: string;
  phone?: string;
  refrigerated: number;
  frozen?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
}): Promise<{ stations: PikkoloStation[]; best?: PikkoloStation; error?: string }> {
  const cfg = await pikkoloConfig();
  if (!cfg.vendorId) return { stations: [], error: "Pikkoló er ekki tengt (vantar Vendor ID)." };
  const params = new URLSearchParams({
    nrOfRefrigeratedItems: String(Math.max(1, input.refrigerated)),
    nrOfFrozenItems: String(input.frozen ?? 0),
    countryCode: "IS",
    city: input.city || "Reykjavík",
    postalCode: input.postalCode || "101",
    street: input.street || "",
    // API-ið krefst emailHash; ef netfang er ekki komið notum við hlutlaust gildi
    emailHash: pikkoloHash((input.email || "gestur@fincafresh.is").toLowerCase()),
    phoneNumberHash: pikkoloHash(input.phone || "+3540000000"),
  });
  if (input.startDate) params.set("startDate", input.startDate);
  if (input.endDate) params.set("endDate", input.endDate);
  try {
    const res = await fetch(`${cfg.baseUrl}/stations/available?${params}`, {
      headers: { "content-type": "application/json", "x-vendor-id": cfg.vendorId },
      cache: "no-store",
    });
    if (!res.ok) return { stations: [], error: `Pikkoló svaraði ${res.status}` };
    const json = (await res.json()) as { data?: { stations?: PikkoloStation[]; bestAvailableStation?: PikkoloStation } };
    return { stations: json.data?.stations ?? [], best: json.data?.bestAvailableStation };
  } catch (e) {
    return { stations: [], error: "Náði ekki sambandi við Pikkoló." };
  }
}

async function call(method: string, path: string, body?: unknown) {
  const cfg = await pikkoloConfig();
  if (!cfg.apiKey) throw new Error("Pikkoló API-lykil vantar. Settu hann inn undir Tengingar.");
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: { "x-api-key": cfg.apiKey, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) throw new Error(`Pikkoló villa ${res.status}: ${typeof json === "string" ? json : JSON.stringify(json)}`);
  return json as { data?: Record<string, unknown> } & Record<string, unknown>;
}

export type PikkoloOrderInput = {
  vendorOrderId: string;
  stationId: string;
  deliveryTimeId: string;
  customerPhone: string;
  customerEmail: string;
  customerName: string;
  customerNationalId?: string;
  isSubscription: boolean;
  items: { barcode: string; description: string; type: "Refrigerated" | "Frozen"; lineItems?: { sku: string; name: string; quantity: number; unitPrice?: number }[] }[];
};

export async function createPikkoloOrder(o: PikkoloOrderInput) {
  const res = await call("POST", "/orders", o);
  const data = (res.data ?? res) as Record<string, unknown>;
  return { id: String(data.id ?? data.orderId ?? ""), status: String(data.status ?? "CREATED"), raw: data };
}

export async function getPikkoloOrder(id: string) {
  const res = await call("GET", `/orders/${encodeURIComponent(id)}`);
  const data = (res.data ?? res) as Record<string, unknown>;
  return { id, status: String(data.status ?? ""), raw: data };
}

export async function cancelPikkoloOrder(id: string) {
  await call("POST", `/orders/${encodeURIComponent(id)}/cancel`);
}

export async function listPikkoloOrders(page = 1) {
  const res = await call("GET", `/orders?page=${page}&orderBy=deliveryDate:desc`);
  return res;
}
