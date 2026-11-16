import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { getSetting } from "./settings";
import { logActivity } from "./activity";
import { OUR_TO_WOO_STATUS, wooConfig, wooFetch } from "./integrations/woocommerce";

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Í undirbúningi",
  PACKING: "Í pökkun",
  SHIPPED: "Lögð af stað",
  DONE: "Lokið",
};

/** Hvaða stöðu pantanir fá þegar sending fær nýja stöðu */
export const DELIVERY_TO_ORDER_STATUS: Record<string, string | null> = {
  PLANNED: null,
  PACKING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DONE: "DELIVERED",
};

export const SOURCE_LABELS: Record<string, string> = {
  WEB: "Vefverslun",
  WOO: "WooCommerce",
  SUBSCRIPTION: "Áskrift",
  ADMIN: "Stjórnborð",
  IMPORT: "Innflutningur",
};

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function daysAgo(n: number) {
  const x = startOfDay();
  x.setDate(x.getDate() - n);
  return x;
}

export function isDemoEmail(email: string) {
  return email.endsWith("@prufa.fincafresh.is");
}

export type OrderFilters = {
  stada?: string;
  greidsla?: string;
  afhending?: string;
  uppruni?: string;
  q?: string;
  sending?: string;
  pikkolo?: string; // "osent" = Pikkoló pantanir sem ekki hafa verið sendar
};

export function orderWhere(f: OrderFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (f.stada) where.status = f.stada;
  if (f.greidsla) where.paymentStatus = f.greidsla;
  if (f.afhending) where.deliveryMethod = f.afhending;
  if (f.uppruni) where.source = f.uppruni;
  if (f.sending) where.deliveryId = f.sending;
  if (f.pikkolo === "osent") {
    where.deliveryMethod = "PIKKOLO";
    where.pikkoloOrderId = "";
    where.status = { notIn: ["CANCELLED", "DELIVERED"] };
  }
  const q = f.q?.trim();
  if (q) {
    const n = Number(q.replace(/^#/, ""));
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q.toLowerCase() } },
      { phone: { contains: q } },
      ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : []),
    ];
  }
  return where;
}

/** Tíðni áskriftar sem texti, t.d. "Í hverri sendingu" */
export async function frequencyLabel(every: number) {
  const list = await getSetting("subscription.frequencies");
  return list.find((f) => f.every === every)?.label ?? `Á ${every}. hverri sendingu`;
}

export async function frequencyMap() {
  const list = await getSetting("subscription.frequencies");
  const map = new Map(list.map((f) => [f.every, f.label]));
  return (every: number) => map.get(every) ?? `Á ${every}. hverri sendingu`;
}

/** Verð áskriftar á hverja sendingu sem hún fær kassa */
export function subPricePerDelivery(s: { unitPrice: number; discountPct: number; quantity: number }) {
  return Math.round((s.unitPrice * (100 - s.discountPct)) / 100) * s.quantity;
}

/**
 * Áætlaðar áskriftartekjur á hverja sendingu: áskrift sem fær kassa í annarri hverri
 * sendingu telur hálf. Mánaðarleg áætlun er aðeins reiknuð ef tíðni sendinga sést í gögnunum.
 */
export async function subscriptionRevenue() {
  const active = await db.subscription.findMany({ where: { status: "ACTIVE" }, select: { unitPrice: true, discountPct: true, quantity: true, everyNthDelivery: true } });
  const perDelivery = active.reduce((s, x) => s + subPricePerDelivery(x) / Math.max(1, x.everyNthDelivery), 0);
  const since = daysAgo(120);
  const deliveries = await db.delivery.findMany({ where: { date: { gte: since } }, orderBy: { date: "asc" }, select: { date: true } });
  let perMonth: number | null = null;
  let deliveriesPerMonth: number | null = null;
  if (deliveries.length >= 2) {
    const first = deliveries[0].date.getTime();
    const last = deliveries[deliveries.length - 1].date.getTime();
    const avgDays = (last - first) / 86400000 / (deliveries.length - 1);
    if (avgDays > 0) {
      deliveriesPerMonth = 30.4 / avgDays;
      perMonth = perDelivery * deliveriesPerMonth;
    }
  }
  return { activeCount: active.length, perDelivery: Math.round(perDelivery), perMonth: perMonth === null ? null : Math.round(perMonth), deliveriesPerMonth };
}

