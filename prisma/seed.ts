/* Grunngögn fyrir Fincafresh.
 * Vörur, verð og textar eru af mockup-inu (sem byggði á núverandi fincafresh.is).
 * Prufupantanir/-viðskiptavinir eru merkt "PRUFUGÖGN" og netföng enda á @prufa.fincafresh.is,
 * svo hægt sé að eyða þeim með einum takka í stjórnborðinu (Stillingar → Prufugögn).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DEMO_DOMAIN = "prufa.fincafresh.is";

async function main() {
  // ── Stjórnandi ───────────────────────────────────────────────
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@fincafresh.is").toLowerCase();
  const adminPw = process.env.ADMIN_PASSWORD || "fincafresh";
  if (!(await db.adminUser.findUnique({ where: { email: adminEmail } }))) {
    await db.adminUser.create({ data: { email: adminEmail, name: "Fincafresh", passwordHash: await bcrypt.hash(adminPw, 10) } });
    console.log(`Stjórnandi búinn til: ${adminEmail}`);
  }

  if ((await db.product.count()) > 0) {
    console.log("Gögn eru þegar til, sleppi vöru- og prufugögnum.");
    return;
  }

  // ── Flokkar ──────────────────────────────────────────────────
  const cats = ["Kassar", "Olíur & krukkur", "Heilsubiti", "Súkkulaði", "Þurrkað", "Te & krydd", "Gjafavara"];
  const slug = (s: string) =>
    s.toLowerCase().replace(/[áàâ]/g, "a").replace(/é/g, "e").replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u").replace(/ý/g, "y")
      .replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").replace(/ö/g, "o").replace(/&/g, "og").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const catId: Record<string, string> = {};
  for (const [i, name] of cats.entries()) {
    const c = await db.category.create({ data: { name, slug: slug(name), sortOrder: i } });
    catId[name] = c.id;
  }

  // ── Kassar ───────────────────────────────────────────────────
  const classic = await db.product.create({
    data: {
      slug: "finca-classic", sku: "FF-CLASSIC", name: "Finca Classic", type: "BOX", tier: "CLASSIC",
      tagline: "2,5 kg · hentar 1–2",
      shortDescription: "Úrval af ferskum, handvöldum og árstíðabundnum ávöxtum.",
      description: "Þessi 2,5 kg ávaxtakassi inniheldur úrval af ferskum, handvöldum og árstíðabundnum ávöxtum, beint frá völdum bændum á Spáni.",
      features: JSON.stringify(["Árstíðabundið úrval", "Handvalið hjá bóndanum"]),
      images: JSON.stringify(["/images/classic-stor.webp", "/images/kassi-2.webp", "/images/kassi-3.webp", "/images/mango-kassi.webp"]),
      price: 5999, subscriptionDiscountPct: 5, weightLabel: "2,5 kg", suitsFor: "1–2", sortOrder: 1, categoryId: catId["Kassar"],
    },
  });
  const grande = await db.product.create({
    data: {
      slug: "finca-grande", sku: "FF-GRANDE", name: "Finca Grande", type: "BOX", tier: "GRANDE",
      tagline: "4 kg · hentar 3+",
      shortDescription: "Alveg eins og Finca Classic, nema bara stærri!",
      description: "Finca Grande er 4 kg kassi með sama árstíðabundna úrvalinu og Finca Classic, í meira magni. Frábær fyrir fjölskylduna.",
      features: JSON.stringify(["Sama úrval, meira magn", "Frábær fyrir fjölskylduna"]),
      images: JSON.stringify(["/images/box-grande.webp", "/images/kassi-3.webp", "/images/kassi-2.webp"]),
      price: 7999, subscriptionDiscountPct: 10, weightLabel: "4 kg", suitsFor: "3+", sortOrder: 2, categoryId: catId["Kassar"],
    },
  });
  const delux = await db.product.create({
    data: {
      slug: "finca-delux", sku: "FF-DELUX", name: "Finca Delúx", type: "BOX", tier: "DELUX",
      tagline: "Sælkerakassi · hentar 3+",
      shortDescription: "Það allra besta sem Fincafresh býður upp á hverju sinni.",
      description: "Delúx kassinn er sælkerakassinn okkar. Hann inniheldur allt sem er í Grande kassanum og að auki sérvalda aukaávexti sem fást aðeins í Delúx.",
      features: JSON.stringify(["Aukaávextir sem fást aðeins í Delúx", "15% afsláttur í áskrift"]),
      images: JSON.stringify(["/images/box-delux.webp", "/images/kassi-2.webp"]),
      price: 9999, compareAtPrice: 10499, subscriptionDiscountPct: 15, weightLabel: "Sælkerakassi", suitsFor: "3+", sortOrder: 3, featured: true, categoryId: catId["Kassar"],
    },
  });

  // ── Netverslun ───────────────────────────────────────────────
  const items = [
    { slug: "granola-med-blaberjum", name: "Granóla með bláberjum", price: 1799, short: "Handgert, með möndlum, kínóa og lífrænu hunangi.", img: "granola-blaber.webp", cat: "Heilsubiti", featured: true },
    { slug: "thurrkad-mango", name: "Þurrkað mangó", price: 1299, short: "Ekkert sykurbætt, bara mangó!", img: "thurrkad-mango.webp", cat: "Þurrkað", featured: true },
    { slug: "hunang", name: "Hunang – 100% hreint", price: 5999, short: "Hrátt og óhitað villiblómahunang, í mjög takmörkuðu magni.", img: "hunang.webp", cat: "Olíur & krukkur", featured: true },
    { slug: "half-thurrkadar-fikjur", name: "Hálf-þurrkaðar fíkjur", price: 699, short: "Bóndinn þurrkar og pakkar sjálfur fyrir okkur.", img: "fikjur.webp", cat: "Þurrkað", featured: true },
    { slug: "granola-med-sukkuladi", name: "Granóla með súkkulaði", price: 1799, short: "Handgert, með pistasíuhnetum og heslihnetum.", img: "granola-sukkuladi.webp", cat: "Heilsubiti", featured: false },
  ];
  const itemIds: Record<string, string> = {};
  for (const [i, it] of items.entries()) {
    const p = await db.product.create({
      data: {
        slug: it.slug, sku: "FF-" + it.slug.toUpperCase().slice(0, 18), name: it.name, type: "ITEM",
        shortDescription: it.short, description: it.short, images: JSON.stringify([`/images/${it.img}`]),
        price: it.price, featured: it.featured, sortOrder: i, storageType: "Ambient", categoryId: catId[it.cat],
      },
    });
    itemIds[it.slug] = p.id;
  }

  // ── Ávextir (textar eru drög: merkt "ekki yfirfarið" í stjórnborði) ──
  const fruits = [
    { slug: "mango-kent", name: "Mango Kent", variety: "Kent", illustration: "mango", color: "#F6A623", season: "Sumar og haust",
      description: "Kent er eitt vinsælasta mangóafbrigðið. Aldinkjötið er safaríkt og nánast trefjalaust, svo það er auðvelt að skera og borða.",
      taste: "Sætt og djúpt bragð.", ripeness: "Þroskað mangó gefur aðeins eftir þegar þrýst er létt á það og ilmar sætt við stilkinn. Áferðin segir meira um þroska en liturinn.",
      storage: "Geymdu við stofuhita þar til það er þroskað, svo í kæli í 2–3 daga.", goodToKnow: "Hýðið fær oft rauðan roða þar sem sólin skín á ávöxtinn." },
    { slug: "mandarina-oronules", name: "Mandarina Oronules", variety: "Oronules", illustration: "mandarin", color: "#F28A1E", season: "Haust",
      description: "Oronules er snemmbúið klementínuafbrigði sem á rætur að rekja til Nules í Valencia-héraði á Spáni.",
      taste: "Safarík og sæt.", ripeness: "Tilbúin til neyslu um leið og hún kemur.", storage: "Geymist í kæli í 1–2 vikur, eða í skál á borðinu í nokkra daga.",
      goodToKnow: "Auðvelt að afhýða, fullkomin í nestisboxið." },
    { slug: "mango-keitt", name: "Mango Keitt", variety: "Keitt", illustration: "mango-green", color: "#8CBF3F", season: "Haust",
      description: "Keitt er stórt mangóafbrigði sem er tínt seint á tímabilinu.",
      taste: "Sætt og ferskt, með þéttu aldinkjöti.", ripeness: "Keitt helst grænt þótt það sé fullþroskað. Ekki láta litinn blekkja þig, finndu frekar hvort það gefur aðeins eftir.",
      storage: "Við stofuhita þar til það er þroskað, svo í kæli.", goodToKnow: "Grænt hýði þýðir ekki að það sé óþroskað." },
    { slug: "granatepli", name: "Granatepli", variety: "", illustration: "pomegranate", color: "#C8283A", season: "Haust",
      description: "Inni í hörðu hýðinu eru hundruð safaríkra kjarna.", taste: "Sætt og örlítið súrt.",
      ripeness: "Þungt granatepli miðað við stærð er yfirleitt safaríkt.", storage: "Geymist vel í kæli í nokkrar vikur.",
      goodToKnow: "Skerðu granateplið í tvennt og bankaðu á hýðið með skeið yfir skál, þá detta kjarnarnir út." },
    { slug: "avokado-bacon", name: "Avókadó Bacon", variety: "Bacon", illustration: "avocado", color: "#2F5A22", season: "Vetur",
      description: "Bacon er vetrarafbrigði með þunnu, sléttu, grænu hýði sem helst grænt þegar avókadóið þroskast.",
      taste: "Létt og milt.", ripeness: "Tilbúið þegar það gefur eftir við léttan þrýsting.", storage: "Við stofuhita þar til það er þroskað, svo í kæli í 2–3 daga.",
      goodToKnow: "Settu það í bréfpoka með epli til að flýta fyrir þroskanum." },
    { slug: "kiwi", name: "Kiwi", variety: "", illustration: "kiwi", color: "#7CB342", season: "Vetur og vor",
      description: "Kíví er ríkt af C-vítamíni.", taste: "Ferskt, sætt og örlítið súrt.",
      ripeness: "Þroskað kíví gefur aðeins eftir við léttan þrýsting.", storage: "Geymist í kæli í nokkrar vikur.",
      goodToKnow: "Kíví þroskast hraðar við stofuhita við hliðina á eplum eða banönum." },
    { slug: "epli", name: "Epli", variety: "", illustration: "apple", color: "#D9342B", season: "Haust og vetur",
      description: "Stökk og safarík epli.", taste: "Sæt og fersk.", ripeness: "Tilbúin til neyslu.",
      storage: "Geymdu epli í kæli, þá haldast þau stökk lengur.", goodToKnow: "Epli gefa frá sér etýlen sem flýtir fyrir þroska annarra ávaxta. Geymdu þau sér ef þú vilt hægja á þroskanum." },
    { slug: "sitrona", name: "Sítróna", variety: "", illustration: "lemon", color: "#F9C214", season: "Allt árið",
      description: "Fersk sítróna, tákn Fincafresh.", taste: "Súr og fersk.", ripeness: "Tilbúin til notkunar.",
      storage: "Geymist í kæli í 2–3 vikur.", goodToKnow: "Rúllaðu sítrónunni á borðinu áður en þú kreistir hana, þá færðu meiri safa." },
    { slug: "chirimoya", name: "Chirimoya", variety: "", illustration: "cherimoya", color: "#9BBF5A", season: "Haust og vetur",
      description: "Chirimoya er ræktuð á Costa Tropical á Suður-Spáni og hefur rjómakennt aldinkjöt.", taste: "Sætt og rjómakennt.",
      ripeness: "Þroskuð þegar hún gefur eftir við léttan þrýsting og hýðið dökknar aðeins.", storage: "Við stofuhita þar til hún er þroskuð, svo í kæli í 1–2 daga.",
      goodToKnow: "Fræin eru ekki æt. Skerðu ávöxtinn í tvennt og borðaðu aldinkjötið með skeið." },
    { slug: "kaki", name: "Kakí", variety: "", illustration: "persimmon", color: "#F27B1F", season: "Haust",
      description: "Kakí (persimmon) er appelsínugulur haustávöxtur.", taste: "Sætt og hunangskennt.",
      ripeness: "Fer eftir afbrigði; spurðu okkur ef þú ert í vafa.", storage: "Geymist í kæli í nokkra daga.", goodToKnow: "" },
  ];
  const fruitId: Record<string, string> = {};
  for (const f of fruits) {
    const r = await db.fruit.create({ data: { ...f, origin: "Spánn", reviewed: false } });
    fruitId[f.slug] = r.id;
  }

  // ── Næsta sending (dagsetning er dæmi; stillt í stjórnborði) ──
  const nextDate = nextWeekday(4, 10); // fimmtudagur, a.m.k. 10 dögum héðan
  const cutoff = new Date(nextDate);
  cutoff.setDate(cutoff.getDate() - 4);
  const delivery = await db.delivery.create({ data: { date: nextDate, cutoffDate: cutoff, title: "Næsta sending", status: "PLANNED" } });
  const inDelivery: [string, boolean][] = [
    ["mango-kent", false], ["mandarina-oronules", false], ["mango-keitt", false], ["granatepli", false], ["epli", false],
    ["avokado-bacon", true], ["kiwi", true], ["chirimoya", true],
  ];
  for (const [i, [s, deluxe]] of inDelivery.entries()) {
    await db.deliveryFruit.create({ data: { deliveryId: delivery.id, fruitId: fruitId[s], deluxeOnly: deluxe, sortOrder: i } });
  }

  // ── Handvalin meðmæli ────────────────────────────────────────
  await db.recommendationPin.create({ data: { productId: delux.id, recommendedProductId: itemIds["hunang"], sortOrder: 0 } });

  // ── Prufugögn ────────────────────────────────────────────────
  await seedDemo({ classic: classic.id, grande: grande.id, delux: delux.id }, itemIds, delivery.id);

  console.log("Grunngögn komin inn.");
}

function nextWeekday(weekday: number, minDays: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + minDays);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return d;
}

// Fyrirsjáanleg slembitala svo prufugögn séu alltaf eins
let seed = 42;
function rnd() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function pick<T>(a: T[]): T {
  return a[Math.floor(rnd() * a.length)];
}

async function seedDemo(boxes: { classic: string; grande: string; delux: string }, items: Record<string, string>, deliveryId: string) {
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

  let number = 10001;
  const now = Date.now();
  for (let i = 0; i < 70; i++) {
    const c = pick(customers);
    const box = pick([boxes.classic, boxes.classic, boxes.grande, boxes.grande, boxes.delux]);
    const isSub = rnd() < 0.42;
    const lines: { productId: string; qty: number; sub: boolean }[] = [{ productId: box, qty: 1, sub: isSub }];
    // Mynstur fyrir "keyptu líka": granóla fylgir oft Classic, hunang Delúx, mangó Grande
    if (box === boxes.classic && rnd() < 0.55) lines.push({ productId: items["granola-med-blaberjum"], qty: 1, sub: false });
    if (box === boxes.delux && rnd() < 0.6) lines.push({ productId: items["hunang"], qty: 1, sub: false });
    if (box === boxes.grande && rnd() < 0.5) lines.push({ productId: items["thurrkad-mango"], qty: 1 + Math.floor(rnd() * 2), sub: false });
    if (rnd() < 0.25) lines.push({ productId: items["half-thurrkadar-fikjur"], qty: 1, sub: false });
    if (rnd() < 0.15) lines.push({ productId: items["granola-med-sukkuladi"], qty: 1, sub: false });

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
  await db.discountCode.create({ data: { code: "PRUFA10", description: "Prufukóði: 10% afsláttur (PRUFUGÖGN)", type: "PERCENT", value: 10 } });
  await db.setting.upsert({ where: { key: "demo.seeded" }, create: { key: "demo.seeded", value: "true" }, update: { value: "true" } });
  await db.activityLog.create({ data: { kind: "system", level: "info", message: "Prufugögn sett inn. Hægt er að eyða þeim undir Stillingar → Prufugögn." } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
