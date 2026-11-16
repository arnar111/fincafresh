/* Sýndargögn: viðskiptavinir, pantanir, áskriftir, fyrirspurnir, póstlisti, útsendur póstur og
 * atburðir svo hægt sé að prófa allt kerfið. Allt er merkt svo því sé hægt að eyða með einum smelli:
 *  - netföng enda á @prufa.fincafresh.is
 *  - pantanir eru merktar PRUFUGÖGN (internalNote)
 *  - atburðir hafa {"demo":true}
 *  - afsláttarkóðinn PRUFA10
 * Gögnin eru búin til í minni og sett inn með fáum createMany-köllum, svo þetta klárist hratt
 * líka á Netlify (föll hafa tímamörk).
 * ATH: Má ekki flytja inn "server-only" því skráin er líka keyrð beint með tsx (prisma/seed.ts).
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

export const DEMO_DOMAIN = "prufa.fincafresh.is";
/** Prufuviðskiptavinur sem getur skráð sig inn á Mínar síður */
export const DEMO_LOGIN = { email: `prufa@${DEMO_DOMAIN}`, password: "prufa1234" };

// Stöðvar úr prófunarumhverfi Pikkoló (svar frá api-staging.pikkolo.is/stations/available)
const PIKKOLO_STAGING_STATIONS = [
  { id: "03106947-6144-4c90-a596-1d89dbb84a2f", name: "Breiddin" },
  { id: "b573e9e4-4030-4589-8929-8936e1fc2e0a", name: "Vatnsmýri" },
];

const CANCEL_REASONS = ["Of mikið af ávöxtum", "Of dýrt", "Er að fara í frí", "Líkaði ekki innihaldið", "Afhendingin hentar ekki"];

// Fyrirsjáanleg slembitala svo sýndargögn séu alltaf eins
let seed = 42;
function rnd() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function pick<T>(a: T[]): T {
  return a[Math.floor(rnd() * a.length)];
}
const id = () => randomUUID().replace(/-/g, "").slice(0, 25);

