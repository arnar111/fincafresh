/* Grunngögn verslunarinnar: flokkar, kassarnir þrír, netverslunarvörur, ávextir og næsta sending.
 * Vörur, verð og textar eru af mockup-inu (sem byggði á núverandi fincafresh.is).
 * Notað af prisma/seed.ts (eigin vél) og til að búa til SQL-migration fyrir Netlify Database.
 * ATH: Má ekki flytja inn "server-only" því skráin er líka keyrð beint með tsx.
 */
import type { PrismaClient } from "@prisma/client";

export async function seedCatalog(db: PrismaClient) {
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

}

function nextWeekday(weekday: number, minDays: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + minDays);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return d;
}
