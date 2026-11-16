import Link from "next/link";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { kr, num, dateWithDayAcc, dateShort, timeAgo, plural } from "@/lib/format";
import { daysAgo, startOfDay, subscriptionRevenue, packingSummary } from "@/lib/admin-ops";
import { wooConfig } from "@/lib/integrations/woocommerce";
import { pikkoloConfig } from "@/lib/integrations/pikkolo";
import { posthogConfig } from "@/lib/integrations/posthog";
import { PageHeader, Card, StatCard, Explainer, HelpTip, EmptyState } from "@/components/admin/ui";
import { BarChart } from "@/components/admin/charts";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

export const dynamic = "force-dynamic";

async function revenueSince(from: Date) {
  const r = await db.order.aggregate({ where: { createdAt: { gte: from }, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: true });
  return { total: r._sum.total ?? 0, count: r._count };
}

export default async function Dashboard() {
  const [today, week, month] = await Promise.all([revenueSince(startOfDay()), revenueSince(daysAgo(6)), revenueSince(daysAgo(29))]);
  const subRev = await subscriptionRevenue();

  const monthOrders = await db.order.findMany({
    where: { createdAt: { gte: daysAgo(29) }, status: { not: "CANCELLED" } },
    select: { createdAt: true, total: true, items: { select: { isSubscription: true } } },
  });
  const withSub = monthOrders.filter((o) => o.items.some((i) => i.isSubscription)).length;
  const subShare = monthOrders.length ? Math.round((withSub / monthOrders.length) * 100) : 0;

  // 30 daga sala, dag fyrir dag
  const days: { label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = daysAgo(i);
    days.push({ label: dateShort(d), value: 0 });
  }
  for (const o of monthOrders) {
    const idx = 29 - Math.floor((startOfDay().getTime() - startOfDay(o.createdAt).getTime()) / 86400000);
    if (idx >= 0 && idx < 30) days[idx].value += o.total;
  }

  const [newOrders, pikkoloUnsent, newInquiries, unreviewedFruits, paused, activity, demo] = await Promise.all([
    db.order.count({ where: { status: "NEW" } }),
    db.order.count({ where: { deliveryMethod: "PIKKOLO", pikkoloOrderId: "", status: { notIn: ["CANCELLED", "DELIVERED"] } } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.fruit.count({ where: { active: true, reviewed: false } }),
    db.subscription.count({ where: { status: "PAUSED" } }),
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.setting.findUnique({ where: { key: "demo.seeded" } }),
  ]);

  const next = await db.delivery.findFirst({
    where: { date: { gte: startOfDay() }, status: { in: ["PLANNED", "PACKING"] } },
    orderBy: { date: "asc" },
  });
  const packing = next ? await packingSummary(next.id) : null;
  const daysToCutoff = next?.cutoffDate ? Math.ceil((startOfDay(next.cutoffDate).getTime() - startOfDay().getTime()) / 86400000) : null;
  const daysToDelivery = next ? Math.ceil((startOfDay(next.date).getTime() - startOfDay().getTime()) / 86400000) : null;

  const [woo, pikkolo, ph, paymentMode, shippingConfirmed, smtpHost] = await Promise.all([
    wooConfig(),
    pikkoloConfig(),
    posthogConfig(),
    getSetting("payment.mode"),
    getSetting("shipping.pricesConfirmed"),
    getSetting("smtp.host"),
  ]);

  const todo: { icon: string; text: React.ReactNode; href: string; tone: "warn" | "info" | "good" }[] = [];
  if (newOrders) todo.push({ icon: "box", text: <><strong>{plural(newOrders, "ný pöntun bíður", "nýjar pantanir bíða")}</strong> afgreiðslu</>, href: "/admin/pantanir?stada=NEW", tone: "warn" });
  if (pikkoloUnsent) todo.push({ icon: "pin", text: <><strong>{plural(pikkoloUnsent, "Pikkoló pöntun", "Pikkoló pantanir")}</strong> hafa ekki verið sendar til Pikkoló</>, href: "/admin/pantanir?pikkolo=osent", tone: "warn" });
  if (next) {
    todo.push({
      icon: "truck",
      text: (
        <>
          Næsta sending er <strong>{dateWithDayAcc(next.date)}</strong>
          {daysToCutoff !== null ? (daysToCutoff >= 0 ? <> · {daysToCutoff === 0 ? "pöntunarfrestur rennur út í dag" : `${daysToCutoff} ${daysToCutoff === 1 ? "dagur" : "dagar"} í pöntunarfrest`}</> : <> · pöntunarfrestur er liðinn</>) : null}
          {packing && packing.projection.count > 0 ? <> · <strong>{packing.projection.count}</strong> áskriftarpantanir eftir að búa til</> : null}
        </>
      ),
      href: `/admin/sendingar/${next.id}`,
      tone: packing && packing.projection.count > 0 ? "warn" : "info",
    });
  } else {
    todo.push({ icon: "calendar", text: <>Engin næsta sending er skráð. <strong>Skráðu næstu sendingu</strong> svo forsíðan sýni hvað er í kassanum.</>, href: "/admin/sendingar", tone: "warn" });
  }
  if (newInquiries) todo.push({ icon: "inbox", text: <><strong>{plural(newInquiries, "ný fyrirspurn", "nýjar fyrirspurnir")}</strong> ólesnar</>, href: "/admin/fyrirspurnir", tone: "warn" });
  if (unreviewedFruits) todo.push({ icon: "leaf", text: <><strong>{plural(unreviewedFruits, "ávaxtatexti", "ávaxtatextar")}</strong> hafa ekki verið yfirfarnir (birtast þegar smellt er á ávöxt)</>, href: "/admin/avextir", tone: "info" });
  if (paused) todo.push({ icon: "pause", text: <>{plural(paused, "áskrift er", "áskriftir eru")} í hléi</>, href: "/admin/askriftir?stada=PAUSED", tone: "info" });
  const notConnected = [!woo.configured && "WooCommerce", !pikkolo.canSubmit && "Pikkoló", !ph.canCapture && "PostHog"].filter(Boolean) as string[];
  if (notConnected.length) todo.push({ icon: "plug", text: <>Ekki tengt ennþá: <strong>{notConnected.join(", ")}</strong></>, href: "/admin/tengingar", tone: "info" });

  const checklist: { done: boolean; label: string; help: string; href: string; pending?: boolean }[] = [
    { done: paymentMode === "live", label: "Raunveruleg greiðslugátt tengd", help: "Núna er kerfið í prófunarham: greiðslur eru samþykktar sjálfkrafa en engir peningar færast. Áður en opnað er þarf að tengja greiðslugátt.", href: "/admin/stillingar" },
    { done: !!shippingConfirmed, label: "Sendingarverð staðfest", help: "Sendingarverð fyrir Pikkoló og heimsendingu eru 0 kr. þar til þú setur rétt verð og hakar við að þau séu staðfest.", href: "/admin/stillingar" },
    { done: pikkolo.canSubmit && pikkolo.environment === "production", label: "Pikkoló tengt (raunumhverfi)", help: "Þarf Vendor ID og API-lykil, og umhverfið stillt á 'production' þegar allt hefur verið prófað.", href: "/admin/tengingar" },
    { done: false, pending: true, label: "Repeat API", help: "Repeat birtir ekki opinbera API-skjölun. Þegar skjölun berst frá Repeat er tengingin kláruð. Þangað til má skrá Repeat-auðkenni handvirkt á hverja áskrift.", href: "/admin/tengingar" },
    { done: false, pending: true, label: "Samskip API", help: "Sótt hefur verið um aðgang. Þangað til er hægt að sækja sendingarlista (CSV) fyrir heimsendingar undir Sendingar.", href: "/admin/sendingar" },
    { done: ph.canCapture, label: "PostHog tengt", help: "Þarf 'Project API key' úr PostHog svo hægt sé að sjá hvernig notendur hegða sér á síðunni.", href: "/admin/tengingar" },
    { done: woo.configured, label: "WooCommerce tengt", help: "Þarf slóð verslunar og REST API lykla til að flytja inn vörur, pantanir og viðskiptavini.", href: "/admin/tengingar" },
    { done: !!smtpHost, label: "Tölvupóstur (SMTP) stilltur", help: "Án SMTP eru staðfestingarpóstar ekki sendir heldur vistaðir undir Fyrirspurnir → Útsendur póstur.", href: "/admin/tengingar" },
    { done: unreviewedFruits === 0, label: "Ávaxtatextar yfirfarnir", help: "Textarnir sem birtast þegar smellt er á ávöxt eru drög. Lestu þá yfir og hakaðu við 'Yfirfarið'.", href: "/admin/avextir" },
    { done: demo?.value !== "true", label: "Prufugögnum eytt", help: "Prufupantanir og prufuviðskiptavinir eru til svo hægt sé að prófa kerfið. Eyddu þeim áður en opnað er.", href: "/admin/stillingar#prufugogn" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Góðan daginn" : hour < 18 ? "Góðan dag" : "Gott kvöld";

  return (
    <>
      <PageHeader
        title={`${greeting}!`}
        description="Hér sérðu stöðuna á versluninni í dag og það sem þarf að gera."
        actions={
          <>
            <ButtonLink href="/admin/pantanir" variant="light" size="sm"><Icon name="box" className="h-4 w-4" /> Pantanir</ButtonLink>
            {next ? <ButtonLink href={`/admin/sendingar/${next.id}`} variant="dark" size="sm"><Icon name="truck" className="h-4 w-4" /> Næsta sending</ButtonLink> : null}
          </>
        }
      />

      <Explainer>
        <p>Yfirlitið er upphafssíðan þín. Efst eru helstu tölur, svo listi yfir <strong>það sem þarf að gera</strong> (smelltu á línu til að fara beint í verkið).</p>
        <p><strong>Gátlistinn fyrir opnun</strong> sýnir hvað er eftir áður en síðan fer í loftið. Grænt hak þýðir að hlutnum er lokið.</p>
        <p>Allar tölur uppfærast sjálfkrafa þegar pantanir berast.</p>
      </Explainer>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sala í dag" value={kr(today.total)} hint={plural(today.count, "pöntun", "pantanir")} icon="chart" />
        <StatCard label="Síðustu 7 dagar" value={kr(week.total)} hint={plural(week.count, "pöntun", "pantanir")} icon="chart" />
        <StatCard label="Síðustu 30 dagar" value={kr(month.total)} hint={plural(month.count, "pöntun", "pantanir")} icon="chart" />
        <StatCard label="Nýjar pantanir sem bíða" value={num(newOrders)} hint={newOrders ? "Smelltu til að afgreiða" : "Allt afgreitt"} icon="box" tone={newOrders ? "warn" : "good"} href="/admin/pantanir?stada=NEW" />
        <StatCard label="Virkar áskriftir" value={num(subRev.activeCount)} hint={paused ? `${paused} í hléi` : "Engin í hléi"} icon="repeat" tone="pink" href="/admin/askriftir" />
        <StatCard
          label="Áskriftartekjur á sendingu"
          value={kr(subRev.perDelivery)}
          hint={subRev.perMonth !== null ? <>u.þ.b. {kr(subRev.perMonth)} á mánuði</> : "Mánaðaráætlun birtist þegar fleiri sendingar eru skráðar"}
          icon="repeat"
        />
        <StatCard label="Pantanir með áskrift" value={`${subShare}%`} hint="af pöntunum síðustu 30 daga" icon="heart" tone={subShare >= 40 ? "good" : "default"} />
        <StatCard label="Pikkoló ósent" value={num(pikkoloUnsent)} hint="pantanir sem eiga eftir að fara til Pikkoló" icon="pin" tone={pikkoloUnsent ? "warn" : "good"} href="/admin/pantanir?pikkolo=osent" />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <Card title="Það sem þarf að gera" description="Smelltu á línu til að fara beint í verkið." padded={false}>
          {todo.length ? (
            <ul className="divide-y divide-line/70">
              {todo.map((t, i) => (
                <li key={i}>
                  <Link href={t.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-cream-50">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", t.tone === "warn" ? "bg-orange/15 text-orange-600" : "bg-cream text-burgundy")}>
                      <Icon name={t.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="flex-1 text-[15px]">{t.text}</span>
                    <Icon name="arrow" className="h-4 w-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="check" title="Ekkert bíður!">Allt er afgreitt. Vel gert.</EmptyState>
          )}
        </Card>

        <Card
          title={<span className="inline-flex items-center gap-2">Gátlisti fyrir opnun <HelpTip>Þetta þarf að klára áður en nýja síðan fer í loftið. Hlutir merktir &quot;Bíður&quot; eru háðir öðrum (t.d. API-aðgangi frá Samskip).</HelpTip></span>}
          description={`${doneCount} af ${checklist.length} atriðum klár`}
          padded={false}
        >
          <div className="px-5 pt-3">
            <div className="h-2 overflow-hidden rounded-full bg-cream">
              <div className="h-full rounded-full bg-leaf" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
            </div>
          </div>
          <ul className="divide-y divide-line/70 pt-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-start gap-3 px-5 py-3 hover:bg-cream-50" title={c.help}>
                  <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2", c.done ? "border-leaf bg-leaf text-white" : c.pending ? "border-lemon bg-lemon-100 text-burgundy" : "border-line text-transparent")}>
                    <Icon name={c.done ? "check" : c.pending ? "calendar" : "check"} className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1">
                    <span className={cn("block text-[15px] font-medium", c.done && "text-muted line-through decoration-leaf/60")}>{c.label}</span>
                    {!c.done ? <span className="mt-0.5 block text-[13px] leading-snug text-muted">{c.help}</span> : null}
                  </span>
                  {c.pending ? <span className="rounded-full bg-lemon-100 px-2 py-0.5 text-xs font-semibold text-burgundy-900">Bíður</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <Card title="Sala síðustu 30 daga" description={`Samtals ${kr(month.total)} · meðalpöntun ${kr(month.count ? month.total / month.count : 0)}`}>
          <BarChart data={days} money height={200} />
        </Card>

        <Card title="Næsta sending" description={next ? `${dateWithDayAcc(next.date)}${daysToDelivery !== null ? ` · eftir ${daysToDelivery} ${daysToDelivery === 1 ? "dag" : "daga"}` : ""}` : "Engin skráð"} actions={next ? <ButtonLink href={`/admin/sendingar/${next.id}`} variant="light" size="sm">Opna</ButtonLink> : null}>
          {packing ? (
            <div className="space-y-3">
              {packing.boxRows.map((b) => (
                <div key={b.productId} className="flex items-center justify-between gap-2 rounded-xl bg-cream-50 px-3 py-2.5">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-right text-sm text-muted">
                    <strong className="text-base text-ink">{b.grandTotal}</strong> kassar
                    {b.projected ? <span className="block text-xs">þar af {b.projected} áskriftir sem á eftir að stofna pöntun fyrir</span> : null}
                  </span>
                </div>
              ))}
              {packing.extras.length ? <p className="text-sm text-muted">Auk þess {plural(packing.extras.reduce((s, e) => s + e.qty, 0), "vara", "vörur")} úr netverslun.</p> : null}
            </div>
          ) : (
            <EmptyState icon="calendar" title="Engin sending skráð">
              <Link href="/admin/sendingar" className="font-semibold text-burgundy underline">Skráðu næstu sendingu</Link> til að stjórna innihaldi kassanna.
            </EmptyState>
          )}
        </Card>
      </div>

      <Card className="mt-6" title="Nýleg virkni" description="Það sem hefur gerst í kerfinu síðast." padded={false}>
        {activity.length ? (
          <ul className="divide-y divide-line/70">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3 text-[14.5px]">
                <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", a.level === "success" && "bg-leaf", a.level === "error" && "bg-danger", a.level === "warning" && "bg-orange", a.level === "info" && "bg-line")} />
                <span className="flex-1">{a.message}</span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Engin virkni ennþá" />
        )}
      </Card>
    </>
  );
}
