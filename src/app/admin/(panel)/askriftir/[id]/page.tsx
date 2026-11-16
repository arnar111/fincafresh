import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { kr, dateLong, dateInput, dateTime, dateWithDayAcc, dateShort } from "@/lib/format";
import { getSetting } from "@/lib/settings";
import { SOURCE_LABELS, frequencyLabel, subPricePerDelivery, startOfDay, isDemoEmail } from "@/lib/admin-ops";
import { DELIVERY_METHOD_LABELS } from "@/lib/orders";
import { PageHeader, Card, Explainer, HelpTip, SubStatusBadge, OrderStatusBadge } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/forms";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { toggleSkip, pauseSubscription, resumeSubscription, updatePlan, updateSubDelivery, setRepeatId, cancelSubscription } from "../actions";

export const dynamic = "force-dynamic";

const CANCEL_REASONS = ["Of mikið af ávöxtum", "Of dýrt", "Flutti / hentar ekki afhendingin", "Prófaði bara", "Óánægð(ur) með gæðin", "Annað"];

export default async function SubscriptionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await db.subscription.findUnique({ where: { id }, include: { customer: true, product: true } });
  if (!s) notFound();

  const [boxes, freqs, nextDelivery, orders, freqLabel] = await Promise.all([
    db.product.findMany({ where: { type: "BOX" }, orderBy: { sortOrder: "asc" } }),
    getSetting("subscription.frequencies"),
    db.delivery.findFirst({ where: { date: { gte: startOfDay() }, status: { in: ["PLANNED", "PACKING"] } }, orderBy: { date: "asc" } }),
    db.order.findMany({
      where: { OR: [{ subscriptionId: s.id }, { customerId: s.customerId, items: { some: { productId: s.productId, isSubscription: true } } }] },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    frequencyLabel(s.everyNthDelivery),
  ]);

  // Fær áskriftin kassa í næstu sendingu?
  let nextInfo: { text: string; tone: "good" | "warn" | "muted" } = { text: "Engin næsta sending er skráð.", tone: "muted" };
  if (nextDelivery) {
    const already = orders.some((o) => o.deliveryId === nextDelivery.id && o.status !== "CANCELLED");
    const when = dateWithDayAcc(nextDelivery.date);
    if (s.status === "CANCELLED") nextInfo = { text: "Áskriftinni hefur verið sagt upp.", tone: "muted" };
    else if (already) nextInfo = { text: `Pöntun er þegar til fyrir sendinguna ${when}.`, tone: "good" };
    else if (s.status === "PAUSED" && !(s.pausedUntil && s.pausedUntil <= nextDelivery.date)) nextInfo = { text: `Í hléi: fær ekki kassa ${when}.`, tone: "warn" };
    else if (s.skipNext) nextInfo = { text: `Sleppir sendingunni ${when}.`, tone: "warn" };
    else if (s.deliveriesSinceLast + 1 < s.everyNthDelivery) nextInfo = { text: `Fær ekki kassa ${when} (kemur í annarri hverri sendingu).`, tone: "muted" };
    else nextInfo = { text: `Fær kassa ${when}.`, tone: "good" };
  }

  const unitAfter = Math.round((s.unitPrice * (100 - s.discountPct)) / 100);
  const here = `/admin/askriftir/${s.id}`;
  const Hidden = () => <input type="hidden" name="id" value={s.id} />;
  const minPause = dateInput(new Date(Date.now() + 86400000));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/askriftir", label: "Allar áskriftir" }}
        title={s.customer.name || s.customer.email}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {s.quantity > 1 ? `${s.quantity} × ` : ""}{s.product.name} · {freqLabel}
            <SubStatusBadge status={s.status} />
            {s.skipNext && s.status === "ACTIVE" ? <Badge tone="orange">Sleppir næstu</Badge> : null}
            {isDemoEmail(s.customer.email) ? <Badge tone="lemon">Prufugögn</Badge> : null}
          </span>
        }
        actions={<Link href={`/admin/vidskiptavinir/${s.customerId}`} className={buttonClass("light", "sm")}><Icon name="user" className="h-4 w-4" /> Viðskiptavinur</Link>}
      />

      <Explainer title="Hvað get ég gert hér?">
        <p><strong>Sleppa næstu sendingu:</strong> viðskiptavinurinn fær ekki kassa í næstu sendingu, en áskriftin heldur svo áfram.</p>
        <p><strong>Gera hlé:</strong> engir kassar þar til dagsetningin sem þú velur. Ef enginn dagur er valinn er hléið þar til þú smellir á &quot;Halda áfram&quot;.</p>
        <p><strong>Breyta:</strong> skipta um kassa, magn eða hversu oft kassinn kemur. Breytingar gilda um næstu pöntun sem verður til.</p>
        <p>Greiðslur fyrir áskriftir fara í gegnum <strong>Repeat</strong>. Repeat-auðkennið tengir áskriftina hér við áskriftina þar.</p>
      </Explainer>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card title="Yfirlit">
            <div className={`mb-4 flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] ${nextInfo.tone === "good" ? "bg-leaf/10 text-leaf" : nextInfo.tone === "warn" ? "bg-orange/10 text-orange-600" : "bg-cream text-muted"}`}>
              <Icon name="truck" className="h-5 w-5 shrink-0" />
              <span className="font-semibold">{nextInfo.text}</span>
            </div>
            <dl className="grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-2">
              <div><dt className="text-sm text-muted">Kassi</dt><dd className="font-medium">{s.quantity} × {s.product.name}</dd></div>
              <div><dt className="text-sm text-muted">Tíðni</dt><dd className="font-medium">{freqLabel}</dd></div>
              <div><dt className="text-sm text-muted">Verð á hverja sendingu</dt><dd className="font-medium">{kr(subPricePerDelivery(s))} <span className="text-sm text-muted">({s.quantity} × {kr(unitAfter)}, {s.discountPct}% afsláttur af {kr(s.unitPrice)})</span></dd></div>
              <div><dt className="text-sm text-muted">Afhending</dt><dd className="font-medium">{DELIVERY_METHOD_LABELS[s.deliveryMethod] ?? s.deliveryMethod}{s.deliveryMethod === "PIKKOLO" && s.pikkoloStationName ? `: ${s.pikkoloStationName}` : ""}{s.deliveryMethod === "HOME" ? `: ${s.street}, ${s.postalCode} ${s.city}` : ""}</dd></div>
              <div><dt className="text-sm text-muted">Stofnuð</dt><dd>{dateLong(s.createdAt)} · {SOURCE_LABELS[s.source] ?? s.source}</dd></div>
              {s.status === "PAUSED" ? <div><dt className="text-sm text-muted">Í hléi til</dt><dd>{s.pausedUntil ? dateLong(s.pausedUntil) : "Óákveðið"}</dd></div> : null}
              {s.status === "CANCELLED" ? <div><dt className="text-sm text-muted">Sagt upp</dt><dd>{s.cancelledAt ? dateLong(s.cancelledAt) : ""}{s.cancelReason ? ` · ${s.cancelReason}` : ""}</dd></div> : null}
            </dl>
          </Card>

          {s.status !== "CANCELLED" ? (
            <Card title="Fljótlegar aðgerðir">
              <div className="grid gap-4 sm:grid-cols-2">
                <form action={toggleSkip} className="rounded-xl border border-line p-4">
                  <Hidden />
                  <div className="mb-1 font-semibold">{s.skipNext ? "Hætta við að sleppa" : "Sleppa næstu sendingu"}</div>
                  <p className="mb-3 text-sm text-muted">{s.skipNext ? "Áskriftin fær þá kassa í næstu sendingu eins og venjulega." : "Engin pöntun verður til í næstu sendingu. Svo heldur áskriftin áfram."}</p>
                  <SubmitButton variant={s.skipNext ? "light" : "dark"} size="sm"><Icon name="skip" className="h-4 w-4" /> {s.skipNext ? "Fá kassa í næstu" : "Sleppa næstu"}</SubmitButton>
                </form>
                {s.status === "PAUSED" ? (
                  <form action={resumeSubscription} className="rounded-xl border border-line p-4">
                    <Hidden />
                    <div className="mb-1 font-semibold">Halda áfram</div>
                    <p className="mb-3 text-sm text-muted">Áskriftin verður virk strax og fær kassa í næstu sendingu.</p>
                    <SubmitButton variant="green" size="sm"><Icon name="play" className="h-4 w-4" /> Halda áfram</SubmitButton>
                  </form>
                ) : (
                  <form action={pauseSubscription} className="rounded-xl border border-line p-4">
                    <Hidden />
                    <div className="mb-1 font-semibold">Gera hlé</div>
                    <Field label="Til og með" hint="Skildu eftir autt fyrir hlé þar til annað er ákveðið." className="mb-3">
                      <Input type="date" name="pausedUntil" min={minPause} />
                    </Field>
                    <SubmitButton variant="dark" size="sm"><Icon name="pause" className="h-4 w-4" /> Gera hlé</SubmitButton>
                  </form>
                )}
              </div>
            </Card>
          ) : (
            <Card title="Áskrift sagt upp">
              <form action={resumeSubscription} className="flex flex-wrap items-center justify-between gap-3">
                <Hidden />
                <p className="text-[15px] text-muted">Viltu virkja áskriftina aftur? Hún fær þá kassa í næstu sendingu.</p>
                <SubmitButton variant="green" size="sm" confirm="Virkja áskriftina aftur?"><Icon name="refresh" className="h-4 w-4" /> Virkja aftur</SubmitButton>
              </form>
            </Card>
          )}

          <Card title="Breyta áskrift">
            <form action={updatePlan} className="space-y-4">
              <Hidden />
              <div className="grid gap-4 sm:grid-cols-[2fr_0.8fr_1.6fr]">
                <Field label="Kassi">
                  <Select name="productId" defaultValue={s.productId}>
                    {boxes.map((b) => <option key={b.id} value={b.id}>{b.name} ({kr(b.price)})</option>)}
                  </Select>
                </Field>
                <Field label="Magn">
                  <Input name="quantity" type="number" min={1} max={20} defaultValue={s.quantity} />
                </Field>
                <Field label="Tíðni">
                  <Select name="everyNthDelivery" defaultValue={String(s.everyNthDelivery)}>
                    {freqs.map((f) => <option key={f.every} value={f.every}>{f.label}</option>)}
                    {!freqs.some((f) => f.every === s.everyNthDelivery) ? <option value={s.everyNthDelivery}>{freqLabel}</option> : null}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={<span className="inline-flex items-center gap-1.5">Afsláttur (%) <HelpTip>Venjulega fylgir afslátturinn kassanum (stilltur undir Vörur). Hér getur þú gefið þessum viðskiptavini sérstakan afslátt. Skildu eftir autt til að halda núverandi.</HelpTip></span>}>
                  <Input name="discountPct" type="number" min={0} max={90} placeholder={String(s.discountPct)} />
                </Field>
                <label className="flex items-center gap-2 self-end pb-3 text-[15px]">
                  <input type="checkbox" name="updatePrice" className="h-4 w-4 accent-burgundy" />
                  Uppfæra í núverandi verð kassans ({kr(s.product.price)})
                </label>
              </div>
              <SubmitButton variant="dark">Vista breytingar</SubmitButton>
            </form>
          </Card>

          <Card title="Pantanir úr þessari áskrift" padded={false}>
            {orders.length ? (
              <ul className="divide-y divide-line/70">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/pantanir/${o.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-cream-50">
                      <span className="font-semibold text-burgundy">#{o.number}</span>
                      <span className="text-sm text-muted">{dateTime(o.createdAt)}{o.deliveryDate ? ` · sending ${dateShort(o.deliveryDate)}` : ""}</span>
                      <span className="ml-auto flex items-center gap-3"><OrderStatusBadge status={o.status} /><span className="font-semibold tabular-nums">{kr(o.total)}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-muted">Engar pantanir ennþá.</p>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Viðskiptavinur">
            <div className="space-y-1 text-[15px]">
              <div className="font-semibold">{s.customer.name}</div>
              <a href={`mailto:${s.customer.email}`} className="block text-burgundy underline">{s.customer.email}</a>
              {s.customer.phone ? <a href={`tel:${s.customer.phone}`} className="block text-burgundy underline">{s.customer.phone}</a> : null}
            </div>
          </Card>

          <Card title="Afhending">
            <form action={updateSubDelivery} className="space-y-3">
              <Hidden />
              <Field label="Afhendingarmáti">
                <Select name="deliveryMethod" defaultValue={s.deliveryMethod}>
                  {Object.entries(DELIVERY_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Pikkoló stöð (nafn)" hint="Notað ef afhending er Pikkoló.">
                <Input name="pikkoloStationName" defaultValue={s.pikkoloStationName} />
              </Field>
              <input type="hidden" name="pikkoloStationId" value={s.pikkoloStationId} />
              <Field label="Heimilisfang"><Input name="street" defaultValue={s.street} /></Field>
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <Field label="Póstnr."><Input name="postalCode" defaultValue={s.postalCode} /></Field>
                <Field label="Staður"><Input name="city" defaultValue={s.city} /></Field>
              </div>
              <SubmitButton variant="dark" size="sm">Vista afhendingu</SubmitButton>
            </form>
          </Card>

          <Card title={<span className="inline-flex items-center gap-2">Repeat <HelpTip>Repeat sér um að rukka áskriftir. Repeat hefur ekki opinbera API-skjölun, svo tengingin er handvirk í bili: skráðu auðkenni áskriftarinnar úr Repeat hér.</HelpTip></span>}>
            <form action={setRepeatId} className="space-y-3">
              <Hidden />
              <Field label="Repeat-auðkenni"><Input name="repeatId" defaultValue={s.repeatId} placeholder="T.d. númer úr Repeat" /></Field>
              <SubmitButton variant="light" size="sm">Vista</SubmitButton>
            </form>
          </Card>

          {s.status !== "CANCELLED" ? (
            <Card title="Segja upp áskrift">
              <form action={cancelSubscription} className="space-y-3">
                <Hidden />
                <p className="text-sm text-muted">Hefur viðskiptavinurinn íhugað að <strong>sleppa sendingu</strong> eða <strong>gera hlé</strong> í staðinn? Það heldur viðskiptunum.</p>
                <Field label="Ástæða">
                  <Select name="reasonPreset" defaultValue="">
                    <option value="">Veldu ástæðu…</option>
                    {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </Field>
                <Field label="Nánar (valfrjálst)"><Textarea name="reason" rows={2} /></Field>
                <SubmitButton variant="danger" size="sm" confirm="Ertu viss um að þú viljir segja áskriftinni upp?">Segja upp</SubmitButton>
              </form>
            </Card>
          ) : null}
          <p className="px-1 text-xs text-muted">Síðast breytt {dateTime(s.updatedAt)}. Áskriftin <Link href={here} className="underline">#{s.id.slice(-6)}</Link>.</p>
        </div>
      </div>
    </>
  );
}
