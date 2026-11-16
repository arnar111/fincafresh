import "server-only";
import { db } from "./db";
import { logActivity } from "./activity";
import { nextOrderNumber } from "./orders";
import { subPriceFor } from "./catalog";

export const SUB_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Virk",
  PAUSED: "Í hléi",
  CANCELLED: "Sagt upp",
};

/**
 * Býr til pantanir úr virkum áskriftum fyrir tiltekna sendingu.
 * Öruggt að keyra oftar en einu sinni: áskrift fær aldrei tvær pantanir í sömu sendingu.
 */
export async function generateSubscriptionOrders(deliveryId: string) {
  const delivery = await db.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new Error("Sending fannst ekki");

  const subs = await db.subscription.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    include: { customer: true, product: true },
  });

  // Skrá yfir áskriftir sem hefur þegar verið ákveðið að sleppi þessari sendingu (sleppa / ekki komin á tíma),
  // svo að það að keyra aftur breyti engu (teljarinn hækkar ekki tvisvar fyrir sömu sendingu).
  const ledgerKey = `subgen.${deliveryId}`;
  const ledgerRow = await db.setting.findUnique({ where: { key: ledgerKey } });
  const handledIds = new Set<string>(ledgerRow ? (JSON.parse(ledgerRow.value) as string[]) : []);

  let created = 0, skipped = 0, paused = 0, notDue = 0, already = 0, handled = 0;
  for (const s of subs) {
    if (s.status === "PAUSED") {
      if (s.pausedUntil && s.pausedUntil <= delivery.date) {
        await db.subscription.update({ where: { id: s.id }, data: { status: "ACTIVE", pausedUntil: null } });
      } else {
        paused++;
        continue;
      }
    }
    // Pöntun til fyrir þessa sendingu? (annaðhvort búin til héðan eða fyrsta pöntunin úr vefversluninni)
    const exists = await db.order.findFirst({
      where: {
        deliveryId,
        status: { not: "CANCELLED" },
        OR: [
          { subscriptionId: s.id },
          { customerId: s.customerId, items: { some: { productId: s.productId, isSubscription: true } } },
        ],
      },
    });
    if (exists) { already++; continue; }
    if (handledIds.has(s.id)) { handled++; continue; }

    if (s.skipNext) {
      handledIds.add(s.id);
      await db.subscription.update({ where: { id: s.id }, data: { skipNext: false, deliveriesSinceLast: 0 } });
      skipped++;
      continue;
    }
    const since = s.deliveriesSinceLast + 1;
    if (since < s.everyNthDelivery) {
      handledIds.add(s.id);
      await db.subscription.update({ where: { id: s.id }, data: { deliveriesSinceLast: since } });
      notDue++;
      continue;
    }

    const unit = subPriceFor(s.unitPrice, s.discountPct);
    const total = unit * s.quantity;
    await db.order.create({
      data: {
        number: await nextOrderNumber(),
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
        subtotal: total,
        total,
        deliveryMethod: s.deliveryMethod,
        deliveryDate: delivery.date,
        deliveryId,
        pikkoloStationId: s.pikkoloStationId,
        pikkoloStationName: s.pikkoloStationName,
        source: "SUBSCRIPTION",
        subscriptionId: s.id,
        items: {
          create: [{ productId: s.productId, name: `${s.product.name} (áskrift)`, sku: s.product.sku, unitPrice: unit, quantity: s.quantity, isSubscription: true, everyNthDelivery: s.everyNthDelivery }],
        },
      },
    });
    await db.subscription.update({ where: { id: s.id }, data: { deliveriesSinceLast: 0, nextDeliveryDate: delivery.date } });
    created++;
  }
  await db.setting.upsert({
    where: { key: ledgerKey },
    create: { key: ledgerKey, value: JSON.stringify([...handledIds]) },
    update: { value: JSON.stringify([...handledIds]) },
  });
  await logActivity("subscription", `Áskriftarpantanir búnar til: ${created} nýjar, ${skipped} slepptu, ${paused} í hléi, ${notDue} ekki komnar á tíma`, "success", { deliveryId });
  return { created, skipped, paused, notDue, already, handled };
}
