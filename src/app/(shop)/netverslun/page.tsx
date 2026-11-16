import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, getShopProducts } from "@/lib/catalog";
import { liteProduct } from "@/lib/lite";
import { PageIntro } from "@/components/shop/sections/PageIntro";
import { ProductCard } from "@/components/shop/ProductCard";
import { cn } from "@/components/ui/cn";

export const metadata: Metadata = { title: "Netverslun", description: "Granóla, þurrkaðir ávextir, hunang og fleira beint frá bændum á Spáni." };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ flokkur?: string }> }) {
  const { flokkur } = await searchParams;
  const [products, categories] = await Promise.all([getShopProducts(flokkur), getCategories()]);
  const cats = categories.filter((c) => c.slug !== "kassar" && c._count.products > 0);
  const chip = (active: boolean) => cn("rounded-full border px-4 py-2 text-[15px] font-medium transition", active ? "border-burgundy bg-burgundy text-cream" : "border-line bg-white text-ink hover:border-burgundy");
  return (
    <>
      <PageIntro eyebrow="Netverslun" title="Gott með ávöxtunum" crumbs={[{ href: "/", label: "Forsíða" }, { href: "/netverslun", label: "Netverslun" }]}>
        Vörur sem bændurnir okkar framleiða sjálfir. Bættu þeim við kassann eða pantaðu stakar.
      </PageIntro>
      <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2" role="navigation" aria-label="Flokkar">
          <Link href="/netverslun" className={chip(!flokkur)}>Allt</Link>
          {cats.map((c) => <Link key={c.id} href={`/netverslun?flokkur=${c.slug}`} className={chip(flokkur === c.slug)}>{c.name}</Link>)}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        {products.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {products.map((p) => <ProductCard key={p.id} product={liteProduct(p)} />)}
          </div>
        ) : (
          <p className="rounded-2xl bg-white p-8 text-center text-muted">Engar vörur í þessum flokki eins og er.</p>
        )}
      </div>
    </>
  );
}
