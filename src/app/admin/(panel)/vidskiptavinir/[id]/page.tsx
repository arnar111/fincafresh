import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { kr, dateLong, dateShort, plural } from "@/lib/format";
import { frequencyMap, subPricePerDelivery, isDemoEmail, SOURCE_LABELS } from "@/lib/admin-ops";
import { PageHeader, Card, StatCard, Explainer, EmptyState, OrderStatusBadge, SubStatusBadge, HelpTip } from "@/components/admin/ui";
import { SubmitButton, CopyButton } from "@/components/admin/forms";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { updateCustomer, saveCustomerNotes, removeCustomerPassword } from "../actions";

export const dynamic = "force-dynamic";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, include: { items: { include: { product: { select: { type: true } } } } } },
      subscriptions: { orderBy: { createdAt: "desc" }, include: { product: true } },
    },
  });
  if (!c) notFound();
  const label = await frequencyMap();

  const valid = c.orders.filter((o) => o.status !== "CANCELLED");
  const ltv = valid.reduce((s, o) => s + o.total, 0);
  const avg = valid.length ? ltv / valid.length : 0;
  const activeSubs = c.subscriptions.filter((s) => s.status === "ACTIVE");
  const singleBoxOrders = valid.filter((o) => o.items.some((i) => !i.isSubscription && i.product?.type === "BOX")).length;
  const H = () => <input type="hidden" name="id" value={c.id} />;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/vidskiptavinir", label: "Allir viðskiptavinir" }}
        title={c.name || c.email}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Viðskiptavinur síðan {dateLong(c.createdAt)}
            {activeSubs.length ? <Badge tone="green">Í áskrift</Badge> : null}
            {c.marketingOptIn ? <Badge tone="pink">Á póstlista</Badge> : null}
            {c.wooId ? <Badge tone="muted">Úr WooCommerce</Badge> : null}
            {isDemoEmail(c.email) ? <Badge tone="lemon">Prufugögn</Badge> : null}
          </span>
        }
        actions={<Link href={`/admin/askriftir/ny?vidskiptavinur=${c.id}`} className={buttonClass("dark", "sm")}><Icon name="plus" className="h-4 w-4" /> Ný áskrift</Link>}
      />

      <Explainer>
        <p><strong>Heildarviðskipti</strong> eru samanlögð upphæð allra pantana sem ekki var hætt við. Minnispunktar sjást aðeins hér, aldrei hjá viðskiptavininum.</p>
        {!activeSubs.length && singleBoxOrders >= 2 ? <p>Þessi viðskiptavinur hefur keypt staka kassa {singleBoxOrders} sinnum. Prófaðu að bjóða honum áskrift með afslætti.</p> : null}
      </Explainer>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Heildarviðskipti" value={kr(ltv)} icon="chart" tone="good" />
        <StatCard label="Pantanir" value={valid.length} hint={c.orders.length !== valid.length ? `${c.orders.length - valid.length} hætt við` : undefined} icon="box" />
        <StatCard label="Meðalpöntun" value={kr(avg)} icon="tag" />
        <StatCard label="Virkar áskriftir" value={activeSubs.length} hint={activeSubs.length ? `${kr(activeSubs.reduce((s, x) => s + subPricePerDelivery(x), 0))} á sendingu` : "Engin"} icon="repeat" tone="pink" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card title="Áskriftir" padded={false}>
            {c.subscriptions.length ? (
              <ul className="divide-y divide-line/70">
                {c.subscriptions.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/askriftir/${s.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-cream-50">
                      <Icon name="repeat" className="h-5 w-5 text-burgundy" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{s.quantity > 1 ? `${s.quantity} × ` : ""}{s.product.name}</span>
                        <span className="text-sm text-muted">{label(s.everyNthDelivery)} · {kr(subPricePerDelivery(s))} á sendingu</span>
                      </span>
                      <SubStatusBadge status={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="repeat" title="Ekki í áskrift">
                <Link href={`/admin/askriftir/ny?vidskiptavinur=${c.id}`} className="font-semibold text-burgundy underline">Skrá áskrift</Link>
              </EmptyState>
            )}
          </Card>

          <Card title="Pantanir" description={plural(c.orders.length, "pöntun", "pantanir")} padded={false}>
            {c.orders.length ? (
              <ul className="divide-y divide-line/70">
                {c.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/pantanir/${o.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-cream-50">
                      <span className="w-16 font-semibold text-burgundy">#{o.number}</span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block truncate">{o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</span>
                        <span className="text-muted">{dateShort(o.createdAt)} · {SOURCE_LABELS[o.source] ?? o.source}</span>
                      </span>
                      <OrderStatusBadge status={o.status} />
                      <span className="w-24 text-right font-semibold tabular-nums">{kr(o.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="box" title="Engar pantanir ennþá" />
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Samskiptaupplýsingar">
            <div className="mb-4 flex flex-wrap gap-2">
              <a href={`mailto:${c.email}`} className={buttonClass("light", "sm")}><Icon name="mail" className="h-4 w-4" /> Senda póst</a>
              {c.phone ? <a href={`tel:${c.phone}`} className={buttonClass("light", "sm")}>Hringja</a> : null}
              <CopyButton value={c.email} label="Afrita netfang" />
            </div>
            <form action={updateCustomer} className="space-y-3">
              <H />
              <Field label="Nafn"><Input name="name" defaultValue={c.name} /></Field>
              <Field label="Netfang"><Input name="email" type="email" defaultValue={c.email} required /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Sími"><Input name="phone" defaultValue={c.phone} /></Field>
                <Field label="Kennitala"><Input name="kennitala" defaultValue={c.kennitala} /></Field>
              </div>
              <Field label="Heimilisfang"><Input name="street" defaultValue={c.street} /></Field>
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <Field label="Póstnr."><Input name="postalCode" defaultValue={c.postalCode} /></Field>
                <Field label="Staður"><Input name="city" defaultValue={c.city} /></Field>
              </div>
              <label className="flex items-center gap-2 text-[15px]">
                <input type="checkbox" name="marketingOptIn" defaultChecked={c.marketingOptIn} className="h-4 w-4 accent-burgundy" />
                Vill fá fréttabréf og tilboð
                <HelpTip>Aðeins má senda markaðspóst ef viðskiptavinurinn hefur samþykkt það.</HelpTip>
              </label>
              <SubmitButton variant="dark" size="sm">Vista</SubmitButton>
            </form>
          </Card>

          <Card title="Minnispunktar" description="Aðeins fyrir starfsfólk.">
            <form action={saveCustomerNotes} className="space-y-3">
              <H />
              <Textarea name="notes" defaultValue={c.notes} rows={4} placeholder="T.d. vill alltaf auka sítrónur, ofnæmi fyrir kiwi…" />
              <SubmitButton variant="light" size="sm">Vista minnispunkta</SubmitButton>
            </form>
          </Card>

          <Card title="Aðgangur að Mínum síðum">
            {c.passwordHash ? (
              <form action={removeCustomerPassword} className="space-y-2 text-[15px]">
                <H />
                <p className="text-muted">Viðskiptavinurinn er með lykilorð og getur skráð sig inn á Mínar síður.</p>
                <SubmitButton variant="ghost" size="sm" confirm="Fjarlægja lykilorðið? Viðskiptavinurinn getur þá ekki skráð sig inn fyrr en hann býr til nýtt.">Fjarlægja lykilorð</SubmitButton>
              </form>
            ) : (
              <p className="text-[15px] text-muted">Enginn aðgangur stofnaður. Viðskiptavinurinn getur búið hann til á Mínum síðum.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
