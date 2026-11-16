import Link from "next/link";
import { db } from "@/lib/db";
import { kr, dateTime, plural, dateShort } from "@/lib/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, DELIVERY_METHOD_LABELS } from "@/lib/orders";
import { orderWhere, SOURCE_LABELS, isDemoEmail, type OrderFilters } from "@/lib/admin-ops";
import { PageHeader, Card, Explainer, EmptyState, HelpTip, OrderStatusBadge, PaymentStatusBadge, th, td, tableWrap, tableClass } from "@/components/admin/ui";
import { Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { SelectAll, AutoSubmitSelect, ActionButton } from "./_components/client";
import { bulkSetStatus, bulkSendPikkolo } from "./actions";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

type SP = OrderFilters & { sida?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const where = orderWhere(sp);
  const page = Math.max(1, Number(sp.sida) || 1);
  const [orders, total, counts, deliveries] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { items: true } }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true }),
    db.delivery.findMany({ orderBy: { date: "desc" }, take: 12, select: { id: true, date: true, title: true } }),
  ]);
  const countBy = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const allCount = counts.reduce((s, c) => s + c._count, 0);

  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { ...sp, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    return p.size ? `?${p}` : "";
  };
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "sida") as [string, string][]).toString();
  const back = `/admin/pantanir${qs({})}`;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tabs: { key?: string; label: string; count: number }[] = [
    { key: undefined, label: "Allar", count: allCount },
    ...["NEW", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => ({ key: s, label: ORDER_STATUS_LABELS[s], count: countBy[s] ?? 0 })),
  ];

  return (
    <>
      <PageHeader
        title="Pantanir"
        description="Allar pantanir úr vefversluninni, áskriftum og WooCommerce á einum stað."
        actions={
          <a href={`/api/admin/export/pantanir${exportQs ? `?${exportQs}` : ""}`} className={buttonClass("light", "sm")}>
            <Icon name="download" className="h-4 w-4" /> Sækja sem Excel (CSV)
          </a>
        }
      />
      <Explainer>
        <p><strong>Svona afgreiðir þú pöntun:</strong> 1) Smelltu á pöntun til að sjá hvað á að fara í kassann. 2) Breyttu stöðunni í &quot;Í vinnslu&quot; þegar þú byrjar að pakka. 3) Ef viðskiptavinurinn sækir í Pikkoló, smelltu á &quot;Senda til Pikkoló&quot;. 4) Merktu pöntunina &quot;Send&quot; og svo &quot;Afhent&quot;.</p>
        <p>Þú getur líka hakað við margar pantanir í einu og breytt stöðu þeirra allra með hnöppunum fyrir neðan listann.</p>
        <p>Stöðurnar: <strong>Ný</strong> (ekki byrjað), <strong>Í vinnslu</strong> (verið að pakka), <strong>Send</strong> (farin af stað), <strong>Afhent</strong> (komin til viðskiptavinar), <strong>Hætt við</strong>.</p>
      </Explainer>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Staða">
        {tabs.map((t) => {
          const active = (sp.stada ?? undefined) === t.key && !sp.pikkolo;
          return (
            <Link
              key={t.label}
              href={`/admin/pantanir${qs({ stada: t.key, sida: undefined, pikkolo: undefined })}`}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-burgundy text-cream" : "bg-white text-burgundy hover:bg-cream"}`}
            >
              {t.label} <span className={active ? "opacity-80" : "text-muted"}>({t.count})</span>
            </Link>
          );
        })}
        <Link href="/admin/pantanir?pikkolo=osent" className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${sp.pikkolo === "osent" ? "bg-burgundy text-cream" : "bg-white text-burgundy hover:bg-cream"}`}>
          Pikkoló ósendar
        </Link>
      </div>

      <form method="get" className="mb-4 grid gap-2 rounded-2xl border border-line bg-white p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        {sp.stada ? <input type="hidden" name="stada" value={sp.stada} /> : null}
        {sp.pikkolo ? <input type="hidden" name="pikkolo" value={sp.pikkolo} /> : null}
        <label className="relative">
          <span className="sr-only">Leita</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="Leita: nafn, netfang, sími eða pöntunarnúmer" className="pl-9" />
        </label>
        <AutoSubmitSelect name="greidsla" defaultValue={sp.greidsla ?? ""} aria-label="Greiðsla">
          <option value="">Öll greiðslustaða</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </AutoSubmitSelect>
        <AutoSubmitSelect name="afhending" defaultValue={sp.afhending ?? ""} aria-label="Afhending">
          <option value="">Allar afhendingar</option>
          {Object.entries(DELIVERY_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </AutoSubmitSelect>
        <AutoSubmitSelect name="uppruni" defaultValue={sp.uppruni ?? ""} aria-label="Uppruni">
          <option value="">Allur uppruni</option>
          {Object.entries(SOURCE_LABELS).filter(([k]) => k !== "IMPORT").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </AutoSubmitSelect>
        <AutoSubmitSelect name="sending" defaultValue={sp.sending ?? ""} aria-label="Sending">
          <option value="">Allar sendingar</option>
          {deliveries.map((d) => <option key={d.id} value={d.id}>Sending {dateShort(d.date)}</option>)}
        </AutoSubmitSelect>
        <div className="flex gap-2">
          <button className={buttonClass("dark", "md")}>Sía</button>
          {Object.values(sp).some(Boolean) ? <Link href="/admin/pantanir" className={buttonClass("ghost", "md")}>Hreinsa</Link> : null}
        </div>
      </form>

      <Card padded={false}>
        {orders.length ? (
          <form>
            <input type="hidden" name="back" value={back} />
            <div className={tableWrap}>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={`${th} w-10`}><SelectAll /></th>
                    <th className={th}>Pöntun</th>
                    <th className={th}>Viðskiptavinur</th>
                    <th className={th}>Vörur</th>
                    <th className={th}>Afhending</th>
                    <th className={th}>Staða</th>
                    <th className={`${th} text-right`}>Upphæð</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className={td}><input type="checkbox" name="ids" value={o.id} aria-label={`Velja pöntun ${o.number}`} className="h-4 w-4 accent-burgundy" /></td>
                      <td className={td}>
                        <Link href={`/admin/pantanir/${o.id}`} className="font-semibold text-burgundy hover:underline">#{o.number}</Link>
                        <div className="text-xs text-muted">{dateTime(o.createdAt)}</div>
                        {o.source !== "WEB" ? <div className="mt-0.5 text-xs text-muted">{SOURCE_LABELS[o.source] ?? o.source}</div> : null}
                      </td>
                      <td className={td}>
                        <Link href={`/admin/pantanir/${o.id}`} className="font-medium hover:underline">{o.name}</Link>
                        <div className="text-xs text-muted">{o.email}</div>
                        {isDemoEmail(o.email) ? <Badge tone="lemon" className="mt-0.5">Prufa</Badge> : null}
                      </td>
                      <td className={`${td} max-w-[240px] text-sm`}>
                        {o.items.map((i) => (
                          <div key={i.id} className="truncate">
                            {i.quantity} × {i.name}
                          </div>
                        ))}
                      </td>
                      <td className={`${td} text-sm`}>
                        <div className="font-medium">{DELIVERY_METHOD_LABELS[o.deliveryMethod] ?? o.deliveryMethod}</div>
                        {o.deliveryMethod === "PIKKOLO" ? (
                          <div className="text-xs text-muted">
                            {o.pikkoloStationName || "Stöð vantar"} ·{" "}
                            {o.pikkoloOrderId ? <span className="text-leaf">Send til Pikkoló</span> : <span className="text-orange-600">Ekki send</span>}
                          </div>
                        ) : o.deliveryMethod === "HOME" ? (
                          <div className="text-xs text-muted">{o.postalCode} {o.city}{o.trackingNumber ? " · rakning skráð" : ""}</div>
                        ) : null}
                        {o.deliveryDate ? <div className="text-xs text-muted">Sending {dateShort(o.deliveryDate)}</div> : null}
                      </td>
                      <td className={td}>
                        <div className="flex flex-col items-start gap-1">
                          <OrderStatusBadge status={o.status} />
                          <PaymentStatusBadge status={o.paymentStatus} />
                        </div>
                      </td>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{kr(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-b-2xl border-t border-line/70 bg-cream-50/95 px-4 py-3 backdrop-blur">
              <span className="text-sm font-semibold text-ink">Með völdum pöntunum:</span>
              <div className="w-52">
                <Select name="status" defaultValue="" className="py-2" aria-label="Ný staða">
                  <option value="" disabled>Veldu nýja stöðu…</option>
                  {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
              <ActionButton variant="dark" formAction={bulkSetStatus}>Breyta stöðu</ActionButton>
              <ActionButton variant="light" formAction={bulkSendPikkolo} confirm="Senda valdar Pikkoló pantanir til Pikkoló?">
                Senda til Pikkoló
              </ActionButton>
              <HelpTip>Hakaðu við pantanir í listanum (eða efsta hakið til að velja allar á síðunni) og veldu svo hvað á að gera við þær.</HelpTip>
            </div>
          </form>
        ) : (
          <EmptyState icon="box" title="Engar pantanir fundust">
            {Object.values(sp).some(Boolean) ? <>Prófaðu að <Link href="/admin/pantanir" className="font-semibold text-burgundy underline">hreinsa síurnar</Link>.</> : "Þegar pantanir berast birtast þær hér."}
          </EmptyState>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>{plural(total, "pöntun", "pantanir")}{pages > 1 ? ` · síða ${page} af ${pages}` : ""}</span>
        {pages > 1 ? (
          <div className="flex gap-2">
            {page > 1 ? <Link className={buttonClass("light", "sm")} href={`/admin/pantanir${qs({ sida: String(page - 1) })}`}>Fyrri síða</Link> : null}
            {page < pages ? <Link className={buttonClass("light", "sm")} href={`/admin/pantanir${qs({ sida: String(page + 1) })}`}>Næsta síða</Link> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
