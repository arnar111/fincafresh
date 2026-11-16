import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { kr, parseJsonList, dateLong } from "@/lib/format";
import { wooConfig } from "@/lib/integrations/woocommerce";
import { PageHeader, Card, HelpTip } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/forms";
import { Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ProductForm } from "../ProductForm";
import { addPin, deleteProduct, pushToWoo, removePin } from "../actions";

export const metadata = { title: "Breyta vöru" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = await db.product.findUnique({
    where: { id },
    include: {
      pinsFrom: { include: { recommended: true }, orderBy: { sortOrder: "asc" } },
      _count: { select: { orderItems: true, subscriptions: true } },
    },
  });
  if (!p) notFound();
  const [categories, defPct, woo, others, revenue] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    getSetting("subscription.defaultDiscountPct"),
    wooConfig(),
    db.product.findMany({ where: { id: { not: id } }, orderBy: { name: "asc" }, select: { id: true, name: true, active: true } }),
    db.orderItem.aggregate({ where: { productId: id, order: { status: { not: "CANCELLED" } } }, _sum: { quantity: true } }),
  ]);
  const pinnedIds = new Set(p.pinsFrom.map((x) => x.recommendedProductId));
  const storefront = p.type === "BOX" ? `/kassar/${p.slug}` : `/vorur/${p.slug}`;

  return (
    <>
      <PageHeader
        title={p.name}
        description={<>Búin til {dateLong(p.createdAt)} · {revenue._sum.quantity ?? 0} seld · {p._count.subscriptions} áskriftir alls</>}
        back={{ href: "/admin/vorur", label: "Allar vörur" }}
        actions={
          <Link href={storefront} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-burgundy hover:bg-cream">
            <Icon name="eye" className="h-4 w-4" /> Skoða í verslun
          </Link>
        }
      />

      <ProductForm
        categories={categories}
        defaultSubPct={defPct}
        wooConfigured={woo.configured}
        product={{
          id: p.id, name: p.name, slug: p.slug, sku: p.sku, type: p.type, tier: p.tier, tagline: p.tagline, shortDescription: p.shortDescription,
          description: p.description, features: parseJsonList(p.features), images: parseJsonList(p.images), price: p.price, compareAtPrice: p.compareAtPrice,
          subscriptionDiscountPct: p.subscriptionDiscountPct, weightLabel: p.weightLabel, suitsFor: p.suitsFor, storageType: p.storageType,
          trackStock: p.trackStock, stock: p.stock, active: p.active, featured: p.featured, sortOrder: p.sortOrder, syncToWoo: p.syncToWoo,
          categoryId: p.categoryId, wooId: p.wooId,
        }}
      />

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card
          title={<span className="inline-flex items-center gap-2">„Passar vel með“: handvalin meðmæli <HelpTip>Kerfið reiknar sjálft út hvað fólk kaupir saman (sjá Greiningu). Vörur sem þú festir hér birtast alltaf fyrst á vörusíðunni og í körfunni.</HelpTip></span>}
          description="Vörur sem birtast fyrst þegar viðskiptavinur skoðar þessa vöru eða hefur hana í körfunni."
        >
          {p.pinsFrom.length ? (
            <ul className="mb-4 divide-y divide-line/70 rounded-xl border border-line">
              {p.pinsFrom.map((pin, i) => (
                <li key={pin.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-[15px]"><span className="mr-2 text-muted">{i + 1}.</span>{pin.recommended.name} <span className="text-sm text-muted">({kr(pin.recommended.price)})</span></span>
                  <form action={removePin}>
                    <input type="hidden" name="pinId" value={pin.id} />
                    <input type="hidden" name="back" value={`/admin/vorur/${p.id}`} />
                    <button className="rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:bg-cream hover:text-danger">Fjarlægja</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted">Engin handvalin meðmæli. Kerfið sýnir þá sjálfkrafa það sem aðrir keyptu með þessari vöru.</p>
          )}
          <form action={addPin} className="flex gap-2">
            <input type="hidden" name="productId" value={p.id} />
            <Select name="recommendedProductId" defaultValue="" required>
              <option value="" disabled>Veldu vöru til að mæla með…</option>
              {others.filter((o) => !pinnedIds.has(o.id)).map((o) => <option key={o.id} value={o.id}>{o.name}{o.active ? "" : " (falin)"}</option>)}
            </Select>
            <SubmitButton variant="dark" size="sm">Festa</SubmitButton>
          </form>
        </Card>

        <Card title="WooCommerce" description={woo.configured ? (p.wooId ? `Tengt vöru nr. ${p.wooId} í WooCommerce.` : "Þessi vara er ekki til í WooCommerce.") : "WooCommerce er ekki tengt."}>
          {woo.configured ? (
            <form action={pushToWoo}>
              <input type="hidden" name="id" value={p.id} />
              <p className="mb-3 text-sm text-muted">{p.wooId ? "Sendir núverandi verð, birgðir og sýnileika til WooCommerce." : "Býr vöruna til í WooCommerce með sama nafni og verði."}</p>
              <SubmitButton variant="outline" size="sm"><Icon name="refresh" className="h-4 w-4" /> {p.wooId ? "Uppfæra í WooCommerce" : "Búa til í WooCommerce"}</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-muted">Tengdu WooCommerce undir <Link href="/admin/tengingar" className="font-semibold text-burgundy underline">Tengingar</Link> til að geta sent verð og birgðir þangað.</p>
          )}
        </Card>

        <Card title="Eyða vöru" className="lg:col-span-2" description="Þú getur líka bara falið vöruna (taktu hakið úr „Sýnileg í versluninni“), þá haldast öll gögn.">
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={p.id} />
            <SubmitButton variant="danger" size="sm" confirm={`Ertu viss um að þú viljir eyða "${p.name}" fyrir fullt og allt? Þetta er ekki hægt að afturkalla.`}>
              <Icon name="trash" className="h-4 w-4" /> Eyða vöru
            </SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
