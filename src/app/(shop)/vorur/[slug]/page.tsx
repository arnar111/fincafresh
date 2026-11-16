import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getBoxes } from "@/lib/catalog";
import { recommendFor } from "@/lib/recommendations";
import { liteProduct } from "@/lib/lite";
import { kr } from "@/lib/format";
import { Crumbs } from "@/components/shop/sections/PageIntro";
import { Section, Eyebrow, H2 } from "@/components/shop/sections/Section";
import { Gallery } from "@/components/shop/Gallery";
import { ProductCard } from "@/components/shop/ProductCard";
import { ItemPurchase } from "@/components/shop/ItemPurchase";
import { TrackView } from "@/components/shop/TrackView";
import { Icon } from "@/components/ui/Icon";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  return p ? { title: p.name, description: p.shortDescription, openGraph: { images: [p.image] } } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  if (p.type === "BOX") redirect(`/kassar/${p.slug}`);
  const [recs, boxes] = await Promise.all([recommendFor([p.id], 4), getBoxes()]);
  const cheapest = boxes.length ? boxes.reduce((a, b) => (a.subPrice < b.subPrice ? a : b)) : null;

  return (
    <>
      <TrackView productId={p.id} props={{ slug: p.slug, type: "ITEM" }} />
      <Crumbs items={[{ href: "/", label: "Forsíða" }, { href: "/netverslun", label: "Netverslun" }, ...(p.category ? [{ href: `/netverslun?flokkur=${p.category.slug}`, label: p.category.name }] : []), { href: `/vorur/${p.slug}`, label: p.name }]} />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">
        <Gallery images={p.imageList} alt={p.name} />
        <div>
          {p.category ? <div className="text-xs font-bold uppercase tracking-[.14em] text-orange-600">{p.category.name}</div> : null}
          <h1 className="mt-2 font-display text-4xl leading-tight text-burgundy sm:text-5xl">{p.name}</h1>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{kr(p.price)}</span>
            {p.compareAtPrice ? <span className="text-muted line-through">{kr(p.compareAtPrice)}</span> : null}
          </div>
          <p className="mt-4 whitespace-pre-line text-lg text-ink/80">{p.description || p.shortDescription}</p>
          {p.trackStock && p.stock !== null && p.stock <= 5 ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange/15 px-3 py-1 text-sm font-semibold text-orange-600">
              <Icon name="info" className="h-4 w-4" /> {p.stock > 0 ? `Aðeins ${p.stock} eftir` : "Uppselt í bili"}
            </p>
          ) : null}
          <div className="mt-6">
            <ItemPurchase product={liteProduct(p)} soldOut={p.trackStock && (p.stock ?? 0) <= 0} />
          </div>
          {cheapest ? (
            <Link href="/askrift" className="mt-8 flex items-center gap-4 rounded-2xl bg-pink-100 p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-burgundy"><Icon name="repeat" /></span>
              <span className="text-[15px]">
                <strong className="block text-burgundy">Bættu við ávaxtakassa í áskrift</strong>
                Frá {kr(cheapest.subPrice)} á kassa. Varan kemur þá með í sömu sendingu.
              </span>
              <Icon name="arrow" className="ml-auto h-5 w-5 shrink-0 text-burgundy" />
            </Link>
          ) : null}
        </div>
      </div>
      {recs.length ? (
        <Section tone="light">
          <Eyebrow>Þeir sem keyptu þetta keyptu líka</Eyebrow>
          <H2>Aðrir keyptu líka</H2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
            {recs.map((r) => <ProductCard key={r.id} product={liteProduct(r)} />)}
          </div>
        </Section>
      ) : null}
    </>
  );
}
