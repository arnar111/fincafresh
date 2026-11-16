import "server-only";
import { db } from "@/lib/db";
import { coPurchasePairs } from "@/lib/recommendations";
import { getSetting } from "@/lib/settings";

export type Period = 7 | 30 | 90 | 365;

export function periodStart(days: Period) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days + 1);
  return d;
}

export const FUNNEL = [
  { name: "product_viewed", label: "Skoðuðu vöru" },
  { name: "add_to_cart", label: "Settu í körfu" },
  { name: "checkout_started", label: "Byrjuðu að greiða" },
  { name: "order_completed", label: "Kláruðu pöntun" },
] as const;

export async function funnel(since: Date) {
  // Aðeins lotur með auðkenni (gestir sem samþykktu tölfræðikökur). Atburðir án auðkennis eru ekki
  // taldir hér, annars rynnu þeir allir saman í eina "lotu".
  const rows = await db.analyticsEvent.groupBy({
    by: ["name", "sessionId"],
    where: { createdAt: { gte: since }, name: { in: FUNNEL.map((f) => f.name) }, sessionId: { not: "" } },
  });
  return FUNNEL.map((f) => ({ ...f, sessions: rows.filter((r) => r.name === f.name).length }));
}

export async function eventCounts(since: Date, names: string[]) {
  const rows = await db.analyticsEvent.groupBy({ by: ["name"], where: { createdAt: { gte: since }, name: { in: names } }, _count: { _all: true } });
  return Object.fromEntries(names.map((n) => [n, rows.find((r) => r.name === n)?._count._all ?? 0])) as Record<string, number>;
}

/** Hlutfall nýrra kassakaupa sem eru áskrift (sjálfvirkar áskriftarpantanir eru ekki taldar með) */
export async function subscriptionShare(since: Date, days: Period) {
  const items = await db.orderItem.findMany({
    where: { product: { type: "BOX" }, order: { createdAt: { gte: since }, status: { not: "CANCELLED" }, source: { not: "SUBSCRIPTION" } } },
    select: { isSubscription: true, quantity: true, order: { select: { createdAt: true } } },
  });
  const bucketDays = days <= 30 ? 7 : days <= 90 ? 14 : 30;
  const buckets: { label: string; sub: number; single: number }[] = [];
  for (let start = since.getTime(); start < Date.now(); start += bucketDays * 86400000) {
    const d = new Date(start);
    buckets.push({ label: `${d.getDate()}.${d.getMonth() + 1}.`, sub: 0, single: 0 });
  }
  let sub = 0, single = 0;
  for (const it of items) {
    const i = Math.min(buckets.length - 1, Math.floor((it.order.createdAt.getTime() - since.getTime()) / (bucketDays * 86400000)));
    if (it.isSubscription) { sub += it.quantity; if (buckets[i]) buckets[i].sub += it.quantity; }
    else { single += it.quantity; if (buckets[i]) buckets[i].single += it.quantity; }
  }
  return { sub, single, pct: sub + single ? Math.round((sub / (sub + single)) * 100) : 0, buckets };
}

export async function churn(since: Date) {
  const [active, paused, cancelledTotal, cancelledInPeriod, reasons] = await Promise.all([
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.subscription.count({ where: { status: "PAUSED" } }),
    db.subscription.count({ where: { status: "CANCELLED" } }),
    db.subscription.count({ where: { status: "CANCELLED", cancelledAt: { gte: since } } }),
    db.subscription.groupBy({ by: ["cancelReason"], where: { status: "CANCELLED", cancelReason: { not: "" } }, _count: { _all: true } }),
  ]);
  const startedInPeriod = await db.subscription.count({ where: { createdAt: { gte: since } } });
  return {
    active, paused, cancelledTotal, cancelledInPeriod, startedInPeriod,
    reasons: reasons.map((r) => ({ reason: r.cancelReason, count: r._count._all })).sort((a, b) => b.count - a.count),
  };
}

export async function topProducts(since: Date) {
  const items = await db.orderItem.findMany({
    where: { order: { createdAt: { gte: since }, status: { not: "CANCELLED" } } },
    select: { productId: true, name: true, quantity: true, unitPrice: true },
  });
  const map = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const it of items) {
    const key = it.productId ?? it.name;
    const cur = map.get(key) ?? { name: it.name.replace(" (áskrift)", ""), qty: 0, revenue: 0 };
    cur.qty += it.quantity;
    cur.revenue += it.quantity * it.unitPrice;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
}

