import "server-only";
import { getSetting } from "../settings";

/**
 * WooCommerce REST API v3.
 * Heimild: https://woocommerce.github.io/woocommerce-rest-api-docs/
 * Auðkenning með Consumer Key/Secret (HTTP Basic yfir HTTPS).
 */

export async function wooConfig() {
  const url = (await getSetting("woo.url")).replace(/\/+$/, "");
  const key = await getSetting("woo.consumerKey");
  const secret = await getSetting("woo.consumerSecret");
  return { url, key, secret, configured: !!(url && key && secret) };
}

export async function wooFetch<T = unknown>(path: string, init: { method?: string; body?: unknown; query?: Record<string, string | number> } = {}) {
  const cfg = await wooConfig();
  if (!cfg.configured) throw new Error("WooCommerce er ekki tengt. Settu inn slóð og lykla undir Tengingar.");
  const qs = new URLSearchParams(Object.entries(init.query ?? {}).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${cfg.url}/wp-json/wc/v3${path}${qs.size ? "?" + qs : ""}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: "Basic " + Buffer.from(`${cfg.key}:${cfg.secret}`).toString("base64"),
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`WooCommerce svaraði ${res.status}: ${t.slice(0, 300)}`);
  }
  return { data: (await res.json()) as T, totalPages: Number(res.headers.get("x-wp-totalpages") ?? "1") };
}

/** Sækir allar síður af lista (100 í einu) */
export async function wooFetchAll<T>(path: string, query: Record<string, string | number> = {}, maxPages = 50): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data, totalPages } = await wooFetch<T[]>(path, { query: { ...query, per_page: 100, page } });
    out.push(...data);
    if (page >= totalPages || data.length === 0) break;
  }
  return out;
}

export type WooProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  status: string;
  price: string;
  regular_price: string;
  sale_price: string;
  short_description: string;
  description: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  categories: { id: number; name: string; slug: string }[];
  images: { src: string }[];
};

export type WooOrder = {
  id: number;
  number: string;
  status: string;
  date_created_gmt: string;
  total: string;
  shipping_total: string;
  discount_total: string;
  payment_method_title: string;
  customer_id: number;
  customer_note: string;
  billing: { first_name: string; last_name: string; email: string; phone: string; address_1: string; postcode: string; city: string };
  shipping: { first_name: string; last_name: string; address_1: string; postcode: string; city: string };
  line_items: { product_id: number; name: string; sku: string; quantity: number; price: number; total: string }[];
  coupon_lines: { code: string }[];
};

export type WooCustomer = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  billing: { phone: string; address_1: string; postcode: string; city: string };
};

/** Staðfestir undirskrift á WooCommerce webhook (X-WC-Webhook-Signature = base64 HMAC-SHA256) */
export async function verifyWooSignature(rawBody: string, signature: string | null) {
  const secret = await getSetting("woo.webhookSecret");
  if (!secret || !signature) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Íslensk heiti á stöðum í WooCommerce */
export const WOO_STATUS_MAP: Record<string, string> = {
  pending: "NEW",
  processing: "PROCESSING",
  "on-hold": "NEW",
  completed: "DELIVERED",
  cancelled: "CANCELLED",
  refunded: "CANCELLED",
  failed: "CANCELLED",
};
export const OUR_TO_WOO_STATUS: Record<string, string> = {
  NEW: "pending",
  PROCESSING: "processing",
  SHIPPED: "processing",
  DELIVERED: "completed",
  CANCELLED: "cancelled",
};
