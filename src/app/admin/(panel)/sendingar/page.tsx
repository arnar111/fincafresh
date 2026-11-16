import Link from "next/link";
import { db } from "@/lib/db";
import { dateWithDayAcc, dateShort, dateInput, plural } from "@/lib/format";
import { DELIVERY_STATUS_LABELS, startOfDay } from "@/lib/admin-ops";
import { PageHeader, Card, Explainer, EmptyState, HelpTip } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/forms";
import { Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { FruitArt } from "@/components/brand/FruitArt";
import { createDelivery } from "./actions";

export const dynamic = "force-dynamic";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const STATUS_TONE = { PLANNED: "lemon", PACKING: "orange", SHIPPED: "pink", DONE: "muted" } as const;

export default async function DeliveriesPage() {
  const today = startOfDay();
  const deliveries = await db.delivery.findMany({
    orderBy: { date: "desc" },
    take: 40,
    include: {
      fruits: { include: { fruit: true }, orderBy: [{ deluxeOnly: "asc" }, { sortOrder: "asc" }] },
      _count: { select: { orders: { where: { status: { not: "CANCELLED" } } } } },
    },
  });
  const upcoming = deliveries.filter((d) => d.date >= today && d.status !== "DONE").sort((a, b) => a.date.getTime() - b.date.getTime());
  const past = deliveries.filter((d) => !(d.date >= today && d.status !== "DONE"));
  const nextId = upcoming[0]?.id;

  const suggested = new Date(upcoming[upcoming.length - 1]?.date ?? today);
  suggested.setDate(suggested.getDate() + 14);
  const suggestedCutoff = new Date(suggested);
  suggestedCutoff.setDate(suggestedCutoff.getDate() - 4);

  const Row = ({ d }: { d: (typeof deliveries)[number] }) => (
    <li>
      <Link href={`/admin/sendingar/${d.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-cream-50">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-cream text-center leading-tight">
          <span className="font-display text-xl text-burgundy">{d.date.getDate()}</span>
          <span className="text-[11px] font-semibold uppercase text-muted">{dateShort(d.date).split(" ")[1]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{cap(dateWithDayAcc(d.date))}</span>
            <Badge tone={STATUS_TONE[d.status as keyof typeof STATUS_TONE] ?? "neutral"}>{DELIVERY_STATUS_LABELS[d.status] ?? d.status}</Badge>
            {d.id === nextId ? <Badge tone="green">Birtist á forsíðu</Badge> : null}
          </div>
          <div className="mt-0.5 text-sm text-muted">
            {d.title ? `${d.title} · ` : ""}
            {plural(d._count.orders, "pöntun", "pantanir")}
            {d.cutoffDate ? ` · pöntunarfrestur ${dateShort(d.cutoffDate)}` : ""}
          </div>
        </div>
        <div className="flex -space-x-2">
          {d.fruits.slice(0, 7).map((f) => (
            <span key={f.id} className={`grid h-9 w-9 place-items-center rounded-full border-2 bg-white ${f.deluxeOnly ? "border-lemon" : "border-white"}`} title={f.fruit.name}>
              <FruitArt kind={f.fruit.illustration || "other"} className="h-6 w-6" />
            </span>
          ))}
          {d.fruits.length === 0 ? <span className="text-sm text-orange-600">Engir ávextir valdir</span> : null}
        </div>
        <Icon name="arrow" className="h-4 w-4 text-muted" />
      </Link>
    </li>
  );

  return (
    <>
      <PageHeader title="Sendingar" description="Hver sending frá Spáni: hvað fer í kassann, hve mikið á að pakka og hvert það fer." />
      <Explainer>
        <p><strong>Sending</strong> er einn afhendingardagur, t.d. &quot;fimmtudaginn 26. nóvember&quot;. Næsta sending sem er ekki liðin birtist sjálfkrafa á forsíðunni undir &quot;Hvað er í næstu sendingu?&quot;.</p>
        <p><strong>Svona undirbýrð þú sendingu:</strong> 1) Skráðu dagsetningu hér fyrir neðan. 2) Opnaðu sendinguna og veldu ávextina sem fara í kassann (hakaðu við &quot;Aðeins Delúx&quot; fyrir sérstöku ávextina, þeir fá gullhring á síðunni). 3) Þegar pöntunarfrestur er liðinn smellir þú á &quot;Búa til áskriftarpantanir&quot;. 4) Prentaðu fylgiseðla, pakkaðu og sendu Pikkoló pantanirnar til Pikkoló.</p>
      </Explainer>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card title="Næstu sendingar" padded={false}>
            {upcoming.length ? (
              <ul className="divide-y divide-line/70">{upcoming.map((d) => <Row key={d.id} d={d} />)}</ul>
            ) : (
              <EmptyState icon="calendar" title="Engin sending framundan">Skráðu næstu sendingu hér til hægri svo forsíðan sýni hvað er í kassanum.</EmptyState>
            )}
          </Card>
          {past.length ? (
            <Card title="Fyrri sendingar" padded={false}>
              <ul className="divide-y divide-line/70">{past.map((d) => <Row key={d.id} d={d} />)}</ul>
            </Card>
          ) : null}
        </div>

        <Card title="Skrá nýja sendingu" description="Þú getur breytt öllu síðar.">
          <form action={createDelivery} className="space-y-4">
            <Field label="Sendingardagur" hint="Dagurinn sem kassarnir eru afhentir.">
              <Input type="date" name="date" required defaultValue={dateInput(suggested)} />
            </Field>
            <Field label={<span className="inline-flex items-center gap-1.5">Pöntunarfrestur <HelpTip>Síðasti dagur sem viðskiptavinir geta pantað í þessa sendingu. Birtist á forsíðunni.</HelpTip></span>}>
              <Input type="date" name="cutoffDate" defaultValue={dateInput(suggestedCutoff)} />
            </Field>
            <Field label="Heiti (valfrjálst)" hint="T.d. „Jólasendingin“.">
              <Input name="title" />
            </Field>
            <label className="flex items-center gap-2 text-[15px]">
              <input type="checkbox" name="copyFruits" defaultChecked className="h-4 w-4 accent-burgundy" />
              Afrita ávextina úr síðustu sendingu
            </label>
            <SubmitButton variant="primary" className="w-full"><Icon name="plus" className="h-4 w-4" /> Skrá sendingu</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