export async function mostViewed(since: Date) {
  const rows = await db.analyticsEvent.groupBy({ by: ["productId"], where: { name: "product_viewed", createdAt: { gte: since }, productId: { not: null } }, _count: { _all: true } });
  const products = await db.product.findMany({ where: { id: { in: rows.map((r) => r.productId!) } }, select: { id: true, name: true } });
  const names = new Map(products.map((p) => [p.id, p.name]));
  return rows.map((r) => ({ name: names.get(r.productId!) ?? "Óþekkt vara", views: r._count._all })).sort((a, b) => b.views - a.views).slice(0, 6);
}

export type AlsoBoughtRow = { fromId: string; fromName: string; toId: string; toName: string; together: number; base: number; confidence: number; pinned: boolean };

export async function alsoBought(): Promise<{ rows: AlsoBoughtRow[]; orders: number }> {
  const { pairs, orders } = await coPurchasePairs();
  const ids = [...new Set(pairs.flatMap((p) => [p.a, p.b]))];
  const [products, pins] = await Promise.all([
    db.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    db.recommendationPin.findMany({ select: { productId: true, recommendedProductId: true } }),
  ]);
  const name = new Map(products.map((p) => [p.id, p.name]));
  const pinned = new Set(pins.map((p) => `${p.productId}|${p.recommendedProductId}`));
  const rows: AlsoBoughtRow[] = [];
  for (const p of pairs) {
    if (p.together < 2) continue;
    for (const [from, to, base] of [[p.a, p.b, p.aCount], [p.b, p.a, p.bCount]] as const) {
      if (!name.has(from) || !name.has(to) || base < 2) continue;
      rows.push({ fromId: from, fromName: name.get(from)!, toId: to, toName: name.get(to)!, together: p.together, base, confidence: Math.round((p.together / base) * 100), pinned: pinned.has(`${from}|${to}`) });
    }
  }
  rows.sort((x, y) => y.confidence - x.confidence || y.together - x.together);
  return { rows: rows.slice(0, 15), orders };
}

export type SingleBuyer = { customerId: string; name: string; email: string; orders: number; spent: number; wouldSave: number; offerSentAt: Date | null };

/** Viðskiptavinir sem hafa keypt staka kassa oftar en einu sinni en eru ekki í áskrift */
export async function repeatSingleBuyers(): Promise<SingleBuyer[]> {
  const defPct = await getSetting("subscription.defaultDiscountPct");
  const items = await db.orderItem.findMany({
    where: { isSubscription: false, product: { type: "BOX" }, order: { status: { not: "CANCELLED" }, customerId: { not: null } } },
    select: { quantity: true, unitPrice: true, orderId: true, product: { select: { subscriptionDiscountPct: true } }, order: { select: { customerId: true } } },
  });
  const by = new Map<string, { orders: Set<string>; spent: number; save: number }>();
  for (const it of items) {
    const cid = it.order.customerId!;
    const cur = by.get(cid) ?? { orders: new Set(), spent: 0, save: 0 };
    cur.orders.add(it.orderId);
    const line = it.quantity * it.unitPrice;
    cur.spent += line;
    cur.save += Math.round((line * (it.product?.subscriptionDiscountPct ?? defPct)) / 100);
    by.set(cid, cur);
  }
  const candidates = [...by.entries()].filter(([, v]) => v.orders.size >= 2).map(([id]) => id);
  if (!candidates.length) return [];
  const [customers, subscribed, offers] = await Promise.all([
    db.customer.findMany({ where: { id: { in: candidates } }, select: { id: true, name: true, email: true } }),
    db.subscription.findMany({ where: { customerId: { in: candidates }, status: "ACTIVE" }, select: { customerId: true } }),
    db.discountCode.findMany({ where: { description: { startsWith: "Áskriftartilboð:" } }, select: { description: true, createdAt: true } }),
  ]);
  const hasSub = new Set(subscribed.map((s) => s.customerId));
  const offerBy = new Map(offers.map((o) => [o.description.replace("Áskriftartilboð:", "").trim(), o.createdAt]));
  return customers
    .filter((c) => !hasSub.has(c.id))
    .map((c) => {
      const v = by.get(c.id)!;
      return { customerId: c.id, name: c.name || c.email, email: c.email, orders: v.orders.size, spent: v.spent, wouldSave: v.save, offerSentAt: offerBy.get(c.email) ?? null };
    })
    .sort((a, b) => b.wouldSave - a.wouldSave);
}
