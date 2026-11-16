import type { ReactNode } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { envOverride, getSetting, maskSecret, type SettingKey } from "@/lib/settings";
import { dateTime, timeAgo } from "@/lib/format";
import { wooConfig } from "@/lib/integrations/woocommerce";
import { pikkoloConfig } from "@/lib/integrations/pikkolo";
import { posthogConfig } from "@/lib/integrations/posthog";
import { PageHeader, Explainer, HelpTip } from "@/components/admin/ui";
import { SubmitButton, CopyButton } from "@/components/admin/forms";
import { Field, Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { SECTIONS, type FieldDef } from "./fields";
import { clearSecret, importWoo, saveIntegration, testPikkolo, testPostHog, testSmtp, testWoo } from "./actions";
import { TestButton } from "./TestButton";

export const metadata = { title: "Tengingar" };

type Status = { label: string; tone: "green" | "lemon" | "orange" | "muted" | "pink" };

async function SettingField({ def }: { def: FieldDef }) {
  const env = envOverride(def.key);
  const value = await getSetting(def.key);
  const label = <span className="inline-flex items-center gap-2">{def.label}{env ? <Badge tone="muted">Stillt í .env</Badge> : null}</span>;
  if (def.kind === "checkbox") {
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-cream-50 p-3">
        <input type="checkbox" name={def.key} defaultChecked={Boolean(value)} disabled={!!env} className="mt-0.5 h-5 w-5 accent-[#6A2833]" />
        <span><span className="block text-[15px] font-semibold">{def.label}</span>{def.hint ? <span className="block text-xs text-muted">{def.hint}</span> : null}</span>
      </label>
    );
  }
  if (def.kind === "select") {
    return (
      <Field label={label} hint={def.hint}>
        <Select name={def.key} defaultValue={String(value)} disabled={!!env}>
          {def.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
    );
  }
  if (def.kind === "secret") {
    const has = String(value || "");
    return (
      <Field
        label={label}
        hint={env ? "Lykillinn er stilltur í .env skránni á netþjóninum." : has ? `Vistaður lykill: ${maskSecret(has)}. Skildu reitinn eftir auðan til að halda honum.` : def.hint}
      >
        <Input name={def.key} type="password" autoComplete="off" placeholder={has ? "••••••••  (óbreytt)" : def.placeholder} disabled={!!env} />
      </Field>
    );
  }
  return (
    <Field label={label} hint={def.hint}>
      <Input name={def.key} type={def.kind === "number" ? "number" : "text"} defaultValue={String(value ?? "")} placeholder={def.placeholder} disabled={!!env} />
    </Field>
  );
}

function SectionForm({ section, children }: { section: string; children?: ReactNode }) {
  return (
    <form action={saveIntegration} className="space-y-4">
      <input type="hidden" name="section" value={section} />
      {SECTIONS[section].map((d) => <SettingField key={d.key} def={d} />)}
      {children}
      <SubmitButton variant="dark" size="sm"><Icon name="check" className="h-4 w-4" /> Vista</SubmitButton>
    </form>
  );
}

async function SecretClearers({ keys }: { keys: SettingKey[] }) {
  const items: { key: SettingKey; label: string }[] = [];
  for (const k of keys) {
    if (envOverride(k)) continue;
    if (String((await getSetting(k)) || "")) items.push({ key: k, label: SECTIONS[k.split(".")[0]]?.find((d) => d.key === k)?.label ?? k });
  }
  if (!items.length) return null;
  return (
    <details className="text-xs text-muted">
      <summary className="cursor-pointer">Fjarlægja vistaðan lykil</summary>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((i) => (
          <form key={i.key} action={clearSecret}>
            <input type="hidden" name="key" value={i.key} />
            <SubmitButton variant="ghost" size="sm" confirm={`Fjarlægja "${i.label}"? Tengingin hættir að virka þar til nýr lykill er settur inn.`}>Fjarlægja {i.label}</SubmitButton>
          </form>
        ))}
      </div>
    </details>
  );
}

function IntegrationCard({ id, title, logo, status, intro, children, aside }: { id: string; title: string; logo: ReactNode; status: Status; intro: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-line bg-white">
      <header className="flex flex-wrap items-center gap-3 border-b border-line/70 px-5 py-4">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-cream text-burgundy">{logo}</span>
        <h2 className="flex-1 font-display text-xl text-burgundy">{title}</h2>
        <Badge tone={status.tone} className="text-[13px]">{status.label}</Badge>
      </header>
      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3 text-[15px] text-ink/90">{intro}{aside}</div>
        <div className="space-y-4">{children}</div>
      </div>
    </section>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-1.5 text-sm">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-burgundy text-[11px] font-bold text-cream">{i + 1}</span><span>{s}</span></li>
      ))}
    </ol>
  );
}

