import "server-only";
import { db } from "./db";
import { logActivity } from "./activity";
import { trackLocal } from "./analytics";
import { getNextDelivery } from "./catalog";
import { kr, dateWithDayAcc } from "./format";
import type { CartSummary } from "./cart";
import { chargeOneOff } from "./integrations/payments";
import { sendEmail, emailLayout } from "./integrations/email";
import { captureServer } from "./integrations/posthog";
import { createPikkoloOrder, pikkoloConfig } from "./integrations/pikkolo";
import { getSetting } from "./settings";
import { hashPassword } from "./auth";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Ný",
  PROCESSING: "Í vinnslu",
  SHIPPED: "Send",
  DELIVERED: "Afhent",
  CANCELLED: "Hætt við",
};
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Ógreidd",
  PAID: "Greidd",
  REFUNDED: "Endurgreidd",
  FAILED: "Greiðsla mistókst",
};
export const DELIVERY_METHOD_LABELS: Record<string, string> = {
  PIKKOLO: "Pikkoló",
  HOME: "Heimsending",
  PICKUP: "Sótt",
};

export async function nextOrderNumber() {
  const last = await db.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  return Math.max(10001, (last?.number ?? 10000) + 1);
}

export type CheckoutInput = {
  email: string;
  name: string;
  phone: string;
  kennitala: string;
  street: string;
  postalCode: string;
  city: string;
  deliveryMethod: "PIKKOLO" | "HOME" | "PICKUP";
  pikkoloStationId: string;
  pikkoloStationName: string;
  pikkoloDeliveryTimeId: string;
  customerNote: string;
  password: string; // valfrjálst: stofna aðgang
  marketingOptIn: boolean;
  sessionId: string;
};

export async function placeOrder(summary: CartSummary, input: CheckoutInput) {
  const email = input.email.trim().toLowerCase();
  const next = await getNextDelivery();

  // Viðskiptavinur: til eða nýr
  const existing = await db.customer.findUnique({ where: { email } });
  const customerData = {
    name: input.name,
    phone: input.phone,
    kennitala: input.kennitala,
    street: input.street,
    postalCode: input.postalCode,
    city: input.city,
    marketingOptIn: input.marketingOptIn || existing?.marketingOptIn || false,
  };
  const passwordHash = input.password && !existing?.passwordHash ? await hashPassword(input.password) : undefined;
  const customer = existing
    ? await db.customer.update({ where: { id: existing.id }, data: { ...customerData, ...(passwordHash ? { passwordHash } : {}) } })
    : await db.customer.create({ data: { email, ...customerData, ...(passwordHash ? { passwordHash } : {}) } });

  const number = await nextOrderNumber();
  const payment = await chargeOneOff({ orderNumber: number, amount: summary.total, email });
  if (!payment.ok) throw new Error(payment.error);

  const order = await db.order.create({
    data: {
      number,
      customerId: customer.id,
      email,
      name: input.name,
      phone: input.phone,
      kennitala: input.kennitala,
      street: input.street,
      postalCode: input.postalCode,
      city: input.city,
      status: "NEW",
      paymentStatus: "PAID",
      paymentMethod: payment.method,
      paymentRef: payment.ref,
      subtotal: summary.subtotal,
      discount: summary.discount,
      shipping: summary.shipping,
      total: summary.total,
      discountCode: summary.discount > 0 ? summary.discountCode.toUpperCase() : "",
      deliveryMethod: input.deliveryMethod,
      deliveryDate: next?.date ?? null,
      deliveryId: next?.id ?? null,
      pikkoloStationId: input.pikkoloStationId,
      pikkoloStationName: input.pikkoloStationName,
      pikkoloDeliveryTimeId: input.pikkoloDeliveryTimeId,
      customerNote: input.customerNote,
      source: "WEB",
      items: {
        create: summary.lines.map((l) => ({
          productId: l.product.id,
          name: l.product.name + (l.sub ? " (áskrift)" : ""),
          sku: l.product.sku,
          unitPrice: l.unitPrice,
          quantity: l.qty,
          isSubscription: l.sub,
          everyNthDelivery: l.every,
        })),
      },
    },
    include: { items: true },
  });

  if (summary.discount > 0 && summary.discountCode) {
    await db.discountCode.updateMany({ where: { code: summary.discountCode.toUpperCase() }, data: { usedCount: { increment: 1 } } });
  }

  // Áskriftir: fyrsta sendingin er þessi pöntun, næsta reiknast í "Næstu sendingu"
  const subs = [];
  for (const l of summary.lines.filter((x) => x.sub)) {
    const s = await db.subscription.create({
      data: {
        customerId: customer.id,
        productId: l.product.id,
        quantity: l.qty,
        everyNthDelivery: l.every,
        unitPrice: l.product.price,
        discountPct: l.product.subDiscountPct,
        status: "ACTIVE",
        nextDeliveryDate: next?.date ?? null,
        deliveryMethod: input.deliveryMethod,
        pikkoloStationId: input.pikkoloStationId,
        pikkoloStationName: input.pikkoloStationName,
        street: input.street,
        postalCode: input.postalCode,
        city: input.city,
        source: "WEB",
      },
    });
    subs.push(s);
  }
  if (subs.length) {
    await db.order.update({ where: { id: order.id }, data: { subscriptionId: subs[0].id } });
  }

  await logActivity("order", `Ný pöntun #${number} frá ${input.name} (${kr(summary.total)})`, "success", { orderId: order.id });
  for (const s of subs) await logActivity("subscription", `Ný áskrift: ${input.name}`, "success", { subscriptionId: s.id });

  await trackLocal("order_completed", { total: summary.total, number, hasSubscription: subs.length > 0 }, input.sessionId);
  for (const s of subs) await trackLocal("subscription_started", { productId: s.productId }, input.sessionId, s.productId);
  await captureServer("order_completed", email, { order_number: number, total: summary.total, subscriptions: subs.length, items: summary.lines.map((l) => l.product.slug) });

  // Staðfestingarpóstur
  const rows = order.items.map((i) => `<tr><td style="padding:6px 0">${i.quantity} × ${i.name}</td><td style="text-align:right">${kr(i.unitPrice * i.quantity)}</td></tr>`).join("");
  await sendEmail(
    email,
    `Takk fyrir pöntunina! (#${number})`,
    emailLayout(
      "Takk fyrir pöntunina!",
      `<p>Hæ ${input.name.split(" ")[0]}, við erum búin að fá pöntunina þína.</p>
       ${next ? `<p>Hún kemur með sendingunni <strong>${dateWithDayAcc(next.date)}</strong>.</p>` : ""}
       <table style="width:100%;border-collapse:collapse">${rows}
       <tr><td style="padding-top:12px;border-top:1px solid #E2D2B6"><strong>Samtals</strong></td><td style="text-align:right;padding-top:12px;border-top:1px solid #E2D2B6"><strong>${kr(summary.total)}</strong></td></tr></table>
       ${subs.length ? `<p>Þú ert nú í áskrift. Þú getur sleppt sendingu, gert hlé eða sagt upp hvenær sem er á Mínum síðum.</p>` : ""}`
    )
  );

  // Pikkoló: senda sjálfkrafa ef það er stillt
  if (input.deliveryMethod === "PIKKOLO" && (await getSetting("pikkolo.autoSubmit"))) {
    await submitOrderToPikkolo(order.id).catch(() => undefined);
  }

  return { order, customer, subscriptions: subs };
}

