import Image from "next/image";
import Link from "next/link";
import { getBoxes, getCategories, getFeaturedProducts, getNextDelivery, getOrderableDelivery } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";
import { liteFruit, liteProduct, findDelux } from "@/lib/lite";
import { dateWithDayAcc } from "@/lib/format";
import { Hero } from "@/components/shop/sections/Hero";
import { Section, Eyebrow, H2 } from "@/components/shop/sections/Section";
import { FruitShowcase } from "@/components/shop/FruitShowcase";
import { BoxChooser } from "@/components/shop/BoxChooser";
import { ProductCard } from "@/components/shop/ProductCard";
import { SubscriptionPitch } from "@/components/shop/sections/SubscriptionPitch";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default async function HomePage() {
  const [boxesRaw, next, orderable, featured, categories, hero, story, b2b] = await Promise.all([
    getBoxes(),
    getNextDelivery(),
    getOrderableDelivery(),
    getFeaturedProducts(4),
    getCategories(),
    getSetting("content.hero"),
    getSetting("content.story"),
    getSetting("content.b2b"),
  ]);
  const boxes = boxesRaw.map(liteProduct);
  const delux = boxes.length ? findDelux(boxes) : null;
  const fruits = next?.fruits.map((f) => liteFruit(f.fruit, f.deluxeOnly)) ?? [];
  const maxPct = Math.max(0, ...boxes.map((b) => b.subDiscountPct));
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const daysToCutoff = next?.cutoffDate ? Math.round((new Date(next.cutoffDate).setHours(0, 0, 0, 0) - startToday.getTime()) / 86400000) : null;

  return (
    <>
      <Hero hero={hero} nextDate={next?.date ?? null} nextFruits={fruits.filter((f) => !f.deluxeOnly).map((f) => f.name)} maxPct={maxPct} />

      <Section id="naesta-sending" tone="light" className="scroll-mt-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Í kassanum núna</Eyebrow>
            <H2>Hvað er í næstu sendingu?</H2>
            <p className="mt-2 max-w-2xl text-[16.5px] text-muted">
              {next ? (
                <>
                  Sendingin kemur <strong className="text-ink">{dateWithDayAcc(next.date)}</strong>
                  {next.cutoffDate && daysToCutoff !== null && daysToCutoff < 0 ? (
                    <> · pöntunarfrestur fyrir hana er liðinn og nýjar pantanir fara í {orderable && orderable.id !== next.id ? <>sendinguna <strong className="text-ink">{dateWithDayAcc(orderable.date)}</strong></> : "næstu sendingu á eftir"}</>
                  ) : null}
                  {next.cutoffDate && daysToCutoff !== null && daysToCutoff >= 0 ? (
                    <> · pantaðu fyrir <strong className="text-ink">{dateWithDayAcc(next.cutoffDate)}</strong>{daysToCutoff <= 3 ? <span className="ml-1 rounded-full bg-orange/15 px-2 py-0.5 text-sm font-semibold text-orange-600">{daysToCutoff === 0 ? "síðasti dagur!" : daysToCutoff === 1 ? "1 dagur eftir" : `${daysToCutoff} dagar eftir`}</span> : null}</>
                  ) : null}
                  . Smelltu á ávöxt til að lesa meira um hann.
                </>
              ) : (
                "Innihaldið breytist eftir því hvað er í árstíð hverju sinni."
              )}
            </p>
          </div>
          <Link href="/kassar" className="inline-flex items-center gap-1.5 font-semibold text-burgundy hover:underline">
            Sjá allt um kassana <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
        {fruits.length ? (
          <FruitShowcase fruits={fruits} delux={delux} />
        ) : (
          <p className="rounded-2xl bg-white p-6 text-center text-muted">Innihald næstu sendingar verður kynnt fljótlega.</p>
        )}
      </Section>

      <Section id="kassar">
        <div className="mb-8 text-center">
          <Eyebrow>Kassarnir</Eyebrow>
          <H2>Veldu kassa sem hentar þér</H2>
          <p className="mx-auto mt-3 max-w-xl text-[16.5px] text-muted">Stakur kassi eða áskrift. Áskrifendur fá allt að {maxPct}% afslátt af hverjum kassa og enginn binditími.</p>
        </div>
        <BoxChooser boxes={boxes} />
      </Section>

      <Section tone="green">
        <Eyebrow className="text-lemon">Svona virkar þetta</Eyebrow>
        <h2 className="font-display text-[2rem] leading-tight text-cream sm:text-[2.6rem]">Frá bóndanum til þín á um 10 dögum</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            ["01", "Veldu kassa", "Classic, Grande eða Delúx. Stakur kassi eða áskrift með afslætti."],
            ["02", "Tínt í árstíð", "Við verslum beint við bændur á Spáni og bjóðum aðeins það sem er í árstíð hverju sinni."],
            ["03", "Ferskt til þín", "Ávextirnir eru um 10 daga gamlir þegar þeir koma til þín. Sæktu í Pikkoló eða fáðu heimsent."],
          ].map(([n, t, d]) => (
            <li key={n} className="border-t border-cream/25 pt-5">
              <div className="font-display text-4xl italic text-lemon">{n}</div>
              <h3 className="mt-2 font-display text-2xl text-cream">{t}</h3>
              <p className="mt-2 text-[15.5px] text-cream/80">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <SubscriptionPitch boxes={boxes} />

      {featured.length ? (
        <Section>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Netverslun</Eyebrow>
              <H2>Vinsælar vörur</H2>
            </div>
            <ButtonLink href="/netverslun" variant="outline">Skoða allar vörur</ButtonLink>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
            {featured.map((p) => (
              <ProductCard key={p.id} product={liteProduct(p)} />
            ))}
          </div>
        </Section>
      ) : null}

      <Section tone="light" className="py-12 sm:py-14">
        <h2 className="mb-5 font-display text-2xl text-burgundy sm:text-3xl">Vinsælir flokkar</h2>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/kassar" className="rounded-full border border-line bg-white px-5 py-2.5 font-medium text-ink transition hover:border-burgundy hover:text-burgundy">Kassar</Link>
          {categories.filter((c) => c.slug !== "kassar" && c._count.products > 0).map((c) => (
            <Link key={c.id} href={`/netverslun?flokkur=${c.slug}`} className="rounded-full border border-line bg-white px-5 py-2.5 font-medium text-ink transition hover:border-burgundy hover:text-burgundy">
              {c.name}
            </Link>
          ))}
          <Link href="/fyrirtaekjathjonusta" className="rounded-full border border-line bg-white px-5 py-2.5 font-medium text-ink transition hover:border-burgundy hover:text-burgundy">Fyrirtækjaþjónusta</Link>
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[1.2] overflow-hidden rounded-[2rem] shadow-soft">
            <Image src="/images/sagan-okkar.webp" alt="Stofnendur Fincafresh með appelsínur hjá bónda á Spáni" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div>
            <Eyebrow>Sagan okkar</Eyebrow>
            <H2>{story.title}</H2>
            {story.body.split("\n\n").map((p, i) => (
              <p key={i} className="mt-4 text-[16.5px] text-ink/80">{p}</p>
            ))}
            <ButtonLink href="/um-okkur" variant="outline" className="mt-6">Lesa söguna okkar</ButtonLink>
          </div>
        </div>
      </Section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] bg-sand p-6 sm:p-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <Eyebrow className="text-green">Fyrirtækjaþjónusta</Eyebrow>
            <h2 className="font-display text-3xl leading-tight text-burgundy sm:text-4xl">{b2b.title}</h2>
            <p className="mt-3 max-w-lg text-[16.5px] text-ink/80">{b2b.body}</p>
            <ButtonLink href="/fyrirtaekjathjonusta" className="mt-6">Fá tilboð</ButtonLink>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[1.5rem]">
            <Image src="/images/fyrirtaeki.webp" alt="Fincafresh kassar fyrir vinnustaði" fill sizes="384px" className="object-cover" />
          </div>
        </div>
      </div>
    </>
  );
}
