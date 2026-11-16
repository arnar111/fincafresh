import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { kr, dateTime, dateShort, dateWithDayAcc, plural } from "@/lib/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, DELIVERY_METHOD_LABELS } from "@/lib/orders";
import { SOURCE_LABELS, isDemoEmail } from "@/lib/admin-ops";
import { getAvailableStations, pikkoloConfig } from "@/lib/integrations/pikkolo";
import { PageHeader, Card, HelpTip, Explainer, OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/ui";
import { SubmitButton, CopyButton } from "@/components/admin/forms";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import {
  setOrderStatus,
  setPaymentStatus,
  saveOrderNotes,
  updateOrderDelivery,
  cancelOrder,
  sendToPikkolo,
  refreshPikkolo,
  cancelAtPikkolo,
} from "../actions";

export const dynamic = "force-dynamic";

const NEXT_STEP: Record<string, { status: string; label: string; icon: string }> = {
  NEW: { status: "PROCESSING", label: "Byrja að pakka", icon: "box" },
  PROCESSING: { status: "SHIPPED", label: "Merkja senda", icon: "truck" },
  SHIPPED: { status: "DELIVERED", label: "Merkja afhenta", icon: "check" },
};

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ stod?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, customer: true, subscription: { include: { product: true } }, delivery: true },
  });
  if (!order) notFound();

  const [otherOrders, deliveries, pk] = await Promise.all([
    order.customerId ? db.order.count({ where: { customerId: order.customerId, id: { not: order.id } } }) : 0,
    db.delivery.findMany({ where: { status: { not: "DONE" } }, orderBy: { date: "asc" }, take: 8 }),
    pikkoloConfig(),
  ]);

  const stations =
    sp.stod && order.deliveryMethod === "PIKKOLO"
      ? await getAvailableStations({
          postalCode: order.postalCode || "101",
          city: order.city || "Reykjavík",
          street: order.street,
          email: order.email,
          phone: order.phone,
          refrigerated: order.items.reduce((s, i) => s + i.quantity, 0),
        })
      : null;

  const next = NEXT_STEP[order.status];
  const here = `/admin/pantanir/${order.id}`;
  const Hidden = () => (
    <>
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="back" value={here} />
    </>
  );

  return (
    <>
      <PageHeader
        back={{ href: "/admin/pantanir", label: "Allar pantanir" }}
        title={`Pöntun #${order.number}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {dateTime(order.createdAt)} · {SOURCE_LABELS[order.source] ?? order.source}
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
            {isDemoEmail(order.email) ? <Badge tone="lemon">Prufugögn</Badge> : null}
          </span>
        }
        actions={
          <>
            <Link href={`${here}/fylgisedill`} className={buttonClass("light", "sm")} target="_blank">
              <Icon name="download" className="h-4 w-4" /> Prenta fylgiseðil
            </Link>
            {next ? (
              <form action={setOrderStatus}>
                <Hidden />
                <input type="hidden" name="status" value={next.status} />
                <SubmitButton variant="primary" size="sm">
                  <Icon name={next.icon} className="h-4 w-4" /> {next.label}
                </SubmitButton>
              </form>
            ) : null}
          </>
        }
      />

      <Explainer title="Hvað geri ég hér?">
        <p>Hér sérðu allt um pöntunina. Appelsínuguli hnappurinn efst til hægri færir pöntunina á <strong>næsta stig</strong> (Ný → Í vinnslu → Send → Afhent).</p>
        <p>Ef pöntunin á að fara í <strong>Pikkoló</strong> sendir þú hana þangað með hnappnum &quot;Senda til Pikkoló&quot; hægra megin. Þá veit Pikkoló að kassinn er á leiðinni og viðskiptavinurinn fær tilkynningu frá þeim.</p>
        <p>&quot;Athugasemd starfsfólks&quot; sést aðeins hér í stjórnborðinu, aldrei hjá viðskiptavininum.</p>
      </Explainer>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Vörur" padded={false}>
            <ul className="divide-y divide-line/70">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-cream">
                    {(() => {
                      const img = i.product ? (JSON.parse(i.product.images || "[]") as string[])[0] : null;
                      // eslint-disable-next-line @next/next/no-img-element
                      return img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <Icon name="box" className="h-5 w-5 text-burgundy" />;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{i.name}</div>
                    <div className="text-sm text-muted">
                      {i.quantity} × {kr(i.unitPrice)}
                      {i.isSubscription ? " · áskrift" : ""}
                      {i.sku ? ` · ${i.sku}` : ""}
                    </div>
                  </div>
                  <div className="font-semibold tabular-nums">{kr(i.unitPrice * i.quantity)}</div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line/70 bg-cream-50 px-5 py-4 text-[15px]">
              <div className="flex justify-between"><dt className="text-muted">Millisamtala</dt><dd className="tabular-nums">{kr(order.subtotal)}</dd></div>
              {order.discount ? (
                <div className="flex justify-between"><dt className="text-muted">Afsláttur {order.discountCode ? `(${order.discountCode})` : ""}</dt><dd className="tabular-nums">−{kr(order.discount)}</dd></div>
              ) : null}
              <div className="flex justify-between"><dt className="text-muted">Sending</dt><dd className="tabular-nums">{kr(order.shipping)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Samtals</dt><dd className="tabular-nums">{kr(order.total)}</dd></div>
              <div className="flex justify-between pt-1 text-sm text-muted"><dt>Greiðsla</dt><dd>{order.paymentMethod || "Óþekkt"}{order.paymentRef ? ` · ${order.paymentRef}` : ""}</dd></div>
            </dl>
          </Card>

          <Card title="Staða pöntunar" description="Breyttu stöðu handvirkt ef þarf.">
            <div className="grid gap-4 sm:grid-cols-2">
              <form action={setOrderStatus} className="flex items-end gap-2">
                <Hidden />
                <Field label="Staða" className="flex-1">
                  <Select name="status" defaultValue={order.status}>
                    {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                <SubmitButton variant="dark">Vista</SubmitButton>
              </form>
              <form action={setPaymentStatus} className="flex items-end gap-2">
                <Hidden />
                <Field label={<span className="inline-flex items-center gap-1.5">Greiðslustaða <HelpTip>Áskriftarpantanir eru merktar &quot;Ógreidd&quot; þar til greiðsla hefur farið í gegn hjá Repeat. Merktu þær greiddar þegar það hefur gerst.</HelpTip></span>} className="flex-1">
                  <Select name="paymentStatus" defaultValue={order.paymentStatus}>
                    {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                <SubmitButton variant="dark">Vista</SubmitButton>
              </form>
            </div>
          </Card>

          <Card title="Athugasemdir og rakning">
            {order.customerNote ? (
              <div className="mb-4 rounded-xl border border-pink/50 bg-pink-100/50 p-3 text-[15px]">
                <div className="text-xs font-semibold uppercase tracking-wide text-burgundy">Athugasemd frá viðskiptavini</div>
                {order.customerNote}
              </div>
            ) : null}
            <form action={saveOrderNotes} className="space-y-4">
              <Hidden />
              <Field label="Athugasemd starfsfólks" hint="Sést aðeins hér í stjórnborðinu.">
                <Textarea name="internalNote" defaultValue={order.internalNote} rows={3} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Rakningarnúmer" hint="T.d. frá Samskip fyrir heimsendingar.">
                  <Input name="trackingNumber" defaultValue={order.trackingNumber} />
                </Field>
                <Field label="Tilvísun hjá Samskip" hint="Valfrjálst.">
                  <Input name="samskipRef" defaultValue={order.samskipRef} />
                </Field>
              </div>
              <SubmitButton variant="dark">Vista</SubmitButton>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Viðskiptavinur">
            <div className="space-y-1.5 text-[15px]">
              <div className="text-base font-semibold">{order.name}</div>
              <div className="flex items-center gap-2"><a href={`mailto:${order.email}`} className="text-burgundy underline">{order.email}</a> <CopyButton value={order.email} /></div>
              {order.phone ? <div><a href={`tel:${order.phone}`} className="text-burgundy underline">{order.phone}</a></div> : null}
              {order.kennitala ? <div className="text-muted">Kt. {order.kennitala}</div> : null}
            </div>
            {order.customer ? (
              <Link href={`/admin/vidskiptavinir/${order.customer.id}`} className={buttonClass("light", "sm", "mt-4")}>
                Opna viðskiptavin {otherOrders ? `(${plural(otherOrders, "önnur pöntun", "aðrar pantanir")})` : ""}
              </Link>
            ) : null}
            {order.subscription ? (
              <Link href={`/admin/askriftir/${order.subscription.id}`} className="mt-3 flex items-center gap-2 rounded-xl bg-pink-100/60 px-3 py-2 text-sm font-medium text-burgundy hover:bg-pink-100">
                <Icon name="repeat" className="h-4 w-4" /> Tengd áskrift: {order.subscription.product.name}
              </Link>
            ) : null}
          </Card>

          <Card title="Afhending">
            <div className="space-y-1 text-[15px]">
              <div className="font-semibold">{DELIVERY_METHOD_LABELS[order.deliveryMethod] ?? order.deliveryMethod}</div>
              {order.deliveryMethod === "PIKKOLO" ? <div>{order.pikkoloStationName || <span className="text-orange-600">Engin stöð valin</span>}</div> : null}
              {order.deliveryMethod !== "PIKKOLO" && (order.street || order.city) ? (
                <div>{order.street}<br />{order.postalCode} {order.city}</div>
              ) : null}
              <div className="text-muted">
                {order.delivery ? <>Sending {dateWithDayAcc(order.delivery.date)}</> : order.deliveryDate ? <>Sending {dateShort(order.deliveryDate)}</> : "Ekki tengd sendingu"}
              </div>
            </div>

            <details className="mt-4 rounded-xl border border-line" open={!!sp.stod}>
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-burgundy">Breyta afhendingu</summary>
              <form action={updateOrderDelivery} className="space-y-3 border-t border-line p-3">
                <Hidden />
                <Field label="Afhendingarmáti">
                  <Select name="deliveryMethod" defaultValue={order.deliveryMethod}>
                    {Object.entries(DELIVERY_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                <Field label="Sending">
                  <Select name="deliveryId" defaultValue={order.deliveryId ?? ""}>
                    <option value="">Ekki tengd sendingu</option>
                    {order.delivery && !deliveries.some((d) => d.id === order.deliveryId) ? <option value={order.delivery.id}>{dateShort(order.delivery.date)}</option> : null}
                    {deliveries.map((d) => <option key={d.id} value={d.id}>{dateWithDayAcc(d.date)}</option>)}
                  </Select>
                </Field>
                {stations ? (
                  <Field label="Pikkoló stöð og afhendingardagur" error={stations.error}>
                    <Select name="station" defaultValue="">
                      <option value="">Óbreytt ({order.pikkoloStationName || "engin"})</option>
                      {stations.stations.map((s) => (
                        <optgroup key={s.id} label={`${s.name} · ${s.address.street}, ${s.address.postalCode} ${s.address.city}`}>
                          {s.deliveryTimes.filter((t) => t.available).map((t) => (
                            <option key={t.id} value={`${s.id}|${t.id}|${s.name}`}>{s.name}: {dateWithDayAcc(t.date)}</option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                  </Field>
                ) : order.deliveryMethod === "PIKKOLO" ? (
                  <Link href={`${here}?stod=1`} className="inline-flex items-center gap-1 text-sm font-semibold text-burgundy underline">
                    <Icon name="pin" className="h-4 w-4" /> Velja Pikkoló stöð úr lista
                  </Link>
                ) : null}
                <Field label="Heimilisfang"><Input name="street" defaultValue={order.street} /></Field>
                <div className="grid grid-cols-[1fr_2fr] gap-2">
                  <Field label="Póstnr."><Input name="postalCode" defaultValue={order.postalCode} /></Field>
                  <Field label="Staður"><Input name="city" defaultValue={order.city} /></Field>
                </div>
                <Field label="Sími"><Input name="phone" defaultValue={order.phone} /></Field>
                <SubmitButton variant="dark" size="sm">Vista afhendingu</SubmitButton>
              </form>
            </details>
          </Card>

          {order.deliveryMethod === "PIKKOLO" ? (
            <Card
              title={<span className="inline-flex items-center gap-2">Pikkoló <HelpTip>Þegar pöntun er send til Pikkoló veit Pikkoló hvaða kassi kemur í hvaða stöð og hvenær, og lætur viðskiptavininn vita þegar hann getur sótt.</HelpTip></span>}
              description={pk.environment === "production" ? "Raunumhverfi" : "Prófunarumhverfi (staging)"}
            >
              {order.pikkoloOrderId ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-leaf/10 px-3 py-2 text-[15px]">
                    <div className="font-semibold text-leaf">Send til Pikkoló</div>
                    <div className="text-sm">Auðkenni: <code>{order.pikkoloOrderId}</code></div>
                    {order.pikkoloStatus ? <div className="text-sm">Staða: {order.pikkoloStatus}</div> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={refreshPikkolo}><Hidden /><SubmitButton variant="light" size="sm"><Icon name="refresh" className="h-4 w-4" /> Sækja stöðu</SubmitButton></form>
                    {order.pikkoloStatus !== "CANCELLED" ? (
                      <form action={cancelAtPikkolo}><Hidden /><SubmitButton variant="ghost" size="sm" confirm="Hætta við pöntunina hjá Pikkoló?">Hætta við hjá Pikkoló</SubmitButton></form>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-[15px]">
                  {!pk.canSubmit ? (
                    <p className="rounded-xl bg-lemon-100 px-3 py-2 text-sm">Pikkoló API-lykil vantar. <Link href="/admin/tengingar" className="font-semibold underline">Settu hann inn undir Tengingar</Link>.</p>
                  ) : null}
                  {!order.pikkoloStationId || !order.pikkoloDeliveryTimeId ? (
                    <p className="rounded-xl bg-orange/10 px-3 py-2 text-sm">Það vantar stöð eða afhendingardag. <Link href={`${here}?stod=1`} className="font-semibold underline">Veldu stöð</Link> fyrst.</p>
                  ) : null}
                  <form action={sendToPikkolo}>
                    <Hidden />
                    <SubmitButton variant="primary" className="w-full" confirm={pk.environment === "production" ? "Senda pöntunina til Pikkoló (raunumhverfi)?" : undefined}>
                      <Icon name="pin" className="h-4 w-4" /> Senda til Pikkoló
                    </SubmitButton>
                  </form>
                </div>
              )}
            </Card>
          ) : null}

          <Card title="Annað">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-muted">Uppruni</dt><dd>{SOURCE_LABELS[order.source] ?? order.source}</dd></div>
              {order.wooId ? <div className="flex justify-between gap-2"><dt className="text-muted">WooCommerce nr.</dt><dd>{order.wooId}</dd></div> : null}
              <div className="flex justify-between gap-2"><dt className="text-muted">Síðast breytt</dt><dd>{dateTime(order.updatedAt)}</dd></div>
            </dl>
            {order.status !== "CANCELLED" ? (
              <form action={cancelOrder} className="mt-4 border-t border-line pt-4">
                <Hidden />
                <SubmitButton variant="danger" size="sm" confirm={`Ertu viss um að þú viljir hætta við pöntun #${order.number}? ${order.pikkoloOrderId ? "Hún verður líka afturkölluð hjá Pikkoló." : ""}`}>
                  Hætta við pöntun
                </SubmitButton>
                <p className="mt-2 text-xs text-muted">Endurgreiðsla er ekki framkvæmd sjálfkrafa. Merktu greiðslustöðu &quot;Endurgreidd&quot; þegar hún hefur farið fram.</p>
              </form>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
