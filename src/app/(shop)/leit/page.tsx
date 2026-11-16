import type { Metadata } from "next";
import { searchProducts } from "@/lib/catalog";
import { db } from "@/lib/db";
import { liteProduct } from "@/lib/lite";
import { PageIntro } from "@/components/shop/sections/PageIntro";
import { ProductCard } from "@/components/shop/ProductCard";
import Link from "next/link";
import { FruitArt } from "@/components/brand/FruitArt";

export const metadata: Metadata = { title: "Leit", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const [products, fruits] = q
    ? await Promise.all([searchProducts(q), db.fruit.findMany({ where: { active: true, OR: [{ name: { contains: q } }, { description: { contains: q } }] }, take: 8 })])
    : [[], []];
  return (
    <>
      <PageIntro title={q ? `Leitarniðurstöður fyrir „${q}“` : "Leit"}>
        <form action="/leit" className="mt-2 flex max-w-xl gap-2">
          <label htmlFor="leit" className="sr-only">Leitarorð</label>
          <input id="leit" name="q" defaultValue={q} placeholder="T.d. mangó eða granóla" className="w-full rounded-full border border-line bg-white px-4 py-3 text-base focus:border-burgundy focus:outline-none" />
          <button className="rounded-full bg-burgundy px-5 font-semibold text-cream">Leita</button>
        </form>
      </PageIntro>
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        {q && !products.length && !fruits.length ? <p className="rounded-2xl bg-white p-8 text-center text-muted">Ekkert fannst. Prófaðu annað leitarorð.</p> : null}
        {fruits.length ? (
          <div className="mb-10">
            <h2 className="mb-4 font-display text-2xl text-burgundy">Ávextir</h2>
            <div className="flex flex-wrap gap-3">
              {fruits.map((f) => (
                <Link key={f.id} href="/#naesta-sending" className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 font-medium hover:shadow-soft">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-cream"><FruitArt kind={f.illustration} className="h-7 w-7" /></span>
                  {f.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {products.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={liteProduct(p)} />)}
          </div>
        ) : null}
      </div>
    </>
  );
}
