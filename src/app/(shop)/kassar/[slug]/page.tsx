import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBoxes, getNextDelivery, getProductBySlug } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";
import { recommendFor } from "@/lib/recommendations";
import { liteFruit, liteProduct, findDelux } from "@/lib/lite";
import { dateWithDayAcc } from "@/lib/format";
import { Crumbs } from "@/components/shop/sections/PageIntro";
import { Section, Eyebrow, H2 } from "@/components/shop/sections/Section";
import { Gallery } from "@/components/shop/Gallery";
import { BoxPurchase } from "@/components/shop/BoxPurchase";
import { FruitShowcase } from "@/components/shop/FruitShowcase";
import { ProductCard } from "@/components/shop/ProductCard";
import { TrackView } from "@/components/shop/TrackView";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  return p ? { title: p.name, description: p.shortDescription, openGraph: { images: [p.image] } } : {};
}

export default async function BoxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || p.type !== "BOX") notFound();
  const [raw, next, frequencies, recs] = await Promise.all([getBoxes(), getNextDelivery(), getSetting("subscription.frequencies"), recommendFor([p.id], 4)]);
  const boxes = raw.map(liteProduct);
  const box = liteProduct(p);
  const delux = findDelux(boxes);
  const isDelux = p.tier === "DELUX";
  const fruits = next?.fruits.map((f) => liteFruit(f.fruit, f.deluxeOnly)) ?? [];

  return (
    <>
      <TrackView productId={p.id} props={{ slug: p.slug, type: "BOX" }} />
      <Crumbs items={[{ href: "/", label: "Forsíða" }, { href: "/kassar", label: "Kassar" }, { href: `/kassar/${p.slug}`, label: p.name }]} />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">
        <Gallery images={p.imageList} alt={p.name} />
        <div>
          <div className="text-xs font-bold uppercase tracking-[.14em] text-orange-600">{p.tagline}</div>
          <h1 className="mt-2 font-display text-5xl leading-none text-burgundy sm:text-6xl">{p.name}</h1>
          <p className="mt-4 text-lg text-ink/80">{p.description}</p>
          {isDelux && fruits.some((f) => f.deluxeOnly) ? (
            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-gradient-to-r from-lemon-100 to-cream-50 p-4 ring-1 ring-lemon">
              <Icon name="crown" className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
              <div className="text-[15px]">
                <strong className="text-burgundy">Í næstu sendingu fylgja aukalega:</strong>{" "}
                {fruits.filter((f) => f.deluxeOnly).map((f) => f.name).join(", ")}
              </div>
            </div>
          ) : null}
          <div className="mt-7">
            <BoxPurchase box={box} boxes={boxes} frequencies={frequencies} />
          </div>
        </div>
      </div>

      {fruits.length ? (
        <Section tone="light">
          <Eyebrow>Í kassanum núna</Eyebrow>
          <H2>{isDelux ? "Allt þetta er í Delúx kassanum" : "Í næstu sendingu"}</H2>
          <p className="mb-8 mt-2 text-muted">
            {next ? `Sendingin kemur ${dateWithDayAcc(next.date)}. ` : ""}Innihaldið breytist eftir því hvað er í árstíð hverju sinni. Smelltu á ávöxt til að lesa meira.
          </p>
          <FruitShowcase fruits={fruits} delux={isDelux ? null : delux} />
        </Section>
      ) : null}

      {recs.length ? (
        <Section>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Þeir sem keyptu {p.name} keyptu líka</Eyebrow>
              <H2>Passar vel með kassanum</H2>
            </div>
            <ButtonLink href="/netverslun" variant="outline">Skoða allar vörur</ButtonLink>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
            {recs.map((r) => <ProductCard key={r.id} product={liteProduct(r)} />)}
          </div>
        </Section>
      ) : null}
    </>
  );
}
