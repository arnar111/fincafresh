import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { logActivity } from "./activity";
import { isOrderNumberClash, nextOrderNumber } from "./orders";
import { subPriceFor } from "./catalog";

export const SUB_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Virk",
  PAUSED: "Í hléi",
  CANCELLED: "Sagt upp",
};

/** Merki (internalNote) á áskriftarpöntun sem viðskiptavinur sleppti, svo hægt sé að afturkalla */
export const SKIPPED_BY_CUSTOMER = "Viðskiptavinur sleppti þessari sendingu";

/** Lykill í Setting-töflunni yfir áskriftir sem hafa verið afgreiddar (sleppt / ekki á tíma) fyrir sendingu */
export const subgenLedgerKey = (deliveryId: string) => `subgen.${deliveryId}`;

export async function readSubgenLedger(deliveryId: string): Promise<Set<string>> {
  const row = await db.setting.findUnique({ where: { key: subgenLedgerKey(deliveryId) } });
  try {
    return new Set<string>(row ? (JSON.parse(row.value) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function writeSubgenLedger(deliveryId: string, ids: Set<string>) {
  const key = subgenLedgerKey(deliveryId);
  const value = JSON.stringify([...ids]);
  return db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/**
 * Býr til pantanir úr virkum áskriftum fyrir tiltekna sendingu.
 * - Öruggt að keyra oftar en einu sinni: áskrift fær aldrei tvær pantanir í sömu sendingu og
 *   teljarar ("önnur hver sending", "sleppa næstu") hækka aldrei tvisvar fyrir sömu sendingu.
 * - Allt er reiknað í minni og vistað í EINNI færslu (transaction): annaðhvort tekst allt eða ekkert,
 *   og fáar ferðir í gagnagrunninn svo þetta klárist innan tímamarka Netlify.
 */
export async function generateSubscriptionOrders(deliveryId: string) {
  const delivery = await db.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new Error("Sending fannst ekki");

  const [subs, existingOrders, handledIds] = await Promise.all([
    db.subscription.findMany({ where: { status: { in: ["ACTIVE", "PAUSED"] } }, include: { customer: true, product: true } }),
    db.order.findMany({
      where: { deliveryId, status: { not: "CANCELLED" } },
      select: { subscriptionId: true, customerId: true, items: { where: { isSubscription: true }, select: { productId: true } } },
    }),
    readSubgenLedger(deliveryId),
  ]);

  // Pöntun til fyrir þessa sendingu? (búin til héðan, eða fyrsta pöntunin úr vefversluninni)
  const bySub = new Set(existingOrders.map((o) => o.subscriptionId).filter(Boolean) as string[]);
  const byCustomerProduct = new Set(existingOrders.flatMap((o) => o.items.map((i) => `${o.customerId}|${i.productId}`)));

  const reactivate: string[] = [];
  const skipIds: string[] = [];
  const notDueIds: string[] = [];
  const toCreate: typeof subs = [];
  let paused = 0, already = 0, handled = 0;

  for (const s of subs) {
    if (s.status === "PAUSED") {
      if (s.pausedUntil && s.pausedUntil <= delivery.date) reactivate.push(s.id);
      else {
        paused++;
        continue;
      }
    }
    if (bySub.has(s.id) || byCustomerProduct.has(`${s.customerId}|${s.productId}`)) { already++; continue; }
    if (handledIds.has(s.id)) { handled++; continue; }
    if (s.skipNext) { skipIds.push(s.id); handledIds.add(s.id); continue; }
    if (s.deliveriesSinceLast + 1 < s.everyNthDelivery) { notDueIds.push(s.id); handledIds.add(s.id); continue; }
    toCreate.push(s);
  }

  // Pantanir búnar til í minni með fyrirfram gefnum auðkennum
  const build = (firstNumber: number) => {
    const orders: Prisma.OrderCreateManyInput[] = [];
    const items: Prisma.OrderItemCreateManyInput[] = [];
    toCreate.forEach((s, i) => {
      const id = randomUUID().replace(/-/g, "").slice(0, 25);
      const unit = subPriceFor(s.unitPrice, s.discountPct);
      orders.push({
        id,
        number: firstNumber + i,
        customerId: s.customerId,
        email: s.customer.email,
        name: s.customer.name,
        phone: s.customer.phone,
        kennitala: s.customer.kennitala,
        street: s.street || s.customer.street,
        postalCode: s.postalCode || s.customer.postalCode,
        city: s.city || s.customer.city,
        status: "NEW",
        paymentStatus: "UNPAID",
        paymentMethod: "Áskrift (Repeat)",
        subtotal: unit * s.quantity,
        total: unit * s.quantity,
        deliveryMethod: s.deliveryMethod,
        deliveryDate: delivery.date,
        deliveryId,
        pikkoloStationId: s.pikkoloStationId,
        pikkoloStationName: s.pikkoloStationName,
        source: "SUBSCRIPTION",
        subscriptionId: s.id,
      });
      items.push({ orderId: id, productId: s.productId, name: `${s.product.name} (áskrift)`, sku: s.product.sku, unitPrice: unit, quantity: s.quantity, isSubscription: true, everyNthDelivery: s.everyNthDelivery });
    });
    return { orders, items };
  };

  for (let attempt = 0; ; attempt++) {
    const { orders, items } = build((await nextOrderNumber()) + attempt * 10);
    try {
      await db.$transaction([
        db.subscription.updateMany({ where: { id: { in: reactivate } }, data: { status: "ACTIVE", pausedUntil: null } }),
        db.subscription.updateMany({ where: { id: { in: skipIds } }, data: { skipNext: false, deliveriesSinceLast: 0 } }),
        db.subscription.updateMany({ where: { id: { in: notDueIds } }, data: { deliveriesSinceLast: { increment: 1 } } }),
        db.order.createMany({ data: orders }),
        db.orderItem.createMany({ data: items }),
        db.subscription.updateMany({ where: { id: { in: toCreate.map((s) => s.id) } }, data: { deliveriesSinceLast: 0, nextDeliveryDate: delivery.date } }),
        writeSubgenLedger(deliveryId, handledIds),
      ]);
      break;
    } catch (e) {
      if (!isOrderNumberClash(e) || attempt >= 5) throw e;
    }
  }

  const created = toCreate.length, skipped = skipIds.length, notDue = notDueIds.length;
  await logActivity("subscription", `Áskriftarpantanir búnar til: ${created} nýjar, ${skipped} slepptu, ${paused} í hléi, ${notDue} ekki komnar á tíma`, "success", { deliveryId });
  return { created, skipped, paused, notDue, already, handled };
}