/** Uppfærir stöðu í WooCommerce ef pöntunin kom þaðan og WooCommerce er tengt */
export async function pushWooStatus(order: { wooId: number | null; number: number; status: string }) {
  if (!order.wooId) return;
  const cfg = await wooConfig();
  if (!cfg.configured) return;
  const status = OUR_TO_WOO_STATUS[order.status];
  if (!status) return;
  try {
    await wooFetch(`/orders/${order.wooId}`, { method: "PUT", body: { status } });
    await logActivity("integration", `WooCommerce: staða pöntunar #${order.number} uppfærð`, "success");
  } catch (e) {
    await logActivity("integration", `WooCommerce: tókst ekki að uppfæra #${order.number}: ${(e as Error).message}`, "error");
  }
}

// ── Sendingar: pökkunarlisti og innkaupaáætlun ──────────────────

type BoxCount = { productId: string; name: string; tier: string | null; weightLabel: string; single: number; sub: number; total: number };

/** Kílóafjöldi úr texta eins og "2,5 kg" (null ef ekki finnst tala) */
export function parseKg(label: string): number | null {
  const m = label.match(/([\d]+(?:[.,]\d+)?)\s*kg/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

/** Áskriftir sem fá pöntun ef "Búa til áskriftarpantanir" er keyrt (prufukeyrsla, breytir engu) */
export async function dueSubscriptions(deliveryId: string, deliveryDate: Date) {
  const subs = await db.subscription.findMany({ where: { status: { in: ["ACTIVE", "PAUSED"] } }, include: { product: true } });
  // Sama skrá og generateSubscriptionOrders notar: áskriftir sem þegar hefur verið ákveðið að sleppi þessari sendingu
  const ledger = await db.setting.findUnique({ where: { key: `subgen.${deliveryId}` } });
  const handledIds = new Set<string>(ledger ? (JSON.parse(ledger.value) as string[]) : []);
  const due: typeof subs = [];
  let skipped = 0, paused = 0, notDue = 0, already = 0;
  for (const s of subs) {
    if (s.status === "PAUSED" && !(s.pausedUntil && s.pausedUntil <= deliveryDate)) { paused++; continue; }
    const exists = await db.order.findFirst({
      where: {
        deliveryId,
        status: { not: "CANCELLED" },
        OR: [{ subscriptionId: s.id }, { customerId: s.customerId, items: { some: { productId: s.productId, isSubscription: true } } }],
      },
      select: { id: true },
    });
    if (exists) { already++; continue; }
    if (handledIds.has(s.id)) { notDue++; continue; }
    if (s.skipNext) { skipped++; continue; }
    if (s.deliveriesSinceLast + 1 < s.everyNthDelivery) { notDue++; continue; }
    due.push(s);
  }
  return { due, skipped, paused, notDue, already };
}

export async function packingSummary(deliveryId: string) {
  const delivery = await db.delivery.findUnique({
    where: { id: deliveryId },
    include: { fruits: { include: { fruit: true }, orderBy: [{ deluxeOnly: "asc" }, { sortOrder: "asc" }] } },
  });
  if (!delivery) return null;
  const orders = await db.order.findMany({
    where: { deliveryId, status: { not: "CANCELLED" } },
    include: { items: { include: { product: true } } },
    orderBy: { number: "asc" },
  });

  const boxes = new Map<string, BoxCount>();
  const extras = new Map<string, { name: string; qty: number }>();
  for (const o of orders) {
    for (const it of o.items) {
      if (it.product?.type === "BOX") {
        const b = boxes.get(it.product.id) ?? { productId: it.product.id, name: it.product.name, tier: it.product.tier, weightLabel: it.product.weightLabel, single: 0, sub: 0, total: 0 };
        if (it.isSubscription) b.sub += it.quantity; else b.single += it.quantity;
        b.total += it.quantity;
        boxes.set(it.product.id, b);
      } else {
        const key = it.productId ?? it.name;
        const e = extras.get(key) ?? { name: it.name, qty: 0 };
        e.qty += it.quantity;
        extras.set(key, e);
      }
    }
  }

  // Áskriftir sem eiga eftir að fá pöntun í þessa sendingu
  const projection = await dueSubscriptions(deliveryId, delivery.date);
  const projected = new Map<string, number>();
  for (const s of projection.due) projected.set(s.productId, (projected.get(s.productId) ?? 0) + s.quantity);

  const boxProducts = await db.product.findMany({ where: { type: "BOX" }, orderBy: { sortOrder: "asc" } });
  const boxRows = boxProducts
    .map((p) => {
      const b = boxes.get(p.id) ?? { productId: p.id, name: p.name, tier: p.tier, weightLabel: p.weightLabel, single: 0, sub: 0, total: 0 };
      const proj = projected.get(p.id) ?? 0;
      return { ...b, projected: proj, grandTotal: b.total + proj, kg: parseKg(p.weightLabel), isDelux: p.tier === "DELUX" };
    })
    .filter((b) => b.grandTotal > 0 || boxProducts.length <= 4);

  // Innkaupaáætlun: hve margir kassar innihalda hvern ávöxt, og gróf kg-áætlun (jöfn skipting)
  const allFruits = delivery.fruits;
  const regularFruits = allFruits.filter((f) => !f.deluxeOnly);
  const fruitRows = allFruits.map((df) => {
    let boxesWith = 0;
    let kg = 0;
    let unknownKg = false;
    for (const b of boxRows) {
      const includes = b.isDelux || !df.deluxeOnly;
      if (!includes || b.grandTotal === 0) continue;
      boxesWith += b.grandTotal;
      const fruitsInThisBox = b.isDelux ? allFruits.length : regularFruits.length;
      if (b.kg === null) unknownKg = true;
      else if (fruitsInThisBox > 0) kg += (b.kg / fruitsInThisBox) * b.grandTotal;
    }
    return { fruit: df.fruit, deluxeOnly: df.deluxeOnly, boxesWith, kg: Math.round(kg * 10) / 10, unknownKg };
  });

  return {
    delivery,
    orders,
    boxRows,
    extras: [...extras.values()].sort((a, b) => b.qty - a.qty),
    fruitRows,
    projection: { count: projection.due.length, skipped: projection.skipped, paused: projection.paused, notDue: projection.notDue, already: projection.already },
    totals: {
      orders: orders.length,
      boxes: boxRows.reduce((s, b) => s + b.total, 0),
      projectedBoxes: boxRows.reduce((s, b) => s + b.projected, 0),
      pikkolo: orders.filter((o) => o.deliveryMethod === "PIKKOLO").length,
      pikkoloUnsent: orders.filter((o) => o.deliveryMethod === "PIKKOLO" && !o.pikkoloOrderId).length,
      home: orders.filter((o) => o.deliveryMethod === "HOME").length,
      pickup: orders.filter((o) => o.deliveryMethod === "PICKUP").length,
    },
  };
}

export function itemsText(items: { quantity: number; name: string }[]) {
  return items.map((i) => `${i.quantity} × ${i.name}`).join(", ");
}

/** Einfaldur CSV-lesari: semíkomma eða komma, gæsalappir studdar */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = clean.split("\n")[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell.trim()); cell = ""; }
    else if (c === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ""));
}