/** Setur inn sýndargögn. Krefst þess að kassarnir og vörurnar úr grunngögnunum séu til. */
export async function seedDemo(db: PrismaClient) {
  seed = 42;
  const products = await db.product.findMany();
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const classic = bySlug.get("finca-classic");
  const grande = bySlug.get("finca-grande");
  const delux = bySlug.get("finca-delux");
  if (!classic || !grande || !delux) throw new Error("Kassana vantar (finca-classic, finca-grande, finca-delux).");
  const item = (slug: string) => bySlug.get(slug);
  const defPct = 5;
  const pct = (p: { subscriptionDiscountPct: number | null }) => p.subscriptionDiscountPct ?? defPct;
  const subUnit = (p: { price: number; subscriptionDiscountPct: number | null }) => Math.round((p.price * (100 - pct(p))) / 100);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = await db.delivery.findFirst({ where: { date: { gte: today } }, orderBy: { date: "asc" } });
  const last = await db.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  let number = Math.max(10001, (last?.number ?? 10000) + 1);
  const now = Date.now();

  // ── Viðskiptavinir ──────────────────────────────────────────
  const first = ["Anna", "Jón", "Guðrún", "Sigurður", "Helga", "Ólafur", "Kristín", "Einar", "Sigríður", "Magnús", "Katrín", "Gunnar", "Ragnheiður", "Bjarni", "Elín", "Stefán", "Margrét", "Ari", "Hildur", "Páll"];
  const lastNames = ["Jónsdóttir", "Sigurðsson", "Ólafsdóttir", "Magnússon", "Einarsdóttir", "Gunnarsson", "Stefánsdóttir", "Pálsson"];
  const towns: [string, string][] = [["101", "Reykjavík"], ["105", "Reykjavík"], ["200", "Kópavogur"], ["210", "Garðabær"], ["220", "Hafnarfjörður"], ["600", "Akureyri"], ["603", "Akureyri"]];
  const ascii = (s: string) => s.toLowerCase().replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u").replace(/ý/g, "y").replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").replace(/ö/g, "o").replace(/[^a-z]/g, "");

  const customers: Prisma.CustomerCreateManyInput[] = [];
  const demoLoginId = id();
  customers.push({
    id: demoLoginId, email: DEMO_LOGIN.email, name: "Prufa Prófsdóttir", phone: "6120000", street: "Prufugata 1", postalCode: "101", city: "Reykjavík",
    passwordHash: await bcrypt.hash(DEMO_LOGIN.password, 10), marketingOptIn: true, notes: "PRUFUGÖGN · Prufuaðgangur fyrir Mínar síður", createdAt: new Date(now - 50 * 86400000),
  });
  for (let i = 0; i < 28; i++) {
    const f = first[i % first.length];
    const [pc, city] = pick(towns);
    customers.push({
      id: id(), email: `${ascii(f)}${i}@${DEMO_DOMAIN}`, name: `${f} ${pick(lastNames)}`, phone: `6${Math.floor(100000 + rnd() * 899999)}`,
      street: `Prufugata ${2 + Math.floor(rnd() * 60)}`, postalCode: pc, city, marketingOptIn: rnd() > 0.5, notes: "PRUFUGÖGN",
      createdAt: new Date(now - Math.floor(30 + rnd() * 60) * 86400000),
    });
  }
  await db.customer.createMany({ data: customers });

  // ── Áskriftir ────────────────────────────────────────────────
  const subs: Prisma.SubscriptionCreateManyInput[] = [];
  const subFor = new Map<string, string>(); // customerId -> subscriptionId
  const boxes = [classic, classic, grande, grande, delux];
  const addSub = (customerId: string, box: typeof classic, opts: Partial<Prisma.SubscriptionCreateManyInput> = {}) => {
    const st = pick(PIKKOLO_STAGING_STATIONS);
    const s: Prisma.SubscriptionCreateManyInput = {
      id: id(), customerId, productId: box.id, quantity: 1, everyNthDelivery: rnd() < 0.7 ? 1 : 2, unitPrice: box.price, discountPct: pct(box),
      status: "ACTIVE", deliveryMethod: "PIKKOLO", pikkoloStationId: st.id, pikkoloStationName: st.name, nextDeliveryDate: delivery?.date ?? null,
      source: "WEB", createdAt: new Date(now - Math.floor(10 + rnd() * 60) * 86400000), ...opts,
    };
    subs.push(s);
    subFor.set(customerId, s.id!);
    return s;
  };
  addSub(demoLoginId, grande, { everyNthDelivery: 1, pikkoloStationId: PIKKOLO_STAGING_STATIONS[0].id, pikkoloStationName: PIKKOLO_STAGING_STATIONS[0].name });
  customers.slice(1, 20).forEach((c, i) => {
    const box = pick(boxes);
    const r = rnd();
    if (r < 0.68) addSub(c.id!, box, { skipNext: i % 7 === 3 });
    else if (r < 0.82) addSub(c.id!, box, { status: "PAUSED", pausedUntil: new Date(now + Math.floor(14 + rnd() * 30) * 86400000) });
    else addSub(c.id!, box, { status: "CANCELLED", cancelReason: pick(CANCEL_REASONS), cancelledAt: new Date(now - Math.floor(rnd() * 20) * 86400000) });
  });
  // Ein áskrift með heimsendingu svo Samskip-listinn hafi eitthvað
  const homeSub = subs[3];
  if (homeSub) Object.assign(homeSub, { deliveryMethod: "HOME", pikkoloStationId: "", pikkoloStationName: "", street: "Prufugata 12", postalCode: "603", city: "Akureyri" });
  await db.subscription.createMany({ data: subs });

  // ── Pantanir ─────────────────────────────────────────────────
  type Draft = { order: Prisma.OrderCreateManyInput; items: Prisma.OrderItemCreateManyInput[] };
  const drafts: Draft[] = [];
  const makeOrder = (c: Prisma.CustomerCreateManyInput, daysAgo: number, opts: { forceSub?: boolean; useCode?: boolean; method?: "PIKKOLO" | "HOME"; box?: typeof classic } = {}) => {
    const box = opts.box ?? pick(boxes);
    const isSub = opts.forceSub ?? (subFor.has(c.id!) && rnd() < 0.7);
    const lines: { p: typeof classic; qty: number; sub: boolean }[] = [{ p: box, qty: 1, sub: isSub }];
    // Mynstur fyrir "keyptu líka": granóla fylgir oft Classic, hunang Delúx, mangó Grande
    const add = (slug: string, chance: number, qty = 1) => { const p = item(slug); if (p && rnd() < chance) lines.push({ p, qty, sub: false }); };
    if (box.id === classic.id) add("granola-med-blaberjum", 0.55);
    if (box.id === delux.id) add("hunang", 0.6);
    if (box.id === grande.id) add("thurrkad-mango", 0.5, 1 + Math.floor(rnd() * 2));
    add("half-thurrkadar-fikjur", 0.25);
    add("granola-med-sukkuladi", 0.15);
    const orderId = id();
    const items = lines.map((l) => {
      const unit = l.sub ? subUnit(l.p) : l.p.price;
      return { id: id(), orderId, productId: l.p.id, name: l.p.name + (l.sub ? " (áskrift)" : ""), sku: l.p.sku, unitPrice: unit, quantity: l.qty, isSubscription: l.sub };
    });
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const discount = opts.useCode ? Math.round(subtotal * 0.1) : 0;
    const created = new Date(now - daysAgo * 86400000 - Math.floor(rnd() * (daysAgo === 0 ? 3 : 10) * 3600000));
    const recent = daysAgo <= 10;
    const method = opts.method ?? (rnd() < 0.72 ? "PIKKOLO" : "HOME");
    const st = pick(PIKKOLO_STAGING_STATIONS);
    const status = !recent ? (rnd() < 0.06 ? "CANCELLED" : "DELIVERED") : daysAgo > 3 ? (rnd() < 0.5 ? "PROCESSING" : "SHIPPED") : "NEW";
    drafts.push({
      order: {
        id: orderId, number: 0, customerId: c.id, email: c.email, name: c.name ?? "", phone: c.phone ?? "", street: c.street ?? "", postalCode: c.postalCode ?? "", city: c.city ?? "",
        status, paymentStatus: status === "CANCELLED" ? "REFUNDED" : "PAID", paymentMethod: "Sýndargreiðsla", paymentRef: `PRUFA-${orderId.slice(0, 6)}`,
        subtotal, discount, total: subtotal - discount, discountCode: opts.useCode ? "PRUFA10" : "",
        deliveryMethod: method, deliveryDate: recent ? delivery?.date ?? null : null, deliveryId: recent && status !== "CANCELLED" ? delivery?.id ?? null : null,
        pikkoloStationId: method === "PIKKOLO" ? st.id : "", pikkoloStationName: method === "PIKKOLO" ? st.name : "",
        source: "WEB", subscriptionId: isSub ? subFor.get(c.id!) ?? null : null, createdAt: created, internalNote: "PRUFUGÖGN",
        trackingNumber: method === "HOME" && status === "SHIPPED" ? `SAM${Math.floor(100000 + rnd() * 899999)}` : "",
      },
      items,
    });
  };
  // Prufuviðskiptavinurinn fær sögu (til að sjá á Mínum síðum)
  makeOrder(customers[0], 45, { forceSub: true, box: grande });
  makeOrder(customers[0], 24, { forceSub: true, box: grande });
  makeOrder(customers[0], 2, { forceSub: true, method: "PIKKOLO", box: grande });
  for (let i = 0; i < 68; i++) makeOrder(pick(customers.slice(1)), Math.floor(rnd() * 60), { useCode: rnd() < 0.08 });
  // Nokkrar nýjar pantanir í dag svo "Sala í dag" og "Nýjar pantanir" sýni eitthvað
  for (let i = 0; i < 4; i++) makeOrder(pick(customers.slice(1)), 0);

  // Áskriftarpantanir (sjálfvirkar) sem bíða greiðslu frá Repeat, tengdar næstu sendingu
  if (delivery) {
    for (const s of subs.filter((x) => x.status === "ACTIVE" && !x.skipNext).slice(0, 6)) {
      const c = customers.find((x) => x.id === s.customerId)!;
      const p = products.find((x) => x.id === s.productId)!;
      const orderId = id();
      const unit = subUnit(p);
      drafts.push({
        order: {
          id: orderId, number: 0, customerId: c.id, email: c.email, name: c.name ?? "", phone: c.phone ?? "", street: c.street ?? "", postalCode: c.postalCode ?? "", city: c.city ?? "",
          status: "NEW", paymentStatus: "UNPAID", paymentMethod: "Áskrift (Repeat)", subtotal: unit, total: unit,
          deliveryMethod: s.deliveryMethod ?? "PIKKOLO", deliveryDate: delivery.date, deliveryId: delivery.id,
          pikkoloStationId: s.pikkoloStationId ?? "", pikkoloStationName: s.pikkoloStationName ?? "",
          source: "SUBSCRIPTION", subscriptionId: s.id, createdAt: new Date(now - 3600000), internalNote: "PRUFUGÖGN",
        },
        items: [{ id: id(), orderId, productId: p.id, name: `${p.name} (áskrift)`, sku: p.sku, unitPrice: unit, quantity: 1, isSubscription: true }],
      });
    }
  }

  drafts.sort((a, b) => (a.order.createdAt as Date).getTime() - (b.order.createdAt as Date).getTime());
  for (const d of drafts) d.order.number = number++;
  await db.order.createMany({ data: drafts.map((d) => d.order) });
  await db.orderItem.createMany({ data: drafts.flatMap((d) => d.items) });

  // ── Afsláttarkóði ────────────────────────────────────────────
  const usedCode = drafts.filter((d) => d.order.discountCode === "PRUFA10").length;
  await db.discountCode.upsert({
    where: { code: "PRUFA10" },
    create: { code: "PRUFA10", description: "Sýndarkóði: 10% afsláttur (PRUFUGÖGN)", type: "PERCENT", value: 10, usedCount: usedCode },
    update: { active: true, usedCount: usedCode },
  });

  // ── Fyrirspurnir og póstlisti ────────────────────────────────
  await db.inquiry.createMany({
    data: [
      { type: "B2B", name: "Sigrún Prófsdóttir", email: `sigrun@${DEMO_DOMAIN}`, phone: "5551234", company: "Prufufyrirtækið ehf.", message: "Við erum 25 manns á skrifstofunni og viljum fá ávaxtakassa vikulega. Getið þið sent okkur tilboð?", status: "NEW", createdAt: new Date(now - 2 * 3600000) },
      { type: "B2B", name: "Hörður Prófsson", email: `hordur@${DEMO_DOMAIN}`, phone: "5559876", company: "Sýndarverk hf.", message: "Hafið þið áhuga á að koma með ávexti á starfsmannafund í næsta mánuði? Um 60 manns.", status: "NEW", createdAt: new Date(now - 26 * 3600000) },
      { type: "CONTACT", name: "Lára Prófsdóttir", email: `lara@${DEMO_DOMAIN}`, phone: "", company: "", message: "Hæ, er hægt að fá kassann sendan á Selfoss?", status: "HANDLED", createdAt: new Date(now - 5 * 86400000) },
    ],
  });
  await db.newsletterSubscriber.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({ email: `frettir${i}@${DEMO_DOMAIN}`, source: i % 3 === 0 ? "checkout" : "footer", createdAt: new Date(now - Math.floor(rnd() * 40) * 86400000) })),
    skipDuplicates: true,
  });

  // ── Útsendur póstur (sýnir hvernig staðfestingarpóstur lítur út) ──
  const lastDemo = drafts.filter((d) => d.order.customerId === demoLoginId).at(-1);
  if (lastDemo) {
    await db.emailOutbox.create({
      data: {
        to: DEMO_LOGIN.email,
        subject: `Takk fyrir pöntunina! (#${lastDemo.order.number})`,
        html: `<div style="font-family:Arial,sans-serif;background:#F5EBD9;padding:24px"><div style="background:#FCF8F1;border-radius:16px;padding:24px"><h1 style="font-family:Georgia,serif;color:#6A2833">Takk fyrir pöntunina!</h1><p>Hæ Prufa, við erum búin að fá pöntunina þína (sýndargögn).</p></div></div>`,
        status: "LOGGED",
        createdAt: lastDemo.order.createdAt as Date,
      },
    });
  }

  // ── Atburðir fyrir greininguna (samhangandi lotur: skoðun → karfa → greiðsla → pöntun) ──
  const events: Prisma.AnalyticsEventCreateManyInput[] = [];
  const boxIds = [classic.id, grande.id, delux.id];
  for (let s = 0; s < 420; s++) {
    const sid = `demo-${s}`;
    const t = now - Math.floor(rnd() * 30) * 86400000 - Math.floor(rnd() * 86400000);
    const ev = (name: string, productId: string | null, offset: number, props: Record<string, unknown> = {}) =>
      events.push({ name, sessionId: sid, productId, props: JSON.stringify({ demo: true, ...props }), createdAt: new Date(t + offset * 60000) });
    const viewed = pick(products);
    ev("product_viewed", viewed.id, 0);
    if (rnd() < 0.4) ev("product_viewed", pick(products).id, 1);
    if (rnd() < 0.45) ev("fruit_info_opened", null, 2, { fruit: pick(["mango-kent", "avokado-bacon", "kiwi", "granatepli"]) });
    if (rnd() < 0.5) {
      const box = pick(boxIds);
      const single = rnd() < 0.45;
      if (single) {
        ev("upsell_shown", box, 3, { where: "add" });
        if (rnd() < 0.33) ev("upsell_accepted", box, 3, { every: 1 });
        else ev("upsell_declined", box, 3);
      }
      ev("add_to_cart", box, 4, { sub: !single, qty: 1, type: "BOX" });
      if (rnd() < 0.1) ev("cart_converted_to_subscription", box, 5, { every: 1 });
      if (rnd() < 0.7) {
        ev("checkout_started", null, 6);
        if (rnd() < 0.6) {
          ev("order_completed", null, 8, { total: 7000 + Math.floor(rnd() * 5000) });
          if (!single || rnd() < 0.3) ev("subscription_started", box, 8);
        }
      }
    }
  }
  for (const s of subs.filter((x) => x.status === "CANCELLED")) {
    events.push({ name: "subscription_cancelled", sessionId: "", productId: s.productId, props: JSON.stringify({ demo: true, reason: s.cancelReason }), createdAt: (s.cancelledAt as Date) ?? new Date() });
  }
  for (let i = 0; i < 5; i++) events.push({ name: "subscription_cancel_prevented", sessionId: "", productId: grande.id, props: JSON.stringify({ demo: true, choice: pick(["pause", "skip", "downgrade", "less_often"]) }), createdAt: new Date(now - Math.floor(rnd() * 20) * 86400000) });
  await db.analyticsEvent.createMany({ data: events });

  await db.setting.upsert({ where: { key: "demo.seeded" }, create: { key: "demo.seeded", value: "true" }, update: { value: "true" } });
  await db.activityLog.createMany({
    data: [
      { kind: "system", level: "info", message: "Sýndargögn sett inn. Þeim er eytt með einum smelli á Yfirliti eða undir Stillingar." },
      { kind: "inquiry", level: "info", message: "Ný fyrirspurn frá Sigrúnu Prófsdóttur (Prufufyrirtækið ehf.)", meta: JSON.stringify({ demo: true }) },
    ],
  });
  return { customers: customers.length, orders: drafts.length, subscriptions: subs.length, events: events.length };
}
