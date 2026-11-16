import Link from "next/link";
import { getSetting } from "@/lib/settings";
import { hogql, posthogConfig } from "@/lib/integrations/posthog";
import { Card } from "@/components/admin/ui";
import { BarChart, HBar } from "@/components/admin/charts";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { num } from "@/lib/format";

async function safe<T>(fn: () => Promise<T>): Promise<{ data?: T; error?: string }> {
  try {
    return { data: await fn() };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * PostHog hluti greiningarinnar. Fyrirspurnir eru HogQL í gegnum
 * POST /api/projects/:id/query/ (https://posthog.com/docs/api/query).
 */
export async function PostHogPanel({ days }: { days: number }) {
  const cfg = await posthogConfig();
  const dashboardUrl = await getSetting("posthog.sharedDashboardUrl");

  if (!cfg.canQuery) {
    return (
      <Card title="PostHog: hegðun notenda á síðunni" description="Tengdu PostHog til að sjá hvaða síður fólk skoðar, hvar það hættir við og upptökur af heimsóknum.">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-cream text-burgundy"><Icon name="plug" className="h-6 w-6" /></div>
          <p className="flex-1 text-[15px] text-muted">
            {cfg.canCapture
              ? "Síðan sendir nú þegar atburði til PostHog. Til að sjá gögnin hér þarf líka „Personal API key“ og „Project ID“."
              : "PostHog er ekki tengt ennþá. Tölurnar hér fyrir ofan koma úr eigin skráningu síðunnar og virka án PostHog."}
          </p>
          <ButtonLink href="/admin/tengingar#posthog" variant="dark" size="sm">Tengja PostHog</ButtonLink>
        </div>
        {dashboardUrl ? <Embed url={dashboardUrl} /> : null}
      </Card>
    );
  }

  const d = Math.min(Math.max(days, 1), 365);
  const [pages, perDay, steps] = await Promise.all([
    safe(() => hogql<[string, number]>(`SELECT properties.$pathname AS slod, count() AS skodanir FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL ${d} DAY GROUP BY slod ORDER BY skodanir DESC LIMIT 10`)),
    safe(() => hogql<[string, number]>(`SELECT toDate(timestamp) AS dagur, count(DISTINCT person_id) AS gestir FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL ${d} DAY GROUP BY dagur ORDER BY dagur`)),
    safe(() => hogql<[string, number]>(`SELECT event, count(DISTINCT person_id) FROM events WHERE event IN ('product_viewed','add_to_cart','checkout_started','order_completed') AND timestamp > now() - INTERVAL ${d} DAY GROUP BY event`)),
  ]);
  const order = ["product_viewed", "add_to_cart", "checkout_started", "order_completed"];
  const labels: Record<string, string> = { product_viewed: "Skoðuðu vöru", add_to_cart: "Settu í körfu", checkout_started: "Byrjuðu að greiða", order_completed: "Kláruðu pöntun" };
  const stepMap = new Map((steps.data?.results ?? []).map((r) => [r[0], Number(r[1])]));
  const stepMax = Math.max(1, ...order.map((o) => stepMap.get(o) ?? 0));

  return (
    <Card
      title="PostHog: hegðun notenda á síðunni"
      description={`Gögn beint úr PostHog, síðustu ${d} daga. Einstakir gestir eru taldir einu sinni.`}
      actions={<a href={cfg.apiHost} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-burgundy hover:underline">Opna PostHog <Icon name="external" className="h-4 w-4" /></a>}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 font-semibold text-ink">Gestir á dag</h3>
          {perDay.error ? <ErrorNote msg={perDay.error} /> : perDay.data?.results.length ? (
            <BarChart data={perDay.data.results.map((r) => ({ label: String(r[0]).slice(5).split("-").reverse().join("."), value: Number(r[1]) }))} color="#425442" />
          ) : <p className="text-sm text-muted">Engin gögn ennþá.</p>}
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-ink">Kaupferlið (einstakir gestir)</h3>
          {steps.error ? <ErrorNote msg={steps.error} /> : (
            <div className="space-y-3">{order.map((o) => <HBar key={o} label={labels[o]} value={stepMap.get(o) ?? 0} max={stepMax} />)}</div>
          )}
        </div>
        <div className="lg:col-span-2">
          <h3 className="mb-2 font-semibold text-ink">Mest skoðuðu síður</h3>
          {pages.error ? <ErrorNote msg={pages.error} /> : (
            <ol className="divide-y divide-line/70 rounded-xl border border-line">
              {(pages.data?.results ?? []).map((r, i) => (
                <li key={i} className="flex justify-between gap-3 px-3 py-2 text-sm"><span className="truncate font-mono">{String(r[0] || "/")}</span><span className="tabular-nums text-muted">{num(Number(r[1]))}</span></li>
              ))}
              {!pages.data?.results.length ? <li className="px-3 py-2 text-sm text-muted">Engin gögn ennþá.</li> : null}
            </ol>
          )}
        </div>
      </div>
      {dashboardUrl ? <Embed url={dashboardUrl} /> : (
        <p className="mt-5 text-sm text-muted">Ábending: Í PostHog getur þú deilt mælaborði („Share → Embed“) og límt slóðina inn undir <Link href="/admin/tengingar#posthog" className="underline">Tengingar</Link>. Þá birtist það hér.</p>
      )}
    </Card>
  );
}

function ErrorNote({ msg }: { msg: string }) {
  return <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">Tókst ekki að sækja gögn úr PostHog: {msg}</p>;
}

function Embed({ url }: { url: string }) {
  return (
    <div className="mt-5">
      <h3 className="mb-2 font-semibold text-ink">Mælaborð úr PostHog</h3>
      <iframe src={url} title="PostHog mælaborð" className="h-[640px] w-full rounded-xl border border-line bg-white" loading="lazy" referrerPolicy="no-referrer" />
    </div>
  );
}
