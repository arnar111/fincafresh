import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { kr, dateShort, plural, num } from "@/lib/format";
import { daysAgo, isDemoEmail } from "@/lib/admin-ops";
import { PageHeader, Card, StatCard, Explainer, EmptyState, th, td, tableWrap, tableClass } from "@/components/admin/ui";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { AutoSubmitSelect } from "../pantanir/_components/client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

type SP = { q?: string; rod?: string; hopur?: string; sida?: string };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.sida) || 1);
  const where: Prisma.CustomerWhereInput = {};
  const q = sp.q?.trim();
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q.toLowerCase(), mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }, { kennitala: { contains: q, mode: "insensitive" } }];
  if (sp.hopur === "askrifendur") where.subscriptions = { some: { status: "ACTIVE" } };
  if (sp.hopur === "postlisti") where.marketingOptIn = true;
  if (sp.hopur === "stakir") where.AND = [{ subscriptions: { none: { status: "ACTIVE" } } }, { orders: { some: {} } }];

  const customers = await db.customer.findMany({ where, include: { subscriptions: { where: { status: "ACTIVE" }, select: { id: true } } } });
  const stats = await db.order.groupBy({
    by: ["customerId"],
    where: { customerId: { in: customers.map((c) => c.id) }, status: { not: "CANCELLED" } },
    _sum: { total: true },
    _count: true,
    _max: { createdAt: true },
  });
  const byId = new Map(stats.map((s) => [s.customerId, s]));
  const rows = customers.map((c) => {
    const st = byId.get(c.id);
    return { c, ltv: st?._sum.total ?? 0, orders: st?._count ?? 0, last: st?._max.createdAt ?? null, activeSub: c.subscriptions.length > 0 };
  });
  const sort = sp.rod ?? "nyjast";
  rows.sort((a, b) =>
    sort === "verdmaetast" ? b.ltv - a.ltv : sort === "flestar" ? b.orders - a.orders : sort === "sidast" ? (b.last?.getTime() ?? 0) - (a.last?.getTime() ?? 0) : sort === "nafn" ? a.c.name.localeCompare(b.c.name, "is") : b.c.createdAt.getTime() - a.c.createdAt.getTime()
  );
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const [totalCustomers, newCustomers, subscribers, optIn] = await Promise.all([
    db.customer.count(),
    db.customer.count({ where: { createdAt: { gte: daysAgo(29) } } }),
    db.customer.count({ where: { subscriptions: { some: { status: "ACTIVE" } } } }),
    db.customer.count({ where: { marketingOptIn: true } }),
  ]);

  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, String(v));
    return p.size ? `?${p}` : "";
  };
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "sida") as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Viðskiptavinir"
        description="Allir sem hafa pantað eða eru í áskrift."
        actions={<a href={`/api/admin/export/vidskiptavinir${exportQs ? `?${exportQs}` : ""}`} className={buttonClass("light", "sm")}><Icon name="download" className="h-4 w-4" /> Sækja sem Excel (CSV)</a>}
      />
      <Explainer>
        <p>Smelltu á viðskiptavin til að sjá allar pantanir hans, áskriftir og hversu mikið hann hefur verslað í heildina (<strong>heildarviðskipti</strong>).</p>
        <p>Hópurinn <strong>&quot;Kaupa staka kassa&quot;</strong> eru viðskiptavinir sem hafa pantað en eru ekki í áskrift. Þeir eru góður markhópur fyrir áskriftartilboð.</p>
      </Explainer>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Viðskiptavinir" value={num(totalCustomers)} icon="users" href="/admin/vidskiptavinir" />
        <StatCard label="Nýir síðustu 30 daga" value={num(newCustomers)} icon="plus" />
        <StatCard label="Í áskrift" value={num(subscribers)} icon="repeat" tone="pink" href="/admin/vidskiptavinir?hopur=askrifendur" />
        <StatCard label="Á póstlista" value={num(optIn)} icon="mail" href="/admin/vidskiptavinir?hopur=postlisti" />
      </div>

      <form method="get" className="mb-4 grid gap-2 rounded-2xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
        <label className="relative">
          <span className="sr-only">Leita</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Leita: nafn, netfang, sími eða kennitala" className="pl-9" />
        </label>
        <AutoSubmitSelect name="hopur" defaultValue={sp.hopur ?? ""} aria-label="Hópur">
          <option value="">Allir viðskiptavinir</option>
          <option value="askrifendur">Í áskrift</option>
          <option value="stakir">Kaupa staka kassa</option>
          <option value="postlisti">Á póstlista</option>
        </AutoSubmitSelect>
        <AutoSubmitSelect name="rod" defaultValue={sort} aria-label="Röðun">
          <option value="nyjast">Nýjustu fyrst</option>
          <option value="verdmaetast">Mest viðskipti</option>
          <option value="flestar">Flestar pantanir</option>
          <option value="sidast">Pantaði síðast</option>
          <option value="nafn">Stafrófsröð</option>
        </AutoSubmitSelect>
        <div className="flex gap-2">
          <button className={buttonClass("dark", "md")}>Sía</button>
          {Object.values(sp).some(Boolean) ? <Link href="/admin/vidskiptavinir" className={buttonClass("ghost", "md")}>Hreinsa</Link> : null}
        </div>
      </form>

      <Card padded={false}>
        {pageRows.length ? (
          <div className={tableWrap}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={th}>Nafn</th>
                  <th className={th}>Sími</th>
                  <th className={`${th} text-right`}>Pantanir</th>
                  <th className={`${th} text-right`}>Heildarviðskipti</th>
                  <th className={th}>Síðasta pöntun</th>
                  <th className={th}>Áskrift</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(({ c, ltv, orders, last, activeSub }) => (
                  <tr key={c.id}>
                    <td className={td}>
                      <Link href={`/admin/vidskiptavinir/${c.id}`} className="font-semibold text-burgundy hover:underline">{c.name || "(nafn vantar)"}</Link>
                      <div className="text-xs text-muted">{c.email}</div>
                      {isDemoEmail(c.email) ? <Badge tone="lemon" className="mt-0.5">Prufa</Badge> : null}
                    </td>
                    <td className={`${td} text-sm`}>{c.phone}</td>
                    <td className={`${td} text-right tabular-nums`}>{orders}</td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{kr(ltv)}</td>
                    <td className={`${td} text-sm`}>{last ? dateShort(last) : "Engin"}</td>
                    <td className={td}>{activeSub ? <Badge tone="green">Í áskrift</Badge> : orders ? <Badge tone="muted">Stakir kassar</Badge> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="users" title="Engir viðskiptavinir fundust">{q ? "Prófaðu aðra leit." : "Viðskiptavinir birtast hér þegar fyrstu pantanir berast."}</EmptyState>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>{plural(rows.length, "viðskiptavinur", "viðskiptavinir")}{pages > 1 ? ` · síða ${page} af ${pages}` : ""}</span>
        {pages > 1 ? (
          <div className="flex gap-2">
            {page > 1 ? <Link className={buttonClass("light", "sm")} href={`/admin/vidskiptavinir${qs({ sida: String(page - 1) })}`}>Fyrri síða</Link> : null}
            {page < pages ? <Link className={buttonClass("light", "sm")} href={`/admin/vidskiptavinir${qs({ sida: String(page + 1) })}`}>Næsta síða</Link> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
