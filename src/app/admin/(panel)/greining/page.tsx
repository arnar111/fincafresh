import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { kr, num, dateShort } from "@/lib/format";
import { PageHeader, Card, StatCard, Explainer, EmptyState, HelpTip, th, td, tableClass, tableWrap } from "@/components/admin/ui";
import { HBar } from "@/components/admin/charts";
import { SubmitButton } from "@/components/admin/forms";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { alsoBought, churn, eventCounts, funnel, mostViewed, periodStart, repeatSingleBuyers, subscriptionShare, topProducts, type Period } from "./data";
import { pinRecommendation, sendOfferToAll, sendSubscriptionOffer } from "./actions";
import { PostHogPanel } from "./PostHogPanel";

export const metadata = { title: "Greining" };

const PERIODS: Period[] = [7, 30, 90, 365];

function pct(a: number, b: number) {
  return b ? Math.round((a / b) * 100) : 0;
}

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ dagar?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const days = (PERIODS.includes(Number(sp.dagar) as Period) ? Number(sp.dagar) : 30) as Period;
  const since = periodStart(days);

  const [steps, ev, share, ch, top, viewed, pairs, buyers, unreviewedFruits] = await Promise.all([
    funnel(since),
    eventCounts(since, ["upsell_shown", "upsell_accepted", "upsell_declined", "fruit_info_opened", "cart_converted_to_subscription", "subscription_cancel_prevented", "subscription_cancelled"]),
    subscriptionShare(since, days),
    churn(since),
    topProducts(since),
    mostViewed(since),
    alsoBought(),
    repeatSingleBuyers(),
    db.fruit.count({ where: { reviewed: false, active: true } }),
  ]);
  const upsellRate = pct(ev.upsell_accepted, ev.upsell_shown);
  const conv = pct(steps[3].sessions, steps[0].sessions);
  const maxStep = Math.max(1, steps[0].sessions);
  const totalSave = buyers.reduce((s, b) => s + b.wouldSave, 0);
  const notSent = buyers.filter((b) => !b.offerSentAt).length;

  // Tillögur á mannamáli, reiknaðar úr gögnunum
  const tips: { icon: string; tone: "good" | "warn" | "info"; text: React.ReactNode }[] = [];
  if (buyers.length) tips.push({ icon: "repeat", tone: "warn", text: <><strong>{buyers.length} viðskiptavinir</strong> hafa keypt stakan kassa tvisvar eða oftar án þess að vera í áskrift. Saman hefðu þau sparað <strong>{kr(totalSave)}</strong> Sendu þeim persónulegt tilboð hér fyrir neðan.</> });
  if (ev.upsell_shown >= 10) {
    tips.push(upsellRate >= 25
      ? { icon: "check", tone: "good", text: <>Áskriftarglugginn virkar vel: <strong>{upsellRate}%</strong> þeirra sem velja stakan kassa skipta yfir í áskrift.</> }
      : { icon: "info", tone: "warn", text: <>Aðeins <strong>{upsellRate}%</strong> skipta yfir í áskrift þegar glugginn birtist. Prófaðu að hækka áskriftarafsláttinn á kössunum eða breyta textanum í glugganum undir <Link className="underline" href="/admin/stillingar#upsala">Stillingar</Link>.</> });
  }
  const strong = pairs.rows.find((r) => r.confidence >= 30 && !r.pinned);
  if (strong) tips.push({ icon: "heart", tone: "info", text: <><strong>{strong.confidence}%</strong> þeirra sem keyptu <strong>{strong.fromName}</strong> keyptu líka <strong>{strong.toName}</strong>. Festu það sem meðmæli svo fleiri sjái það.</> });
  if (ch.reasons[0]) tips.push({ icon: "info", tone: "info", text: <>Algengasta ástæða uppsagnar: „{ch.reasons[0].reason}“ ({ch.reasons[0].count} sinnum).</> });
  if (ev.fruit_info_opened > 0) tips.push({ icon: "leaf", tone: "good", text: <>Fólk hefur opnað ávaxtaupplýsingar <strong>{num(ev.fruit_info_opened)} sinnum</strong> á tímabilinu.{unreviewedFruits ? <> {unreviewedFruits} ávextir eru enn með óyfirfarinn texta, <Link href="/admin/avextir" className="underline">yfirfara</Link>.</> : null}</> });
  if (share.single + share.sub > 0 && share.pct < 50) tips.push({ icon: "box", tone: "warn", text: <>{share.pct}% nýrra kassakaupa eru áskriftir. Afsláttarkóði sem gildir aðeins um áskriftir getur ýtt undir fleiri.</> });

  return (
    <>
      <PageHeader
        title="Greining"
        description="Hvernig fólk notar síðuna, hvað það kaupir saman og hvar tækifærin liggja til að fá fleiri í áskrift."
        actions={
          <div className="flex gap-1 rounded-full bg-white p-1 shadow-sm">
            {PERIODS.map((p) => (
              <Link key={p} href={`/admin/greining?dagar=${p}`} className={cn("rounded-full px-3.5 py-1.5 text-sm font-semibold", days === p ? "bg-burgundy text-cream" : "text-burgundy hover:bg-cream")}>
                {p === 365 ? "Ár" : `${p} dagar`}
              </Link>
            ))}
          </div>
        }
      />
      <Explainer>
        <p>Tölurnar hér koma úr pöntunum og úr skráningu síðunnar sjálfrar (t.d. þegar einhver skoðar vöru eða setur í körfu). Þær virka þótt PostHog sé ekki tengt.</p>
        <p><strong>Kaupferlið</strong> sýnir hversu margar heimsóknir komust á hvert stig. Ef margir detta út á milli tveggja stiga er þar tækifæri til úrbóta.</p>
        <p><strong>Keyptu líka</strong> er reiknað úr raunverulegum pöntunum. „Festa sem meðmæli“ lætur vöruna alltaf birtast fyrst á vörusíðunni og í körfunni.</p>
      </Explainer>

      {tips.length ? (
        <Card title={<span className="inline-flex items-center gap-2"><Icon name="sparkle" className="h-5 w-5 text-gold" /> Tillögur</span>} className="mb-5">
          <ul className="space-y-2.5">
            {tips.map((t, i) => (
              <li key={i} className={cn("flex gap-3 rounded-xl px-3 py-2.5 text-[15px]", t.tone === "good" && "bg-leaf/8", t.tone === "warn" && "bg-orange/8", t.tone === "info" && "bg-cream-50")}>
                <Icon name={t.icon} className={cn("mt-0.5 h-5 w-5 shrink-0", t.tone === "good" ? "text-leaf" : t.tone === "warn" ? "text-orange-600" : "text-burgundy")} />
                <span>{t.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kaupa eftir að hafa skoðað" value={`${conv}%`} hint={`${num(steps[3].sessions)} af ${num(steps[0].sessions)} heimsóknum`} icon="chart" />
        <StatCard label="Ný kassakaup í áskrift" value={`${share.pct}%`} hint={`${share.sub} í áskrift, ${share.single} stakir`} icon="repeat" tone="pink" />
        <StatCard label="Skiptu í áskrift í glugganum" value={`${upsellRate}%`} hint={`${ev.upsell_accepted} af ${ev.upsell_shown} sem sáu gluggann`} icon="gift" tone={upsellRate >= 25 ? "good" : "warn"} />
        <StatCard label="Virkar áskriftir" value={num(ch.active)} hint={`${ch.startedInPeriod} nýjar · ${ch.cancelledInPeriod} sagt upp á tímabilinu`} icon="users" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Kaupferlið" description="Fjöldi heimsókna sem komust á hvert stig (aðeins gestir sem samþykktu tölfræðivafrakökur).">
          <div className="space-y-4">
            {steps.map((s, i) => (
              <HBar key={s.name} label={`${i + 1}. ${s.label}`} value={s.sessions} max={maxStep} sub={i > 0 ? `${pct(s.sessions, steps[i - 1].sessions)}% af fyrra stigi` : undefined} color={i === 3 ? "#248A36" : "#6A2833"} />
            ))}
          </div>
        </Card>

        <Card title="Áskriftarglugginn" description="Glugginn sem birtist þegar einhver velur stakan kassa og býður áskrift í staðinn.">
          <div className="space-y-4">
            <HBar label="Sáu gluggann" value={ev.upsell_shown} max={Math.max(1, ev.upsell_shown)} />
            <HBar label="Skiptu í áskrift" value={ev.upsell_accepted} max={Math.max(1, ev.upsell_shown)} sub={`${upsellRate}%`} color="#248A36" />
            <HBar label="Héldu sig við stakan kassa" value={ev.upsell_declined} max={Math.max(1, ev.upsell_shown)} color="#F26A23" />
            <p className="text-sm text-muted">Auk þess skiptu <strong>{ev.cart_converted_to_subscription}</strong> yfir í áskrift í körfunni, og <strong>{ev.subscription_cancel_prevented}</strong> áskrifendur hættu við að segja upp þegar þeim var boðið hlé.</p>
          </div>
        </Card>

        <Card title="Hlutfall áskrifta í nýjum kassakaupum" description="Grænt: áskrift. Appelsínugult: stakur kassi. Sjálfvirkar áskriftarpantanir eru ekki taldar með.">
          {share.sub + share.single === 0 ? <EmptyState icon="box" title="Engin kassakaup á tímabilinu" /> : (
            <div className="space-y-2">
              {share.buckets.map((b) => {
                const t = b.sub + b.single;
                return (
                  <div key={b.label} className="flex items-center gap-3 text-sm">
                    <span className="w-14 shrink-0 tabular-nums text-muted">{b.label}</span>
                    <div className="flex h-5 flex-1 overflow-hidden rounded-full bg-cream">
                      {t ? <><div className="h-full bg-leaf" style={{ width: `${pct(b.sub, t)}%` }} title={`Áskrift: ${b.sub}`} /><div className="h-full bg-orange" style={{ width: `${pct(b.single, t)}%` }} title={`Stakir: ${b.single}`} /></> : null}
                    </div>
                    <span className="w-24 shrink-0 text-right tabular-nums text-muted">{t ? `${pct(b.sub, t)}% áskrift` : "engin"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Uppsagnir" description="Hvers vegna fólk hættir í áskrift.">
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-leaf/8 p-3"><div className="font-display text-2xl text-leaf">{ch.active}</div><div className="text-xs text-muted">Virkar</div></div>
            <div className="rounded-xl bg-lemon-100 p-3"><div className="font-display text-2xl text-burgundy">{ch.paused}</div><div className="text-xs text-muted">Í hléi</div></div>
            <div className="rounded-xl bg-cream p-3"><div className="font-display text-2xl text-muted">{ch.cancelledTotal}</div><div className="text-xs text-muted">Sagt upp alls</div></div>
          </div>
          {ch.reasons.length ? (
            <ul className="space-y-1.5 text-sm">
              {ch.reasons.slice(0, 6).map((r) => <li key={r.reason} className="flex justify-between gap-3"><span>„{r.reason}“</span><span className="tabular-nums text-muted">{r.count}</span></li>)}
            </ul>
          ) : <p className="text-sm text-muted">Engar ástæður skráðar ennþá. Þegar viðskiptavinur segir upp á Mínum síðum er hann spurður af hverju.</p>}
        </Card>

        <Card title="Söluhæstu vörurnar" description={`Síðustu ${days} daga, eftir veltu.`} padded={false}>
          {top.length ? (
            <div className={tableWrap}>
              <table className={tableClass.replace("min-w-[640px]", "")}>
                <thead><tr><th className={th}>Vara</th><th className={cn(th, "text-right")}>Fjöldi</th><th className={cn(th, "text-right")}>Velta</th></tr></thead>
                <tbody>{top.map((t) => <tr key={t.name}><td className={td}>{t.name}</td><td className={cn(td, "text-right tabular-nums")}>{t.qty}</td><td className={cn(td, "text-right tabular-nums")}>{kr(t.revenue)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <EmptyState icon="tag" title="Engin sala á tímabilinu" />}
        </Card>

        <Card title="Mest skoðuðu vörurnar" description="Hvaða vörur fólk opnar oftast.">
          {viewed.length ? (
            <div className="space-y-3">{viewed.map((v) => <HBar key={v.name} label={v.name} value={v.views} max={viewed[0].views} color="#425442" />)}</div>
          ) : <EmptyState icon="eye" title="Engar skoðanir skráðar" />}
        </Card>
      </div>

      <div id="keyptu-lika" className="mt-5 scroll-mt-6">
        <Card
          title={<span className="inline-flex items-center gap-2">Þeir sem keyptu þetta, keyptu líka <HelpTip>Reiknað úr {num(pairs.orders)} pöntunum. „Hlutfall“ segir hversu oft hin varan var í sömu pöntun. Dæmi: 55% þýðir að í rúmlega helmingi pantana með fyrri vörunni var seinni varan líka.</HelpTip></span>}
          description="Notaðu þetta til að velja hvað er mælt með á vörusíðum og í körfunni."
          padded={false}
        >
          {pairs.rows.length ? (
            <div className={tableWrap}>
              <table className={tableClass}>
                <thead><tr><th className={th}>Þeir sem keyptu</th><th className={th}>keyptu líka</th><th className={cn(th, "text-right")}>Hlutfall</th><th className={cn(th, "text-right")}>Pantanir saman</th><th className={th}><span className="sr-only">Aðgerð</span></th></tr></thead>
                <tbody>
                  {pairs.rows.map((r) => (
                    <tr key={`${r.fromId}-${r.toId}`}>
                      <td className={cn(td, "font-semibold")}>{r.fromName}</td>
                      <td className={td}>{r.toName}</td>
                      <td className={cn(td, "text-right")}>
                        <span className="inline-flex items-center gap-2">
                          <span className="hidden h-2 w-20 overflow-hidden rounded-full bg-cream sm:inline-block"><span className="block h-full bg-burgundy" style={{ width: `${r.confidence}%` }} /></span>
                          <span className="tabular-nums font-semibold">{r.confidence}%</span>
                        </span>
                      </td>
                      <td className={cn(td, "text-right tabular-nums text-muted")}>{r.together} af {r.base}</td>
                      <td className={cn(td, "text-right")}>
                        {r.pinned ? <Badge tone="green"><Icon name="check" className="h-3 w-3" /> Fest</Badge> : (
                          <form action={pinRecommendation}>
                            <input type="hidden" name="from" value={r.fromId} />
                            <input type="hidden" name="to" value={r.toId} />
                            <SubmitButton variant="light" size="sm">Festa sem meðmæli</SubmitButton>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState icon="heart" title="Ekki nóg af pöntunum ennþá">Þegar fleiri pantanir hafa borist (eða pantanir hafa verið sóttar úr WooCommerce) birtist hér hvað fólk kaupir saman.</EmptyState>}
        </Card>
      </div>

      <div id="tillogur" className="mt-5 scroll-mt-6">
        <Card
          title="Fáðu fastakúnna í áskrift"
          description="Viðskiptavinir sem hafa keypt stakan kassa tvisvar eða oftar en eru ekki í áskrift. Upphæðin sýnir hvað þau hefðu sparað með áskrift."
          actions={buyers.length && notSent ? (
            <form action={sendOfferToAll} className="flex items-center gap-2">
              <input type="hidden" name="pct" value="10" />
              <SubmitButton variant="primary" size="sm" confirm={`Senda ${notSent} viðskiptavinum persónulegt tilboð (10% af fyrsta áskriftarkassa)?`}>Senda öllum tilboð ({notSent})</SubmitButton>
            </form>
          ) : undefined}
          padded={false}
        >
          {buyers.length ? (
            <div className={tableWrap}>
              <table className={tableClass}>
                <thead><tr><th className={th}>Viðskiptavinur</th><th className={cn(th, "text-right")}>Stök kaup</th><th className={cn(th, "text-right")}>Hefði sparað</th><th className={th}>Tilboð</th></tr></thead>
                <tbody>
                  {buyers.slice(0, 25).map((b) => (
                    <tr key={b.customerId}>
                      <td className={td}><Link href={`/admin/vidskiptavinir/${b.customerId}`} className="font-semibold text-burgundy hover:underline">{b.name}</Link><span className="block text-xs text-muted">{b.email}</span></td>
                      <td className={cn(td, "text-right tabular-nums")}>{b.orders} · {kr(b.spent)}</td>
                      <td className={cn(td, "text-right tabular-nums font-semibold text-leaf")}>{kr(b.wouldSave)}</td>
                      <td className={td}>
                        {b.offerSentAt ? <Badge tone="green">Sent {dateShort(b.offerSentAt)}</Badge> : (
                          <form action={sendSubscriptionOffer} className="flex items-center gap-2">
                            <input type="hidden" name="customerId" value={b.customerId} />
                            <select name="pct" defaultValue="10" aria-label="Afsláttur" className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm">
                              {[5, 10, 15, 20].map((p) => <option key={p} value={p}>{p}%</option>)}
                            </select>
                            <SubmitButton variant="dark" size="sm">Senda tilboð</SubmitButton>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-line/70 px-5 py-3 text-xs text-muted">„Senda tilboð“ býr til persónulegan afsláttarkóða (gildir einu sinni, 30 daga, aðeins á áskrift) og sendir tölvupóst. Ef tölvupóstur er ekki tengdur er pósturinn vistaður undir Fyrirspurnir → Útsendur póstur.</p>
            </div>
          ) : <EmptyState icon="users" title="Enginn á listanum">Allir sem hafa keypt kassa oftar en einu sinni eru þegar í áskrift. Vel gert!</EmptyState>}
        </Card>
      </div>

      <div className="mt-5">
        <Suspense fallback={<Card title="PostHog"><p className="text-sm text-muted">Sæki gögn úr PostHog…</p></Card>}>
          <PostHogPanel days={days} />
        </Suspense>
      </div>
    </>
  );
}