/** Sendir pöntun til Pikkoló (stjórnborð eða sjálfvirkt eftir greiðslu) */
export async function submitOrderToPikkolo(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: true } } } });
  if (!order) throw new Error("Pöntun fannst ekki");
  if (order.deliveryMethod !== "PIKKOLO") throw new Error("Pöntunin á ekki að fara í Pikkoló");
  if (!order.pikkoloStationId) throw new Error("Pöntun vantar Pikkoló stöð");
  // Áskriftarpantanir hafa ekki valinn tíma: Pikkoló notar sniðið "<stationId>:<YYYY-MM-DD>"
  // (sjá dæmi í skjölun Pikkoló og svör frá /stations/available)
  let deliveryTimeId = order.pikkoloDeliveryTimeId;
  if (!deliveryTimeId && order.deliveryDate) {
    const d = order.deliveryDate;
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    deliveryTimeId = `${order.pikkoloStationId}:${ymd}`;
  }
  if (!deliveryTimeId) throw new Error("Pöntun vantar afhendingardag fyrir Pikkoló");
  const cfg = await pikkoloConfig();
  if (!cfg.canSubmit) throw new Error("Pikkoló API-lykil vantar (Tengingar)");

  const packages: { barcode: string; description: string; type: "Refrigerated"; lineItems: { sku: string; name: string; quantity: number; unitPrice: number }[] }[] = [];
  let n = 1;
  for (const it of order.items) {
    for (let q = 0; q < it.quantity; q++) {
      packages.push({
        barcode: `FF-${order.number}-${n++}`,
        description: it.name,
        type: "Refrigerated",
        lineItems: [{ sku: it.sku || it.productId || it.id, name: it.name, quantity: 1, unitPrice: it.unitPrice }],
      });
    }
  }
  try {
    const res = await createPikkoloOrder({
      vendorOrderId: String(order.number),
      stationId: order.pikkoloStationId,
      deliveryTimeId,
      customerPhone: order.phone.startsWith("+") ? order.phone : `+354${order.phone.replace(/\D/g, "")}`,
      customerEmail: order.email,
      customerName: order.name,
      customerNationalId: order.kennitala || undefined,
      isSubscription: order.source === "SUBSCRIPTION" || order.items.some((i) => i.isSubscription),
      items: packages,
    });
    await db.order.update({ where: { id: order.id }, data: { pikkoloOrderId: res.id, pikkoloStatus: res.status, pikkoloDeliveryTimeId: deliveryTimeId } });
    await logActivity("integration", `Pöntun #${order.number} send til Pikkoló`, "success", { orderId: order.id });
    return res;
  } catch (e) {
    await logActivity("integration", `Pikkoló: tókst ekki að senda #${order.number}: ${(e as Error).message}`, "error", { orderId: order.id });
    throw e;
  }
}
