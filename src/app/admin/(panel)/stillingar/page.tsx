import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { dateTime, kr } from "@/lib/format";
import { PageHeader, Card, Explainer, HelpTip } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/forms";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FrequencyEditor } from "./FrequencyEditor";
import { countDemo } from "./demo";
import { addAdmin, changePassword, deleteDemoData, removeAdmin, saveShipping, saveSubscription, saveUpsell } from "./actions";

export const metadata = { title: "Stillingar" };

export default async function SettingsPage() {
  const me = await requireAdmin();
  const s = await getSettings(["shipping.methods", "shipping.pricesConfirmed", "subscription.defaultDiscountPct", "subscription.frequencies", "upsell.enabled", "upsell.title", "upsell.body"]);
  const [admins, demo, demoFlag] = await Promise.all([
    db.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
    countDemo(db),
    db.setting.findUnique({ where: { key: "demo.seeded" } }),
  ]);
  const hasDemo = demo.customers + demo.orders + demo.events + demo.code > 0;

  return (
    <>
      <PageHeader title="Stillingar" description="Sendingarverð, áskriftir, áskriftarglugginn og aðgangur að stjórnborðinu." />
      <Explainer>
        <p>Hér stillir þú hvernig verslunin virkar. Hver kassi hefur sinn <strong>Vista</strong> hnapp.</p>
        <p>Tengingar við önnur kerfi (WooCommerce, Pikkoló o.fl.) eru undir <a href="/admin/tengingar" className="font-semibold underline">Tengingar</a>.</p>
      </Explainer>

      <nav className="mb-6 flex flex-wrap gap-2 text-sm">
        {[["sending", "Afhending og sendingarverð"], ["askrift", "Áskriftir"], ["upsala", "Áskriftarglugginn"], ["adgangur", "Aðgangur"], ["prufugogn", "Prufugögn"]].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-line bg-white px-3.5 py-1.5 font-semibold text-burgundy hover:bg-cream">{label}</a>
        ))}
      </nav>

      <div className="space-y-6">
        <div id="sending" className="scroll-mt-6">
          <Card title="Afhending og sendingarverð" description="Hvaða afhendingarmátar eru í boði í greiðsluferlinu og hvað þeir kosta.">
            {!s["shipping.pricesConfirmed"] ? (
              <p className="mb-4 flex items-start gap-2 rounded-xl border border-orange/40 bg-orange/5 px-3 py-2 text-sm">
                <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                <span>Sendingarverðin hafa ekki verið staðfest. Þau voru sett á 0 kr. við uppsetningu. Settu inn rétt verð og hakaðu við „Ég hef staðfest sendingarverð“.</span>
              </p>
            ) : null}
            <form action={saveShipping} className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                {s["shipping.methods"].map((m) => (
                  <fieldset key={m.id} className="space-y-3 rounded-xl border border-line bg-cream-50 p-4">
                    <label className="flex items-center gap-2 font-semibold">
                      <input type="checkbox" name={`${m.id}.enabled`} defaultChecked={m.enabled} className="h-5 w-5 accent-[#6A2833]" />
                      Í boði
                      <Badge tone="muted" className="ml-auto">{m.id === "PIKKOLO" ? "Pikkoló" : m.id === "HOME" ? "Heimsending" : "Sótt"}</Badge>
                    </label>
                    <Field label="Heiti"><Input name={`${m.id}.label`} defaultValue={m.label} /></Field>
                    <Field label="Lýsing"><Textarea name={`${m.id}.description`} defaultValue={m.description} rows={2} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Verð (kr.)"><Input name={`${m.id}.price`} inputMode="numeric" defaultValue={m.price} /></Field>
                      <Field label={<span className="inline-flex items-center gap-1">Frítt yfir <HelpTip>Ef karfan er dýrari en þetta kostar sendingin ekkert. Skildu eftir autt ef það á aldrei að vera frítt.</HelpTip></span>}>
                        <Input name={`${m.id}.freeOver`} inputMode="numeric" defaultValue={m.freeOver ?? ""} placeholder="Aldrei" />
                      </Field>
                    </div>
                    <p className="text-xs text-muted">Núna: {m.price ? kr(m.price) : "frítt"}{m.freeOver ? `, frítt yfir ${kr(m.freeOver)}` : ""}</p>
                  </fieldset>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[15px] font-semibold">
                <input type="checkbox" name="pricesConfirmed" defaultChecked={s["shipping.pricesConfirmed"]} className="h-5 w-5 accent-[#6A2833]" /> Ég hef staðfest sendingarverð
              </label>
              <SubmitButton variant="primary">Vista afhendingu</SubmitButton>
            </form>
          </Card>
        </div>

        <div id="askrift" className="scroll-mt-6">
          <Card title="Áskriftir" description="Sjálfgefinn afsláttur og hversu oft áskrifendur geta fengið kassa.">
            <form action={saveSubscription} className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
              <Field label="Sjálfgefinn áskriftarafsláttur (%)" hint="Gildir fyrir kassa sem hafa ekki sinn eigin afslátt (stillt á hverjum kassa undir Vörur).">
                <Input name="defaultDiscountPct" inputMode="numeric" defaultValue={s["subscription.defaultDiscountPct"]} />
              </Field>
              <div>
                <FrequencyEditor initial={s["subscription.frequencies"]} />
                <p className="mt-2 text-xs text-muted">„Í annarri hverri sendingu“ þýðir að áskrifandinn fær kassa í annarri hverri sendingu sem þú skráir undir Sendingar.</p>
              </div>
              <div className="lg:col-span-2"><SubmitButton variant="primary">Vista áskriftir</SubmitButton></div>
            </form>
          </Card>
        </div>

        <div id="upsala" className="scroll-mt-6">
          <Card title="Áskriftarglugginn" description="Glugginn sem birtist þegar viðskiptavinur velur stakan kassa og býður honum áskrift í staðinn. Upphæðin sem sparast reiknast sjálfkrafa.">
            <form action={saveUpsell} className="space-y-4">
              <label className="flex items-center gap-2 text-[15px] font-semibold">
                <input type="checkbox" name="enabled" defaultChecked={s["upsell.enabled"]} className="h-5 w-5 accent-[#6A2833]" /> Sýna gluggann
              </label>
              <Field label="Fyrirsögn"><Input name="title" defaultValue={s["upsell.title"]} /></Field>
              <Field label="Texti" hint="Stutt og jákvætt: hvað fá áskrifendur sem aðrir fá ekki?"><Textarea name="body" defaultValue={s["upsell.body"]} rows={3} /></Field>
              <p className="text-sm text-muted">Sjáðu hversu vel glugginn virkar undir <a href="/admin/greining" className="font-semibold underline">Greining</a>.</p>
              <SubmitButton variant="primary">Vista glugga</SubmitButton>
            </form>
          </Card>
        </div>

        <div id="adgangur" className="scroll-mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Stjórnendur" description="Þau sem geta skráð sig inn í stjórnborðið." padded={false}>
            <ul className="divide-y divide-line/70">
              {admins.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span>
                    <span className="block font-semibold">{a.name}{a.id === me.id ? <Badge tone="pink" className="ml-2">Þú</Badge> : null}</span>
                    <span className="block text-xs text-muted">{a.email} · {a.lastLoginAt ? `síðast inni ${dateTime(a.lastLoginAt)}` : "hefur ekki skráð sig inn"}</span>
                  </span>
                  {a.id !== me.id ? (
                    <form action={removeAdmin}>
                      <input type="hidden" name="id" value={a.id} />
                      <SubmitButton variant="ghost" size="sm" confirm={`Fjarlægja aðgang ${a.email}?`}>Fjarlægja</SubmitButton>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
            <form action={addAdmin} className="space-y-3 border-t border-line/70 p-5">
              <div className="font-semibold">Bæta við stjórnanda</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="name" placeholder="Nafn" />
                <Input name="email" type="email" placeholder="Netfang" required />
              </div>
              <Input name="password" type="password" placeholder="Lykilorð (a.m.k. 8 stafir)" autoComplete="new-password" required />
              <SubmitButton variant="dark" size="sm"><Icon name="plus" className="h-4 w-4" /> Bæta við</SubmitButton>
            </form>
          </Card>
          <Card title="Breyta lykilorðinu mínu">
            <form action={changePassword} className="space-y-3">
              <Field label="Núverandi lykilorð"><Input name="current" type="password" autoComplete="current-password" required /></Field>
              <Field label="Nýtt lykilorð" hint="A.m.k. 8 stafir."><Input name="password" type="password" autoComplete="new-password" required /></Field>
              <Field label="Nýtt lykilorð aftur"><Input name="confirm" type="password" autoComplete="new-password" required /></Field>
              <SubmitButton variant="dark">Breyta lykilorði</SubmitButton>
            </form>
          </Card>
        </div>

        <div id="prufugogn" className="scroll-mt-6">
          <Card title="Prufugögn" description="Við uppsetningu voru sett inn prufugögn (tilbúnir viðskiptavinir, pantanir og atburðir) svo hægt væri að prófa stjórnborðið.">
            {hasDemo ? (
              <div className="space-y-4">
                <ul className="grid gap-2 text-sm sm:grid-cols-4">
                  <li className="rounded-xl bg-cream-50 p-3"><span className="block font-display text-2xl text-burgundy">{demo.customers}</span>prufuviðskiptavinir</li>
                  <li className="rounded-xl bg-cream-50 p-3"><span className="block font-display text-2xl text-burgundy">{demo.orders}</span>prufupantanir</li>
                  <li className="rounded-xl bg-cream-50 p-3"><span className="block font-display text-2xl text-burgundy">{demo.subs}</span>prufuáskriftir</li>
                  <li className="rounded-xl bg-cream-50 p-3"><span className="block font-display text-2xl text-burgundy">{demo.events}</span>prufuatburðir</li>
                </ul>
                <p className="text-sm text-muted">Aðeins gögn merkt sem prufugögn eru fjarlægð (netföng sem enda á @prufa.fincafresh.is, pantanir merktar PRUFUGÖGN, kóðinn PRUFA10 og tilboð eða póstar til prufunetfanga). Vörur, ávextir, sendingar, stillingar og raunverulegar pantanir haldast.</p>
                <form action={deleteDemoData}>
                  <SubmitButton variant="danger" confirm="Eyða öllum prufugögnum? Þetta er ekki hægt að afturkalla. Raunveruleg gögn haldast.">
                    <Icon name="trash" className="h-4 w-4" /> Eyða prufugögnum
                  </SubmitButton>
                </form>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-[15px] text-leaf"><Icon name="check" className="h-5 w-5" /> Engin prufugögn eru eftir.{demoFlag?.value === "false" ? " Þeim var eytt." : ""}</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
