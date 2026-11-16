import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { kr, parseJsonList } from "@/lib/format";
import { getSetting } from "@/lib/settings";
import { subPriceFor } from "@/lib/catalog";
import { PageHeader, Card, EmptyState, Explainer, th, td, tableClass, tableWrap } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { toggleProductActive } from "./actions";

export const metadata = { title: "Vörur" };

const TABS = [
  { key: "", label: "Allar" },
  { key: "BOX", label: "Kassar" },
  { key: "ITEM", label: "Netverslun" },
  { key: "falin", label: "Faldar" },
];

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ tegund?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tegund ?? "";
  const q = (sp.q ?? "").trim();
  const defPct = await getSetting("subscription.defaultDiscountPct");
  const products = await db.product.findMany({
    where: {
      ...(tab === "BOX" || tab === "ITEM" ? { type: tab } : {}),
      ...(tab === "falin" ? { active: false } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {}),
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { category: true, _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } } },
  });
  const sold = await db.orderItem.groupBy({ by: ["productId"], _sum: { quantity: true }, where: { productId: { in: products.map((p) => p.id) }, order: { status: { not: "CANCELLED" } } } });
  const soldBy = new Map(sold.map((s) => [s.productId, s._sum.quantity ?? 0]));

  const qs = (t: string) => {
    const p = new URLSearchParams();
    if (t) p.set("tegund", t);
    if (q) p.set("q", q);
    return p.size ? `?${p}` : "";
  };

  return (
    <>
      <PageHeader
        title="Vörur"
        description="Ávaxtakassarnir og vörurnar í netversluninni. Smelltu á vöru til að breyta verði, texta eða myndum."
        actions={
          <>
            <ButtonLink href="/admin/vorur/flokkar" variant="light" size="sm"><Icon name="tag" className="h-4 w-4" /> Flokkar</ButtonLink>
            <ButtonLink href="/admin/vorur/ny" variant="primary"><Icon name="plus" className="h-4 w-4" /> Ný vara</ButtonLink>
          </>
        }
      />
      <Explainer>
        <p><strong>Kassar</strong> eru ávaxtakassarnir (Classic, Grande, Delúx). Þá er hægt að kaupa staka eða í áskrift, og áskrifendur fá afslátt sem þú stillir á hverjum kassa.</p>
        <p><strong>Netverslun</strong> eru aðrar vörur, t.d. granóla og hunang. Þær er aðeins hægt að kaupa stakar.</p>
        <p>Viltu fela vöru tímabundið (t.d. ef hún er uppseld)? Smelltu á <em>Fela</em>. Hún hverfur úr versluninni en gögnin haldast.</p>
      </Explainer>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-sm">
          {TABS.map((t) => (
            <Link key={t.key} href={`/admin/vorur${qs(t.key)}`} className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", tab === t.key ? "bg-burgundy text-cream" : "text-burgundy hover:bg-cream")}>
              {t.label}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          {tab ? <input type="hidden" name="tegund" value={tab} /> : null}
          <input name="q" defaultValue={q} placeholder="Leita að vöru…" className="w-56 rounded-full border border-line bg-white px-4 py-2 text-sm" />
        </form>
      </div>

      <Card padded={false}>
        {products.length === 0 ? (
          <EmptyState icon="tag" title="Engar vörur fundust">
            {q ? "Prófaðu annað leitarorð." : <>Smelltu á <strong>Ný vara</strong> til að bæta við, eða sæktu vörurnar úr WooCommerce undir <Link className="underline" href="/admin/tengingar">Tengingar</Link>.</>}
          </EmptyState>
        ) : (
          <div className={tableWrap}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={th}>Vara</th>
                  <th className={th}>Tegund</th>
                  <th className={cn(th, "text-right")}>Verð</th>
                  <th className={cn(th, "text-right")}>Í áskrift</th>
                  <th className={cn(th, "text-right")}>Selt</th>
                  <th className={th}>Staða</th>
                  <th className={th}><span className="sr-only">Aðgerðir</span></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const img = parseJsonList(p.images)[0];
                  const pct = p.subscriptionDiscountPct ?? defPct;
                  return (
                    <tr key={p.id}>
                      <td className={td}>
                        <Link href={`/admin/vorur/${p.id}`} className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img ? <img src={img} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-cream"><Icon name="tag" className="h-5 w-5 text-muted" /></span>}
                          <span>
                            <span className="block font-semibold text-ink hover:text-burgundy">{p.name}</span>
                            <span className="block text-xs text-muted">{p.category?.name ?? "Enginn flokkur"}{p.sku ? ` · ${p.sku}` : ""}</span>
                          </span>
                        </Link>
                      </td>
                      <td className={td}>
                        {p.type === "BOX" ? <Badge tone="pink">Kassi</Badge> : <Badge>Netverslun</Badge>}
                        {p.wooId ? <Badge tone="muted" className="ml-1">Woo</Badge> : null}
                      </td>
                      <td className={cn(td, "text-right tabular-nums")}>
                        {kr(p.price)}
                        {p.compareAtPrice ? <span className="block text-xs text-muted line-through">{kr(p.compareAtPrice)}</span> : null}
                      </td>
                      <td className={cn(td, "text-right tabular-nums")}>
                        {p.type === "BOX" ? (
                          <>
                            {kr(subPriceFor(p.price, pct))}
                            <span className="block text-xs text-muted">−{pct}% · {p._count.subscriptions} virkar</span>
                          </>
                        ) : <span className="text-muted">–</span>}
                      </td>
                      <td className={cn(td, "text-right tabular-nums")}>{soldBy.get(p.id) ?? 0}</td>
                      <td className={td}>
                        {p.active ? <Badge tone="green">Sýnileg</Badge> : <Badge tone="muted">Falin</Badge>}
                        {p.featured ? <Badge tone="lemon" className="ml-1">Vinsæl</Badge> : null}
                        {p.trackStock ? <span className={cn("ml-1 text-xs", (p.stock ?? 0) <= 0 ? "font-semibold text-danger" : "text-muted")}>{p.stock ?? 0} á lager</span> : null}
                      </td>
                      <td className={cn(td, "whitespace-nowrap text-right")}>
                        <form action={toggleProductActive} className="inline">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="back" value={`/admin/vorur${qs(tab)}`} />
                          <button className="rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:bg-cream hover:text-burgundy">{p.active ? "Fela" : "Birta"}</button>
                        </form>
                        <Link href={`/admin/vorur/${p.id}`} className="ml-1 rounded-lg px-2 py-1 text-sm font-semibold text-burgundy hover:bg-cream">Breyta</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
