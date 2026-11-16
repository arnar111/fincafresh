/* Prufugögn: prufupantanir, -viðskiptavinir, -áskriftir og atburðir svo stjórnborðið sýni eitthvað.
 * Allt er merkt (netföng enda á @prufa.fincafresh.is, pantanir merktar PRUFUGÖGN, atburðir {"demo":true})
 * og er eytt með einum smelli undir Stillingar → Prufugögn.
 * ATH: Má ekki flytja inn "server-only" því skráin er líka keyrð beint með tsx.
 */
import type { PrismaClient } from "@prisma/client";

const DEMO_DOMAIN = "prufa.fincafresh.is";

// Fyrirsjáanleg slembitala svo prufugögn séu alltaf eins
let seed = 42;
function rnd() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function pick<T>(a: T[]): T {
  return a[Math.floor(rnd() * a.length)];
}

/** Setur inn prufugögn. Krefst þess að kassarnir og vörurnar úr grunngögnunum séu til. */
export async function seedDemo(db: PrismaClient) {
  seed = 42;
  const bySlug = async (slug: string) => (await db.product.findUnique({ where: { slug } }))?.id;
  const classic = await bySlug("finca-classic");
  const grande = await bySlug("finca-grande");
  const deluxBox = await bySlug("finca-delux");
  if (!classic || !grande || !deluxBox) throw new Error("Kassana vantar (finca-classic, finca-grande, finca-delux).");
  const items: Record<string, string> = {};
  for (const s of ["granola-med-blaberjum", "thurrkad-mango", "hunang", "half-thurrkadar-fikjur", "granola-med-sukkuladi"]) {
    const id = await bySlug(s);
    if (id) items[s] = id;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = await db.delivery.findFirst({ where: { date: { gte: today } }, orderBy: { date: "asc" } });
  const last = await db.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  await seedDemoInner(db, { classic, grande, delux: deluxBox }, items, delivery?.id ?? null, Math.max(10001, (last?.number ?? 10000) + 1));
}

async function seedDemoInner(db: PrismaClient, boxes: { classic: string; grande: string; delux: string }, items: Record<string, string>, deliveryId: string | null, firstNumber: number) {
  const first = ["Anna", "Jón", "Guðrún", "Sigurður", "Helga", "Ólafur", "Kristín", "Einar", "Sigríður", "Magnús", "Katrín", "Gunnar", "Ragnheiður", "Bjarni", "Elín", "Stefán", "Margrét", "Ari", "Hildur", "Páll"];
  const last = ["Jónsdóttir", "Sigurðsson", "Ólafsdóttir", "Magnússon", "Einarsdóttir", "Gunnarsson", "Stefánsdóttir", "Pálsson"];
  const towns: [string, string][] = [["101", "Reykjavík"], ["105", "Reykjavík"], ["200", "Kópavogur"], ["210", "Garðabær"], ["220", "Hafnarfjörður"], ["600", "Akureyri"], ["603", "Akureyri"]];
  const products = await db.product.findMany();
  const byId = new Map(products.map((p) => [p.id, p]));
  const subPct: Record<string, number> = { [boxes.classic]: 5, [boxes.grande]: 10, [boxes.delux]: 15 };

  const customers = [];
  for (let i = 0; i < 26; i++) {
    const f = first[i % first.length];
    const l = pick(last);
    const [pc, city] = pick(towns);
    customers.push(
      await db.customer.create({
        data: {
          email: `${f.toLowerCase().replace(/[^a-z]/g, "")}${i}@${DEMO_DOMAIN}`,
          name: `${f} ${l}`, phone: `6${Math.floor(100000 + rnd() * 899999)}`, postalCode: pc, city, street: `Prufugata ${1 + Math.floor(rnd() * 60)}`,
          notes: "PRUFUGÖGN", marketingOptIn: rnd() > 0.5,
        },
      })
    );
  }

  let number = firstNumber;
  const now = Date.now();
  for (let i = 0; i < 70; i++) {
    const c = pick(customers);
    const box = pick([boxes.classic, boxes.classic, boxes.grande, boxes.grande, boxes.delux]);
    const isSub = rnd() < 0.42;
    const lines: { productId: string; qty: number; sub: boolean }[] = [{ productId: box, qty: 1, sub: isSub }];
    // Mynstur fyrir "keyptu líka": granóla fylgir oft Classic, hunang Delúx, mangó Grande
    if (box === boxes.classic && items["granola-med-blaberjum"] && rnd() < 0.55) lines.push({ productId: items["granola-med-blaberjum"], qty: 1, sub: false });
    if (box === boxes.delux && items["hunang"] && rnd() < 0.6) lines.push({ productId: items["hunang"], qty: 1, sub: false });
    if (box === boxes.grande && items["thurrkad-mango"] && rnd() < 0.5) lines.push({ productId: items["thurrkad-mango"], qty: 1 + Math.floor(rnd() * 2), sub: false });
    if (items["half-thurrkadar-fikjur"] && rnd() < 0.25) lines.push({ productId: items["half-thurrkadar-fikjur"], qty: 1, sub: false });
    if (items["granola-med-sukkuladi"] && rnd() < 0.15) lines.push({ productId: items["granola-med-sukkuladi"], qty: 1, sub: false });

    const priced = lines.map((l) => {
      const p = byId.get(l.productId)!;
      const unit = l.sub ? Math.round((p.price * (100 - (subPct[p.id] ?? 0))) / 100) : p.price;
      return { ...l, unit, name: p.name + (l.sub ? " (áskrift)" : ""), sku: p.sku };
    });
    const subtotal = priced.reduce((s, l) => s + l.unit * l.qty, 0);
    const daysAgo = Math.floor(rnd() * 60);
    const created = new Date(now - daysAgo * 86400000 - Math.floor(rnd() * 36000000));
    const delivered = daysAgo > 10;
    await db.order.create({
      data: {
        number: number++, customerId: c.id, email: c.email, name: c.name, phone: c.phone, street: c.street, postalCode: c.postalCode, city: c.city,
        status: delivered ? "DELIVERED" : daysAgo > 3 ? "PROCESSING" : "NEW", paymentStatus: "PAID", paymentMethod: "Prufugögn",
        subtotal, total: subtotal, deliveryMethod: rnd() < 0.7 ? "PIKKOLO" : "HOME",
        pikkoloStationName: "Prufustöð", source: "WEB", createdAt: created, internalNote: "PRUFUGÖGN",
        deliveryId: delivered ? null : deliveryId,
        items: { create: priced.map((l) => ({ productId: l.productId, name: l.name, sku: l.sku, unitPrice: l.unit, quantity: l.qty, isSubscription: l.sub })) },
      },
    });
    if (isSub && !(await db.subscription.findFirst({ where: { customerId: c.id, productId: box } }))) {
      const p = byId.get(box)!;
      await db.subscription.create({
        data: {
          customerId: c.id, productId: box, quantity: 1, everyNthDelivery: rnd() < 0.7 ? 1 : 2, unitPrice: p.price, discountPct: subPct[box],
          status: rnd() < 0.8 ? "ACTIVE" : rnd() < 0.5 ? "PAUSED" : "CANCELLED", deliveryMethod: "PIKKOLO", pikkoloStationName: "Prufustöð",
          source: "WEB", createdAt: created, cancelReason: "",
        },
      });
    }
  }

  // Atburðir svo greiningarsíðan sýni eitthvað (merktir demo)
  const evs: [string, number][] = [["product_viewed", 640], ["fruit_info_opened", 210], ["add_to_cart", 190], ["upsell_shown", 96], ["upsell_accepted", 31], ["upsell_declined", 65], ["checkout_started", 120], ["order_completed", 70], ["subscription_started", 29], ["cart_converted_to_subscription", 14]];
  for (const [name, n] of evs) {
    const rows = Array.from({ length: n }, () => ({
      name, sessionId: `demo-${Math.floor(rnd() * 400)}`, productId: name === "product_viewed" ? pick(products).id : null,
      props: JSON.stringify({ demo: true }), createdAt: new Date(now - Math.floor(rnd() * 30) * 86400000),
    }));
    await db.analyticsEvent.createMany({ data: rows });
  }
  await db.discountCode.upsert({ where: { code: "PRUFA10" }, create: { code: "PRUFA10", description: "Prufukóði: 10% afsláttur (PRUFUGÖGN)", type: "PERCENT", value: 10 }, update: { active: true } });
  await db.setting.upsert({ where: { key: "demo.seeded" }, create: { key: "demo.seeded", value: "true" }, update: { value: "true" } });
  await db.activityLog.create({ data: { kind: "system", level: "info", message: "Prufugögn sett inn. Hægt er að eyða þeim undir Stillingar → Prufugögn." } });
}

