import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { kr, dateShort, plural, num } from "@/lib/format";
import { SUB_STATUS_LABELS } from "@/lib/subscriptions";
import { frequencyMap, subPricePerDelivery, subscriptionRevenue, daysAgo, isDemoEmail } from "@/lib/admin-ops";
import { getSetting } from "@/lib/settings";
import { PageHeader, Card, StatCard, Explainer, EmptyState, SubStatusBadge, th, td, tableWrap, tableClass } from "@/components/admin/ui";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { AutoSubmitSelect } from "../pantanir/_components/client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

type SP = { stada?: string; kassi?: string; tidni?: string; q?: string; sida?: string };

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const where: Prisma.SubscriptionWhereInput = {};
  if (sp.stada) where.status = sp.stada;
  if (sp.kassi) where.productId = sp.kassi;
  if (sp.tidni) where.everyNthDelivery = Number(sp.tidni);
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.customer = { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q.toLowerCase(), mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }] };
  }
  const page = Math.max(1, Number(sp.sida) || 1);

  const [subs, total, counts, boxes, freqs, rev, cancelled30, label] = await Promise.all([
    db.subscription.findMany({
      where,
      include: { customer: true, product: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.subscription.count({ where }),
    db.subscription.groupBy({ by: ["status"], _count: true }),
    db.product.findMany({ where: { type: "BOX" }, orderBy: { sortOrder: "asc" } }),
    getSetting("subscription.frequencies"),
    subscriptionRevenue(),
    db.subscription.count({ where: { status: "CANCELLED", cancelledAt: { gte: daysAgo(30) } } }),
    frequencyMap(),
  ]);
  const countBy = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, String(v));
    return p.size ? `?${p}` : "";
  };
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "sida") as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Áskriftir"
        description="Allir sem fá kassa reglulega. Hér getur þú sleppt sendingu, gert hlé, breytt eða sagt upp fyrir viðskiptavini."
        actions={
          <>
            <a href={`/api/admin/export/askriftir${exportQs ? `?${exportQs}` : ""}`} className={buttonClass("light", "sm")}><Icon name="download" className="h-4 w-4" /> CSV</a>
            <Link href="/admin/askriftir/flytja-inn" className={buttonClass("light", "sm")}><Icon name="upload" className="h-4 w-4" /> Flytja inn</Link>
            <Link href="/admin/askriftir/ny" className={buttonClass("dark", "sm")}><Icon name="plus" className="h-4 w-4" /> Ný áskrift</Link>
          </>
        }
      />
      <Explainer>
        <p><strong>Svona virka áskriftir:</strong> Hver áskrift segir til um hvaða kassa viðskiptavinurinn fær, hversu marga og hversu oft (t.d. í hverri sendingu eða annarri hverri).</p>
        <p>Þegar ný sending nálgast ferðu í <Link href="/admin/sendingar" className="font-semibold underline">Sendingar</Link> og smellir á &quot;Búa til áskriftarpantanir&quot;. Þá verður til pöntun fyrir hverja virka áskrift sem á að fá kassa.</p>
        <p><strong>Sleppa</strong> þýðir að viðskiptavinurinn fær ekki kassa í næstu sendingu en áskriftin heldur svo áfram. <strong>Hlé</strong> stöðvar áskriftina þar til ákveðinn dag. <strong>Segja upp</strong> stöðvar hana fyrir fullt og allt (hægt að virkja aftur).</p>
      </Explainer>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Virkar" value={num(countBy.ACTIVE ?? 0)} icon="repeat" tone="good" href="/admin/askriftir?stada=ACTIVE" />
        <StatCard label="Í hléi" value={num(countBy.PAUSED ?? 0)} icon="pause" href="/admin/askriftir?stada=PAUSED" />
        <StatCard label="Sagt upp síðustu 30 daga" value={num(cancelled30)} icon="x" tone={cancelled30 ? "warn" : "default"} href="/admin/askriftir?stada=CANCELLED" />
        <StatCard label="Tekjur á hverja sendingu" value={kr(rev.perDelivery)} hint={rev.perMonth !== null ? `u.þ.b. ${kr(rev.perMonth)} á mánuði` : "áætlun út frá virkum áskriftum"} icon="chart" tone="pink" />
      </div>

      <form method="get" className="mb-4 grid gap-2 rounded-2xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <label className="relative">
          <span className="sr-only">Leita</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Leita: nafn, netfang eða sími" className="pl-9" />
        </label>
        <AutoSubmitSelect name="stada" defaultValue={sp.stada ?? ""} aria-label="Staða">
          <option value="">Allar stöður</option>
          {Object.entries(SUB_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v} ({countBy[k] ?? 0})</option>)}
        </AutoSubmitSelect>
        <AutoSubmitSelect name="kassi" defaultValue={sp.kassi ?? ""} aria-label="Kassi">
          <option value="">Allir kassar</option>
          {boxes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </AutoSubmitSelect>
        <AutoSubmitSelect name="tidni" defaultValue={sp.tidni ?? ""} aria-label="Tíðni">
          <option value="">Öll tíðni</option>
          {freqs.map((f) => <option key={f.every} value={f.every}>{f.label}</option>)}
        </AutoSubmitSelect>
        <div className="flex gap-2">
          <button className={buttonClass("dark", "md")}>Sía</button>
          {Object.values(sp).some(Boolean) ? <Link href="/admin/askriftir" className={buttonClass("ghost", "md")}>Hreinsa</Link> : null}
        </div>
      </form>

      <Card padded={false}>
        {subs.length ? (
          <div className={tableWrap}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={th}>Viðskiptavinur</th>
                  <th className={th}>Kassi</th>
                  <th className={th}>Tíðni</th>
                  <th className={th}>Staða</th>
                  <th className={th}>Afhending</th>
                  <th className={`${th} text-right`}>Á sendingu</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id}>
                    <td className={td}>
                      <Link href={`/admin/askriftir/${s.id}`} className="font-semibold text-burgundy hover:underline">{s.customer.name || s.customer.email}</Link>
                      <div className="text-xs text-muted">{s.customer.email}</div>
                      {isDemoEmail(s.customer.email) ? <Badge tone="lemon" className="mt-0.5">Prufa</Badge> : null}
                    </td>
                    <td className={td}>
                      <div className="font-medium">{s.quantity > 1 ? `${s.quantity} × ` : ""}{s.product.name}</div>
                      <div className="text-xs text-muted">{s.discountPct}% afsláttur</div>
                    </td>
                    <td className={`${td} text-sm`}>{label(s.everyNthDelivery)}</td>
                    <td className={td}>
                      <div className="flex flex-col items-start gap-1">
                        <SubStatusBadge status={s.status} />
                        {s.skipNext && s.status === "ACTIVE" ? <Badge tone="orange">Sleppir næstu</Badge> : null}
                        {s.status === "PAUSED" && s.pausedUntil ? <span className="text-xs text-muted">til {dateShort(s.pausedUntil)}</span> : null}
                      </div>
                    </td>
                    <td className={`${td} text-sm`}>
                      {s.deliveryMethod === "PIKKOLO" ? `Pikkoló${s.pikkoloStationName ? `: ${s.pikkoloStationName}` : ""}` : s.deliveryMethod === "HOME" ? `Heimsending, ${s.postalCode} ${s.city}` : "Sótt"}
                    </td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{kr(subPricePerDelivery(s))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="repeat" title="Engar áskriftir fundust">
            {Object.values(sp).some(Boolean) ? <Link href="/admin/askriftir" className="font-semibold text-burgundy underline">Hreinsa síur</Link> : <>Þegar viðskiptavinir velja áskrift í vefversluninni birtast þeir hér. Þú getur líka <Link href="/admin/askriftir/flytja-inn" className="font-semibold text-burgundy underline">flutt inn áskrifendur</Link> úr öðru kerfi.</>}
          </EmptyState>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>{plural(total, "áskrift", "áskriftir")}{pages > 1 ? ` · síða ${page} af ${pages}` : ""}</span>
        {pages > 1 ? (
          <div className="flex gap-2">
            {page > 1 ? <Link className={buttonClass("light", "sm")} href={`/admin/askriftir${qs({ sida: String(page - 1) })}`}>Fyrri síða</Link> : null}
            {page < pages ? <Link className={buttonClass("light", "sm")} href={`/admin/askriftir${qs({ sida: String(page + 1) })}`}>Næsta síða</Link> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
