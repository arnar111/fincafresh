import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getNextDelivery } from "@/lib/catalog";
import { dateShort } from "@/lib/format";
import { PageHeader, Explainer, EmptyState, Card } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FruitArt } from "@/components/brand/FruitArt";
import { markReviewed } from "./actions";

export const metadata = { title: "Ávextir" };

export default async function FruitsPage() {
  await requireAdmin();
  const [fruits, next] = await Promise.all([db.fruit.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }), getNextDelivery()]);
  const inNext = new Map((next?.fruits ?? []).map((f) => [f.fruit.id, f.deluxeOnly]));
  const unreviewed = fruits.filter((f) => !f.reviewed).length;

  return (
    <>
      <PageHeader
        title="Ávextir"
        description="Upplýsingarnar sem birtast þegar viðskiptavinur smellir á ávöxt á síðunni."
        actions={<ButtonLink href="/admin/avextir/ny" variant="primary"><Icon name="plus" className="h-4 w-4" /> Nýr ávöxtur</ButtonLink>}
      />
      <Explainer>
        <p>Hér er safn allra ávaxta sem Fincafresh selur. Hver ávöxtur hefur teikningu (eða ljósmynd) og stutta texta um bragð, geymslu og hvernig maður veit að hann sé tilbúinn.</p>
        <p>Til að velja <strong>hvaða ávextir fara í næsta kassa</strong> ferðu í <Link href="/admin/sendingar" className="font-semibold underline">Sendingar</Link>. Þar velur þú líka hvaða ávextir eru aðeins í Delúx kassanum (þeir fá gullhring á síðunni).</p>
      </Explainer>

      {unreviewed > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-orange/30 bg-orange/5 px-4 py-3 text-[15px]">
          <Icon name="info" className="h-5 w-5 text-orange-600" />
          <span><strong>{unreviewed} ávextir</strong> eru með texta sem hefur ekki verið yfirfarinn. Textarnir voru settir inn sem drög, lestu þá yfir og lagaðu ef þarf.</span>
        </div>
      ) : null}

      {fruits.length === 0 ? (
        <Card><EmptyState icon="leaf" title="Engir ávextir skráðir">Smelltu á <strong>Nýr ávöxtur</strong> til að byrja.</EmptyState></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {fruits.map((f) => (
            <div key={f.id} className={`flex flex-col rounded-2xl border bg-white p-4 transition hover:shadow-soft ${f.active ? "border-line" : "border-dashed border-line opacity-70"}`}>
              <Link href={`/admin/avextir/${f.id}`} className="flex items-center gap-3">
                <span className={`relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full ${inNext.get(f.id) ? "gold-ring" : ""}`} style={{ background: `color-mix(in oklab, ${f.color} 22%, #FCF8F1)` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {f.imageUrl ? <img src={f.imageUrl} alt="" className="h-full w-full rounded-full object-cover" /> : <FruitArt kind={f.illustration} className="h-11 w-11" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg text-burgundy">{f.name}</span>
                  <span className="block truncate text-xs text-muted">{[f.variety, f.region || f.origin, f.season].filter(Boolean).join(" · ") || "Engar nánari upplýsingar"}</span>
                </span>
              </Link>
              <div className="mt-3 flex flex-wrap gap-1">
                {inNext.has(f.id) ? <Badge tone={inNext.get(f.id) ? "gold" : "green"}>{inNext.get(f.id) ? "Delúx í næstu sendingu" : `Í sendingu ${next ? dateShort(next.date) : ""}`}</Badge> : null}
                {f.reviewed ? <Badge tone="green"><Icon name="check" className="h-3 w-3" /> Yfirfarið</Badge> : <Badge tone="orange">Drög</Badge>}
                {!f.active ? <Badge tone="muted">Óvirkur</Badge> : null}
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <form action={markReviewed}>
                  <input type="hidden" name="id" value={f.id} />
                  <button className="text-xs font-semibold text-muted hover:text-burgundy">{f.reviewed ? "Merkja sem drög" : "Merkja yfirfarið"}</button>
                </form>
                <Link href={`/admin/avextir/${f.id}`} className="text-sm font-semibold text-burgundy hover:underline">Breyta</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
