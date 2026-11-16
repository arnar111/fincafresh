import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { kr, num, dateWithDayAcc, dateInput, dateShort, plural } from "@/lib/format";
import { DELIVERY_METHOD_LABELS } from "@/lib/orders";
import { DELIVERY_STATUS_LABELS, packingSummary, startOfDay } from "@/lib/admin-ops";
import { pikkoloConfig } from "@/lib/integrations/pikkolo";
import { PageHeader, Card, Explainer, HelpTip, EmptyState, OrderStatusBadge, th, td, tableWrap, tableClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/forms";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { FruitArt } from "@/components/brand/FruitArt";
import {
  updateDelivery,
  setDeliveryStatus,
  deleteDelivery,
  addFruit,
  removeFruit,
  toggleDeluxe,
  moveFruit,
  generateOrders,
  sendDeliveryToPikkolo,
  saveTrackingNumbers,
  attachUnassigned,
} from "../actions";

export const dynamic = "force-dynamic";

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 px-5 py-4">
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold", done ? "bg-leaf text-white" : "bg-cream text-burgundy")}>
        {done ? <Icon name="check" className="h-4 w-4" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{title}</div>
        <div className="mt-1 text-[15px] text-muted">{children}</div>
      </div>
    </li>
  );
}

export default async function DeliveryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await packingSummary(id);
  if (!data) notFound();
  const { delivery, orders, boxRows, extras, fruitRows, projection, totals } = data;

  const [allFruits, unassigned, pk, nextUpcoming] = await Promise.all([
    db.fruit.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.order.count({ where: { deliveryId: null, status: { in: ["NEW", "PROCESSING"] } } }),
    pikkoloConfig(),
    db.delivery.findFirst({ where: { date: { gte: startOfDay() }, status: { in: ["PLANNED", "PACKING"] } }, orderBy: { date: "asc" }, select: { id: true } }),
  ]);
  const inBox = new Set(delivery.fruits.map((f) => f.fruitId));
  const available = allFruits.filter((f) => !inBox.has(f.id));
  const homeOrders = orders.filter((o) => o.deliveryMethod === "HOME");
  const isOnHomepage = nextUpcoming?.id === delivery.id;
  const H = () => <input type="hidden" name="id" value={delivery.id} />;
  const fruitsSorted = delivery.fruits; // þegar raðað: venjulegir fyrst, svo Delúx

  return (
    <>
      <PageHeader
        back={{ href: "/admin/sendingar", label: "Allar sendingar" }}
        title={`Sending ${dateWithDayAcc(delivery.date)}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {delivery.title ? <span>{delivery.title}</span> : null}
            <Badge tone="lemon">{DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status}</Badge>
            {isOnHomepage ? <Badge tone="green">Birtist á forsíðu</Badge> : null}
            {delivery.cutoffDate ? <span>Pöntunarfrestur {dateShort(delivery.cutoffDate)}</span> : null}
          </span>
        }
        actions={
          <>
            <Link href={`/admin/sendingar/${delivery.id}/fylgisedlar`} target="_blank" className={buttonClass("light", "sm")}><Icon name="download" className="h-4 w-4" /> Prenta fylgiseðla</Link>
            <a href={`/api/admin/export/pokkunarlisti?delivery=${delivery.id}`} className={buttonClass("light", "sm")}><Icon name="download" className="h-4 w-4" /> Pökkunarlisti (CSV)</a>
            <Link href={`/admin/pantanir?sending=${delivery.id}`} className={buttonClass("dark", "sm")}>Pantanir ({orders.length})</Link>
          </>
        }
      />

      <Explainer>
        <p>Hér stjórnar þú einni sendingu frá upphafi til enda. Fylgdu <strong>skrefunum</strong> hér fyrir neðan í réttri röð.</p>
        <p><strong>Ávextir:</strong> það sem þú velur hér birtist á forsíðunni. Ávextir merktir <strong>Aðeins Delúx</strong> fá gullhring og glóa á síðunni svo fólk sjái hvað það fær aukalega í Delúx kassanum.</p>
        <p><strong>Innkaupaáætlun</strong> segir hve marga kassa hver ávöxtur fer í, svo þú vitir hvað þarf að panta frá bændunum.</p>
      </Explainer>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card title="Skref fyrir skref" padded={false}>
            <ol className="divide-y divide-line/70">
              <Step n={1} done={delivery.fruits.length > 0} title="Veldu ávextina í kassann">
                {delivery.fruits.length ? `${plural(delivery.fruits.length, "ávöxtur valinn", "ávextir valdir")}, þar af ${delivery.fruits.filter((f) => f.deluxeOnly).length} aðeins í Delúx.` : "Engir ávextir valdir ennþá. Bættu þeim við hér fyrir neðan."}
              </Step>
              <Step n={2} done={projection.count === 0 && totals.orders > 0} title="Búðu til áskriftarpantanir">
                {projection.count ? (
                  <>
                    <span className="mb-2 block"><strong className="text-ink">{plural(projection.count, "áskrift", "áskriftir")}</strong> {projection.count === 1 ? "á að fá kassa en er ekki komin" : "eiga að fá kassa en eru ekki komnar"} með pöntun.{projection.skipped ? ` ${projection.skipped} sleppa þessari sendingu.` : ""}{projection.paused ? ` ${projection.paused} eru í hléi.` : ""}</span>
                    <form action={generateOrders}>
                      <H />
                      <SubmitButton variant="primary" size="sm" confirm={`Búa til ${projection.count} áskriftarpantanir fyrir þessa sendingu? Það er óhætt að gera þetta aftur síðar, enginn fær tvær pantanir.`}>
                        <Icon name="repeat" className="h-4 w-4" /> Búa til áskriftarpantanir
                      </SubmitButton>
                    </form>
                  </>
                ) : (
                  <>Allar virkar áskriftir eru komnar með pöntun.{projection.already ? ` ${plural(projection.already, "áskriftarpöntun", "áskriftarpantanir")} í þessari sendingu.` : ""}</>
                )}
              </Step>
              <Step n={3} done={delivery.status !== "PLANNED"} title="Pakkaðu kössunum">
                <span className="mb-2 block">{plural(totals.boxes + totals.projectedBoxes, "kassi", "kassar")} og {plural(extras.reduce((s, e) => s + e.qty, 0), "aukavara", "aukavörur")}. Prentaðu fylgiseðla og settu einn í hvern kassa.</span>
                <Link href={`/admin/sendingar/${delivery.id}/fylgisedlar`} target="_blank" className={buttonClass("light", "sm")}>Prenta fylgiseðla</Link>
              </Step>
              <Step n={4} done={totals.pikkolo > 0 && totals.pikkoloUnsent === 0} title="Sendu Pikkoló pantanir til Pikkoló">
                {totals.pikkolo ? (
                  <>
                    <span className="mb-2 block">{totals.pikkoloUnsent ? <><strong className="text-ink">{totals.pikkoloUnsent}</strong> af {totals.pikkolo} eiga eftir að fara til Pikkoló.</> : `Allar ${totals.pikkolo} hafa verið sendar.`}</span>
                    {totals.pikkoloUnsent ? (
                      pk.canSubmit ? (
                        <form action={sendDeliveryToPikkolo}>
                          <H />
                          <SubmitButton variant="dark" size="sm" confirm={`Senda ${totals.pikkoloUnsent} pantanir til Pikkoló${pk.environment === "production" ? " (raunumhverfi)" : " (prófunarumhverfi)"}?`}><Icon name="pin" className="h-4 w-4" /> Senda allar til Pikkoló</SubmitButton>
                        </form>
                      ) : (
                        <span className="block rounded-xl bg-lemon-100 px-3 py-2 text-sm text-ink">Pikkoló API-lykil vantar. <Link href="/admin/tengingar" className="font-semibold underline">Tengingar</Link></span>
                      )
                    ) : null}
                  </>
                ) : (
                  "Engar Pikkoló pantanir í þessari sendingu."
                )}
              </Step>
              <Step n={5} done={homeOrders.length > 0 && homeOrders.every((o) => o.trackingNumber)} title="Heimsendingar með Samskip">
                {homeOrders.length ? (
                  <>
                    <span className="mb-2 block">{plural(homeOrders.length, "heimsending", "heimsendingar")}. Samskip API er ekki komið, svo sæktu sendingarlistann og sendu Samskip. Skráðu svo rakningarnúmerin hér fyrir neðan.</span>
                    <a href={`/api/admin/export/samskip?delivery=${delivery.id}`} className={buttonClass("light", "sm")}><Icon name="download" className="h-4 w-4" /> Sendingarlisti fyrir Samskip (CSV)</a>
                  </>
                ) : (
                  "Engar heimsendingar í þessari sendingu."
                )}
              </Step>
              <Step n={6} done={delivery.status === "DONE"} title="Merktu sendinguna">
                <form action={setDeliveryStatus} className="flex flex-wrap items-center gap-2">
                  <H />
                  <div className="w-48">
                    <Select name="status" defaultValue={delivery.status} className="py-2" aria-label="Staða sendingar">
                      {Object.entries(DELIVERY_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                  </div>
                  <label className="flex items-center gap-1.5 text-sm text-ink">
                    <input type="checkbox" name="updateOrders" defaultChecked className="h-4 w-4 accent-burgundy" /> Uppfæra líka stöðu pantana
                  </label>
                  <SubmitButton variant="dark" size="sm">Vista</SubmitButton>
                  <HelpTip>&quot;Í pökkun&quot; merkir pantanirnar &quot;Í vinnslu&quot;, &quot;Lögð af stað&quot; merkir þær &quot;Send&quot; og &quot;Lokið&quot; merkir þær &quot;Afhent&quot;.</HelpTip>
                </form>
              </Step>
            </ol>
          </Card>

          <Card
            title="Ávextir í kassanum"
            description="Röðin hér er röðin á forsíðunni. Delúx ávextir birtast með gullhring."
            actions={<Link href="/admin/avextir" className={buttonClass("ghost", "sm")}>Breyta ávaxtatextum</Link>}
            padded={false}
          >
            {fruitsSorted.length ? (
              <ul className="divide-y divide-line/70">
                {fruitsSorted.map((df, i) => (
                  <li key={df.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-full", df.deluxeOnly ? "gold-ring" : "bg-cream")}>
                      <span className="grid h-full w-full place-items-center rounded-full bg-white"><FruitArt kind={df.fruit.illustration || "other"} className="h-8 w-8" /></span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{df.fruit.name}</div>
                      <div className="text-xs text-muted">{df.deluxeOnly ? "Aðeins í Delúx" : "Í öllum kössum"}{!df.fruit.reviewed ? " · texti ekki yfirfarinn" : ""}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <form action={moveFruit}><H /><input type="hidden" name="dfId" value={df.id} /><input type="hidden" name="dir" value="up" /><button disabled={i === 0} className="rounded-lg p-2 text-burgundy hover:bg-cream disabled:opacity-30" aria-label={`Færa ${df.fruit.name} upp`}><Icon name="arrow" className="h-4 w-4 -rotate-90" /></button></form>
                      <form action={moveFruit}><H /><input type="hidden" name="dfId" value={df.id} /><input type="hidden" name="dir" value="down" /><button disabled={i === fruitsSorted.length - 1} className="rounded-lg p-2 text-burgundy hover:bg-cream disabled:opacity-30" aria-label={`Færa ${df.fruit.name} niður`}><Icon name="arrow" className="h-4 w-4 rotate-90" /></button></form>
                      <form action={toggleDeluxe}>
                        <H /><input type="hidden" name="dfId" value={df.id} />
                        <button className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", df.deluxeOnly ? "bg-gradient-to-r from-[#FFE27A] via-lemon to-[#E0A100] text-burgundy-900" : "border border-line text-burgundy hover:bg-cream")}>
                          {df.deluxeOnly ? "★ Aðeins Delúx" : "Gera að Delúx"}
                        </button>
                      </form>
                      <form action={removeFruit}><H /><input type="hidden" name="dfId" value={df.id} /><SubmitButton variant="ghost" size="sm" confirm={`Taka ${df.fruit.name} úr kassanum?`}><Icon name="trash" className="h-4 w-4" /><span className="sr-only">Fjarlægja</span></SubmitButton></form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="leaf" title="Engir ávextir valdir">Veldu ávexti hér fyrir neðan. Þeir birtast á forsíðunni.</EmptyState>
            )}
            <form action={addFruit} className="flex flex-wrap items-end gap-3 border-t border-line/70 bg-cream-50 px-5 py-4">
              <H />
              <Field label="Bæta við ávexti" className="min-w-[200px] flex-1">
                <Select name="fruitId" defaultValue="" required>
                  <option value="" disabled>Veldu ávöxt…</option>
                  {available.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </Field>
              <label className="flex items-center gap-2 pb-3 text-[15px]">
                <input type="checkbox" name="deluxeOnly" className="h-4 w-4 accent-burgundy" /> Aðeins Delúx
              </label>
              <SubmitButton variant="dark"><Icon name="plus" className="h-4 w-4" /> Bæta við</SubmitButton>
            </form>
            {!available.length ? <p className="px-5 pb-4 text-sm text-muted">Allir ávextir eru í kassanum. <Link href="/admin/avextir" className="underline">Skráðu nýjan ávöxt</Link>.</p> : null}
          </Card>

          <Card title="Pantanir í þessari sendingu" description={`${plural(orders.length, "pöntun", "pantanir")} · ${totals.pikkolo} Pikkoló · ${totals.home} heimsendingar${totals.pickup ? ` · ${totals.pickup} sóttar` : ""}`} padded={false}>
            {orders.length ? (
              <div className={tableWrap}>
                <table className={tableClass}>
                  <thead><tr><th className={th}>Pöntun</th><th className={th}>Nafn</th><th className={th}>Innihald</th><th className={th}>Afhending</th><th className={th}>Staða</th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className={td}><Link href={`/admin/pantanir/${o.id}`} className="font-semibold text-burgundy hover:underline">#{o.number}</Link>{o.source === "SUBSCRIPTION" ? <div className="text-xs text-muted">Áskrift</div> : null}</td>
                        <td className={td}>{o.name}</td>
                        <td className={`${td} text-sm`}>{o.items.map((i) => <div key={i.id}>{i.quantity} × {i.name}</div>)}</td>
                        <td className={`${td} text-sm`}>{DELIVERY_METHOD_LABELS[o.deliveryMethod]}{o.deliveryMethod === "PIKKOLO" ? <div className={cn("text-xs", o.pikkoloOrderId ? "text-leaf" : "text-orange-600")}>{o.pikkoloOrderId ? "Send til Pikkoló" : "Ekki send"}</div> : null}</td>
                        <td className={td}><OrderStatusBadge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="box" title="Engar pantanir ennþá">Pantanir sem berast fyrir pöntunarfrest tengjast sjálfkrafa þessari sendingu. Áskriftarpantanir verða til í skrefi 2.</EmptyState>
            )}
            {unassigned ? (
              <form action={attachUnassigned} className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 bg-lemon-100/50 px-5 py-3 text-sm">
                <H />
                <span>{plural(unassigned, "opin pöntun er", "opnar pantanir eru")} ekki tengdar neinni sendingu.</span>
                <SubmitButton variant="light" size="sm" confirm="Tengja allar opnar pantanir án sendingar við þessa sendingu?">Tengja við þessa sendingu</SubmitButton>
              </form>
            ) : null}
          </Card>

          {homeOrders.length ? (
            <Card title="Rakningarnúmer heimsendinga" description="Skráðu númerin frá Samskip. Þau sjást á hverri pöntun.">
              <form action={saveTrackingNumbers} className="space-y-3">
                <H />
                {homeOrders.map((o) => (
                  <div key={o.id} className="grid items-center gap-2 sm:grid-cols-[1fr_1.2fr]">
                    <div className="text-[15px]"><span className="font-semibold">#{o.number}</span> {o.name} <span className="text-muted">· {o.street}, {o.postalCode} {o.city}</span></div>
                    <Input name={`tracking_${o.id}`} defaultValue={o.trackingNumber} placeholder="Rakningarnúmer" aria-label={`Rakningarnúmer fyrir pöntun ${o.number}`} />
                  </div>
                ))}
                <SubmitButton variant="dark" size="sm">Vista rakningarnúmer</SubmitButton>
              </form>
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Pökkunarlisti" description="Kassar sem þarf að pakka í þessa sendingu." padded={false}>
            <div className={tableWrap}>
              <table className="w-full text-[14.5px]">
                <thead><tr><th className={th}>Kassi</th><th className={`${th} text-right`}>Stakir</th><th className={`${th} text-right`}>Áskrift</th><th className={`${th} text-right`}>Samtals</th></tr></thead>
                <tbody>
                  {boxRows.map((b) => (
                    <tr key={b.productId} className="border-t border-line/70">
                      <td className={td}><div className="font-medium">{b.name}</div>{b.projected ? <div className="text-xs text-orange-600">+{b.projected} úr áskriftum sem á eftir að stofna</div> : null}</td>
                      <td className={`${td} text-right tabular-nums`}>{b.single}</td>
                      <td className={`${td} text-right tabular-nums`}>{b.sub + b.projected}</td>
                      <td className={`${td} text-right text-base font-semibold tabular-nums`}>{b.grandTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {extras.length ? (
              <div className="border-t border-line/70 px-5 py-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Aukavörur úr netverslun</div>
                <ul className="space-y-1 text-[15px]">{extras.map((e) => <li key={e.name} className="flex justify-between"><span>{e.name}</span><span className="font-semibold tabular-nums">{e.qty}</span></li>)}</ul>
              </div>
            ) : null}
          </Card>

          <Card
            title={<span className="inline-flex items-center gap-2">Innkaupaáætlun <HelpTip>Gróf áætlun: þyngd hvers kassa (skráð undir Vörur, t.d. &quot;2,5 kg&quot;) er skipt jafnt á ávextina í honum. Delúx kassi inniheldur alla ávextina, aðrir kassar aðeins þá sem eru ekki merktir Delúx.</HelpTip></span>}
            description="Hve mikið þarf af hverjum ávexti."
            padded={false}
          >
            {fruitRows.length ? (
              <table className="w-full text-[14.5px]">
                <thead><tr><th className={th}>Ávöxtur</th><th className={`${th} text-right`}>Í kössum</th><th className={`${th} text-right`}>U.þ.b. kg</th></tr></thead>
                <tbody>
                  {fruitRows.map((r) => (
                    <tr key={r.fruit.id} className="border-t border-line/70">
                      <td className={td}><span className="inline-flex items-center gap-2"><FruitArt kind={r.fruit.illustration || "other"} className="h-6 w-6" /> {r.fruit.name} {r.deluxeOnly ? <Badge tone="gold">Delúx</Badge> : null}</span></td>
                      <td className={`${td} text-right tabular-nums`}>{num(r.boxesWith)}</td>
                      <td className={`${td} text-right tabular-nums`}>{r.kg ? num(r.kg) : "?"}{r.unknownKg ? <span className="text-orange-600">*</span> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-5 py-6 text-sm text-muted">Veldu ávexti til að sjá áætlun.</p>
            )}
            {fruitRows.some((r) => r.unknownKg) ? <p className="border-t border-line/70 px-5 py-3 text-xs text-muted">* Þyngd vantar á einhvern kassa (t.d. Delúx). Skráðu þyngd í reitinn &quot;Þyngd&quot; undir Vörur til að fá nákvæmari tölu.</p> : null}
          </Card>

          <Card title="Upplýsingar um sendinguna">
            <form action={updateDelivery} className="space-y-4">
              <H />
              <Field label="Sendingardagur"><Input type="date" name="date" required defaultValue={dateInput(delivery.date)} /></Field>
              <Field label="Pöntunarfrestur"><Input type="date" name="cutoffDate" defaultValue={dateInput(delivery.cutoffDate)} /></Field>
              <Field label="Heiti (valfrjálst)"><Input name="title" defaultValue={delivery.title} /></Field>
              <Field label="Minnispunktar" hint="Aðeins fyrir starfsfólk."><Textarea name="note" defaultValue={delivery.note} rows={3} /></Field>
              <SubmitButton variant="dark">Vista</SubmitButton>
            </form>
            <form action={deleteDelivery} className="mt-5 border-t border-line pt-4">
              <H />
              <SubmitButton variant="ghost" size="sm" confirm="Eyða þessari sendingu? Það er aðeins hægt ef engar pantanir eru tengdar henni.">
                <Icon name="trash" className="h-4 w-4" /> Eyða sendingu
              </SubmitButton>
            </form>
          </Card>

          <p className="px-1 text-sm text-muted">
            Söluverðmæti sendingar: <strong className="text-ink">{kr(orders.reduce((s, o) => s + o.total, 0))}</strong>
          </p>
        </div>
      </div>
    </>
  );
}