export default async function IntegrationsPage() {
  await requireAdmin();
  const [woo, pik, ph, smtpHost, payMode, lastSync, logs, wooCounts] = await Promise.all([
    wooConfig(),
    pikkoloConfig(),
    posthogConfig(),
    getSetting("smtp.host"),
    getSetting("payment.mode"),
    getSetting("woo.lastSync"),
    db.activityLog.findMany({ where: { kind: "integration" }, orderBy: { createdAt: "desc" }, take: 12 }),
    Promise.all([db.product.count({ where: { wooId: { not: null } } }), db.order.count({ where: { source: "WOO" } }), db.customer.count({ where: { wooId: { not: null } } })]),
  ]);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const webhookUrl = `${site}/api/webhooks/woocommerce`;

  const statuses: Record<string, Status> = {
    woo: woo.configured ? { label: lastSync ? "Tengt" : "Lyklar skráðir", tone: "green" } : { label: "Ekki tengt", tone: "muted" },
    pikkolo: pik.canSubmit ? { label: pik.environment === "production" ? "Tengt (raunverulegt)" : "Tengt (prófun)", tone: pik.environment === "production" ? "green" : "lemon" } : pik.canSearch ? { label: "Stöðvaleit virkar, vantar API lykil", tone: "lemon" } : { label: "Ekki tengt", tone: "muted" },
    repeat: { label: "Bíður eftir API-skjölun", tone: "orange" },
    samskip: { label: "Sótt um aðgang, bíður", tone: "orange" },
    posthog: ph.canQuery ? { label: "Tengt", tone: "green" } : ph.canCapture ? { label: "Safnar gögnum, vantar lestraraðgang", tone: "lemon" } : { label: "Ekki tengt", tone: "muted" },
    smtp: smtpHost ? { label: "Tengt", tone: "green" } : { label: "Ekki tengt (póstar vistaðir)", tone: "muted" },
    payment: payMode === "live" ? { label: "Raunverulegar greiðslur", tone: "green" } : { label: "Prófunarhamur", tone: "lemon" },
  };

  const overview = [
    { id: "woo", name: "WooCommerce" }, { id: "pikkolo", name: "Pikkoló" }, { id: "repeat", name: "Repeat" }, { id: "samskip", name: "Samskip" },
    { id: "posthog", name: "PostHog" }, { id: "smtp", name: "Tölvupóstur" }, { id: "payment", name: "Greiðslur" },
  ];

  return (
    <>
      <PageHeader title="Tengingar" description="Hér tengir þú síðuna við kerfin sem Fincafresh notar, svo þú þurfir ekki að fara inn á hvert og eitt." />
      <Explainer>
        <p>Hvert kerfi fær sinn kassa. Græn merking þýðir að tengingin er komin. Í hverjum kassa stendur hvar lyklarnir finnast og hvað tengingin gerir.</p>
        <p><strong>Lyklar eru geymdir dulkóðaðir</strong> og sjást aldrei aftur í heild sinni. Ef þú skilur lykilreit eftir auðan og vistar, helst gamli lykillinn.</p>
        <p>Notaðu <strong>Prófa tengingu</strong> til að ganga úr skugga um að allt virki.</p>
      </Explainer>

      <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7" aria-label="Yfirlit tenginga">
        {overview.map((o) => (
          <a key={o.id} href={`#${o.id}`} className="rounded-xl border border-line bg-white px-3 py-2.5 hover:shadow-soft">
            <div className="text-sm font-semibold text-ink">{o.name}</div>
            <Badge tone={statuses[o.id].tone} className="mt-1">{statuses[o.id].label.split(",")[0]}</Badge>
          </a>
        ))}
      </nav>

      <div className="space-y-6">
        {/* ── WooCommerce ── */}
        <IntegrationCard
          id="woo"
          title="WooCommerce"
          logo={<Icon name="tag" className="h-6 w-6" />}
          status={statuses.woo}
          intro={
            <>
              <p>Gamla vefverslunin. Héðan getur þú <strong>sótt allar vörur, viðskiptavini og pantanir</strong> úr WooCommerce svo sagan fylgi með, og sent verð og birgðir til baka.</p>
              <p className="font-semibold text-burgundy">Svona finnur þú lyklana:</p>
              <Steps items={[
                "Skráðu þig inn í WordPress á gamla vefnum.",
                <>Farðu í <em>WooCommerce → Settings → Advanced → REST API</em>.</>,
                <>Smelltu á <em>Add key</em>, gefðu honum nafn (t.d. „Stjórnborð“) og veldu <em>Read/Write</em>.</>,
                "Afritaðu Consumer key og Consumer secret hingað og vistaðu.",
              ]} />
              <p className="text-sm text-muted">Heimild: <a className="underline" href="https://woocommerce.github.io/woocommerce-rest-api-docs/" target="_blank" rel="noreferrer">WooCommerce REST API skjölun</a></p>
            </>
          }
        >
          <SectionForm section="woo" />
          <SecretClearers keys={["woo.consumerKey", "woo.consumerSecret", "woo.webhookSecret"]} />
          {woo.configured ? (
            <div className="space-y-4 rounded-xl border border-line bg-cream-50 p-4">
              <TestButton action={testWoo} label="Prófa tengingu" />
              <div>
                <div className="mb-1 flex items-center gap-2 font-semibold">Sækja gögn úr WooCommerce <HelpTip>Óhætt að keyra oft. Færslur sem eru þegar til eru uppfærðar, engu er tvítekið.</HelpTip></div>
                <p className="mb-2 text-xs text-muted">
                  {lastSync ? `Síðast sótt ${timeAgo(lastSync)}. ` : "Aldrei sótt. "}
                  Núna í kerfinu: {wooCounts[0]} vörur, {wooCounts[2]} viðskiptavinir og {wooCounts[1]} pantanir úr WooCommerce.
                </p>
                <TestButton action={importWoo} label="Sækja" pendingLabel="Sæki gögn… (getur tekið smá stund)" variant="primary">
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Hvað?</span>
                    <select name="what" defaultValue="all" className="rounded-xl border border-line bg-white px-3 py-2 text-sm">
                      <option value="all">Allt (mælt með)</option>
                      <option value="products">Aðeins vörur og flokka</option>
                      <option value="customers">Aðeins viðskiptavini</option>
                      <option value="orders">Aðeins pantanir</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold">Pantanir frá</span>
                    <select name="range" defaultValue="365" className="rounded-xl border border-line bg-white px-3 py-2 text-sm">
                      <option value="90">Síðustu 90 dögum</option>
                      <option value="365">Síðasta ári</option>
                      <option value="all">Upphafi</option>
                    </select>
                  </label>
                </TestButton>
              </div>
              <div>
                <div className="mb-1 font-semibold">Sjálfvirk uppfærsla (webhook)</div>
                <p className="mb-2 text-xs text-muted">Til að nýjar pantanir í WooCommerce birtist hér strax: farðu í <em>WooCommerce → Settings → Advanced → Webhooks → Add webhook</em>, veldu Topic „Order created“ (og búðu til annað fyrir „Order updated“), límdu slóðina hér fyrir neðan í <em>Delivery URL</em> og sama leyniorð í <em>Secret</em> og í reitinn „Leyniorð fyrir webhooks“ hér til hliðar.</p>
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white px-3 py-2 font-mono text-xs">
                  <span className="break-all">{webhookUrl}</span>
                  <CopyButton value={webhookUrl} />
                </div>
                {site.includes("localhost") ? <p className="mt-1 text-xs text-orange-600">Athugið: síðan keyrir á localhost. Webhook virkar ekki fyrr en síðan er komin á netið með réttri slóð (NEXT_PUBLIC_SITE_URL).</p> : null}
              </div>
            </div>
          ) : null}
        </IntegrationCard>

        {/* ── Pikkoló ── */}
        <IntegrationCard
          id="pikkolo"
          title="Pikkoló"
          logo={<Icon name="thermometer" className="h-6 w-6" />}
          status={statuses.pikkolo}
          intro={
            <>
              <p>Kældar afhendingarstöðvar. Viðskiptavinir velja stöð í greiðsluferlinu og pantanir eru sendar til Pikkoló héðan úr stjórnborðinu (eða sjálfkrafa).</p>
              <p className="font-semibold text-burgundy">Svona virkar þetta:</p>
              <Steps items={[
                <>Settu inn <strong>Vendor ID</strong> og <strong>API lykil</strong> af skjölunarsíðunni frá Pikkoló.</>,
                <>Byrjaðu í <strong>prófun (staging)</strong> og prófaðu að panta. Engar raunverulegar pantanir verða til.</>,
                <>Þegar allt virkar: veldu <strong>raunverulegt (production)</strong> og vistaðu.</>,
              ]} />
              <div className="rounded-xl border border-orange/40 bg-orange/5 p-3 text-sm">
                <strong className="text-orange-600">Athugið:</strong> Í raunverulegu umhverfi verða til alvöru pantanir í Pikkoló stöðvunum. Notaðu prófun á meðan verið er að prófa síðuna.
              </div>
              <p className="text-sm text-muted">Núverandi umhverfi: <strong>{pik.environment === "production" ? "Raunverulegt" : "Prófun"}</strong> ({pik.baseUrl.replace("https://", "").split("/")[0]}).</p>
            </>
          }
        >
          <SectionForm section="pikkolo" />
          <SecretClearers keys={["pikkolo.apiKey"]} />
          <div className="rounded-xl border border-line bg-cream-50 p-4">
            <div className="mb-2 font-semibold">Prófa stöðvaleit</div>
            <TestButton action={testPikkolo} label="Prófa tengingu">
              <label className="text-sm"><span className="mb-1 block font-semibold">Póstnúmer</span><input name="postalCode" defaultValue="101" className="w-24 rounded-xl border border-line bg-white px-3 py-2" /></label>
              <label className="text-sm"><span className="mb-1 block font-semibold">Bær</span><input name="city" defaultValue="Reykjavík" className="w-36 rounded-xl border border-line bg-white px-3 py-2" /></label>
            </TestButton>
          </div>
        </IntegrationCard>

        {/* ── Repeat ── */}
        <IntegrationCard
          id="repeat"
          title="Repeat"
          logo={<Icon name="repeat" className="h-6 w-6" />}
          status={statuses.repeat}
          intro={
            <>
              <p>Repeat sér um endurteknar greiðslur fyrir áskriftir í dag.</p>
              <p><strong>Staðan:</strong> Repeat birtir ekki opinbera API-skjölun á vefnum sínum. Til að tengja kerfin sjálfvirkt þarf að fá skjölun (og lykla) beint frá Repeat. Þangað til er ekkert sent til Repeat á ágiskun.</p>
              <p className="font-semibold text-burgundy">Þangað til:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Áskriftum er stjórnað hér í stjórnborðinu (hlé, sleppa, uppsögn).</li>
                <li>Hægt er að flytja inn núverandi áskrifendur úr Repeat með CSV skrá undir <Link href="/admin/askriftir" className="font-semibold underline">Áskriftir</Link>, og skrá Repeat-auðkenni á hverja áskrift.</li>
                <li>Áskriftarpantanir eru merktar „Áskrift (Repeat)“ og hægt að merkja þær greiddar.</li>
              </ul>
              <p className="text-sm text-muted">Sendu Repeat fyrirspurn um API-aðgang og skjölun. Þegar hún berst er tengingin útfærð og lyklarnir settir hér.</p>
            </>
          }
        >
          <SectionForm section="repeat" />
          <SecretClearers keys={["repeat.apiKey"]} />
        </IntegrationCard>

        {/* ── Samskip ── */}
        <IntegrationCard
          id="samskip"
          title="Samskip"
          logo={<Icon name="truck" className="h-6 w-6" />}
          status={statuses.samskip}
          intro={
            <>
              <p>Samskip sér um heimsendingar. Búið er að sækja um API-aðgang.</p>
              <p className="font-semibold text-burgundy">Þangað til:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Undir <Link href="/admin/sendingar" className="font-semibold underline">Sendingar</Link> getur þú sótt <strong>sendingarlista</strong> (Excel/CSV) með nöfnum og heimilisföngum allra heimsendinga til að senda Samskip.</li>
                <li>Hægt er að skrá rakningarnúmer á hverja pöntun.</li>
              </ul>
              <p className="text-sm text-muted">Þegar aðgangur og skjölun berast frá Samskip eru lyklarnir settir hér og tengingin útfærð.</p>
            </>
          }
        >
          <SectionForm section="samskip" />
          <SecretClearers keys={["samskip.apiKey"]} />
        </IntegrationCard>

        {/* ── PostHog ── */}
        <IntegrationCard
          id="posthog"
          title="PostHog"
          logo={<Icon name="chart" className="h-6 w-6" />}
          status={statuses.posthog}
          intro={
            <>
              <p>PostHog skráir hvernig fólk notar síðuna: hvaða síður það skoðar, hvar það hættir við og hvað það kaupir. Gögnin birtast undir <Link href="/admin/greining" className="font-semibold underline">Greining</Link>.</p>
              <p className="font-semibold text-burgundy">Svona finnur þú lyklana í PostHog:</p>
              <Steps items={[
                <><em>Project settings</em>: afritaðu <strong>Project API key</strong> (byrjar á phc_) og <strong>Project ID</strong>.</>,
                <><em>Account settings → Personal API keys</em>: búðu til lykil með lesaðgangi að fyrirspurnum (Query) og afritaðu hann.</>,
                "Veldu sama svæði og PostHog aðgangurinn er á (Evrópa eða Bandaríkin).",
              ]} />
              <p className="text-sm text-muted">Síðan spyr gesti um leyfi fyrir vafrakökum áður en PostHog fer að skrá. Heimildir: <a className="underline" href="https://posthog.com/docs/api/query" target="_blank" rel="noreferrer">PostHog Query API</a>.</p>
            </>
          }
        >
          <SectionForm section="posthog" />
          <SecretClearers keys={["posthog.personalApiKey"]} />
          <div className="rounded-xl border border-line bg-cream-50 p-4"><TestButton action={testPostHog} label="Prófa tengingu" /></div>
        </IntegrationCard>

        {/* ── Tölvupóstur ── */}
        <IntegrationCard
          id="smtp"
          title="Tölvupóstur"
          logo={<Icon name="mail" className="h-6 w-6" />}
          status={statuses.smtp}
          intro={
            <>
              <p>Síðan sendir pöntunarstaðfestingar og tilboð. Til þess þarf aðgang að tölvupóstþjóni (SMTP), t.d. frá þeim sem hýsir fincafresh.is netföngin.</p>
              <p>Á meðan tölvupóstur er ekki tengdur eru allir póstar <strong>vistaðir</strong> undir <Link href="/admin/fyrirspurnir?flipi=postur" className="font-semibold underline">Fyrirspurnir → Útsendur póstur</Link> svo ekkert týnist.</p>
              <p className="text-sm text-muted">Spurðu þann sem hýsir tölvupóstinn um „SMTP stillingar“. Yfirleitt er port 587.</p>
            </>
          }
        >
          <SectionForm section="smtp" />
          <SecretClearers keys={["smtp.pass"]} />
          <div className="rounded-xl border border-line bg-cream-50 p-4"><TestButton action={testSmtp} label="Senda prufupóst á mig" /></div>
        </IntegrationCard>

        {/* ── Greiðslugátt ── */}
        <IntegrationCard
          id="payment"
          title="Greiðslugátt"
          logo={<Icon name="lock" className="h-6 w-6" />}
          status={statuses.payment}
          intro={
            <>
              <p>Í <strong>prófunarham</strong> eru allar greiðslur samþykktar sjálfkrafa svo hægt sé að prófa allt kaupferlið án þess að nota kort.</p>
              <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm">
                <strong className="text-danger">Mikilvægt:</strong> „Raunverulegar greiðslur“ virka ekki fyrr en forritari hefur tengt greiðslugátt (t.d. þá sem WooCommerce notar í dag). Ef þú velur þann ham áður getur enginn klárað pöntun.
              </div>
            </>
          }
        >
          <SectionForm section="payment" />
        </IntegrationCard>

        <section className="rounded-2xl border border-line bg-white">
          <header className="border-b border-line/70 px-5 py-4"><h2 className="font-display text-lg text-burgundy">Síðustu atburðir í tengingum</h2></header>
          {logs.length ? (
            <ul className="divide-y divide-line/70">
              {logs.map((l) => (
                <li key={l.id} className="flex items-start gap-3 px-5 py-2.5 text-sm">
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", l.level === "error" ? "bg-danger" : l.level === "warning" ? "bg-orange" : l.level === "success" ? "bg-leaf" : "bg-muted")} />
                  <span className="flex-1">{l.message}</span>
                  <span className="whitespace-nowrap text-xs text-muted">{dateTime(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-4 text-sm text-muted">Ekkert ennþá.</p>}
        </section>
      </div>
    </>
  );
}
