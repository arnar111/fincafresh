import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dateTime, timeAgo } from "@/lib/format";
import { PageHeader, Card, Explainer, EmptyState, th, td, tableClass, tableWrap } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/forms";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { deleteInquiry, deleteSubscriber, toggleInquiry } from "./actions";

export const metadata = { title: "Fyrirspurnir" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ flipi?: string }> }) {
  await requireAdmin();
  const tab = (await searchParams).flipi ?? "fyrirspurnir";
  const [inquiries, newCount, subs, optIns, outbox] = await Promise.all([
    tab === "fyrirspurnir" ? db.inquiry.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }], take: 200 }) : Promise.resolve([]),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" }, take: tab === "postlisti" ? 500 : 0 }),
    db.customer.count({ where: { marketingOptIn: true } }),
    tab === "postur" ? db.emailOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, to: true, subject: true, status: true, error: true, createdAt: true } }) : Promise.resolve([]),
  ]);
  const subCount = await db.newsletterSubscriber.count();
  const tabs = [
    { key: "fyrirspurnir", label: "Fyrirspurnir", count: newCount },
    { key: "postlisti", label: "Póstlisti", count: 0 },
    { key: "postur", label: "Útsendur póstur", count: 0 },
  ];

  return (
    <>
      <PageHeader title="Fyrirspurnir" description="Skilaboð frá fyrirtækjum og viðskiptavinum, póstlistinn og allur póstur sem síðan hefur sent." />
      <Explainer>
        <p><strong>Fyrirspurnir</strong> koma úr forminu á síðunni um fyrirtækjaþjónustu og úr hafðu samband formum. Smelltu á „Svara“ til að opna tölvupóstinn þinn með netfanginu tilbúnu.</p>
        <p><strong>Póstlisti</strong> eru þau sem skráðu sig fyrir fréttum. Þú getur sótt listann sem Excel skrá og flutt hann t.d. inn í Mailchimp.</p>
        <p><strong>Útsendur póstur</strong> sýnir alla pósta sem síðan hefur sent (pöntunarstaðfestingar, tilboð o.fl.). Ef tölvupóstur er ekki tengdur eru póstarnir geymdir hér í staðinn.</p>
      </Explainer>
      <div className="mb-4 flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-sm sm:w-fit">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/fyrirspurnir?flipi=${t.key}`} className={cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold", tab === t.key ? "bg-burgundy text-cream" : "text-burgundy hover:bg-cream")}>
            {t.label}{t.count ? <span className="rounded-full bg-orange px-1.5 text-xs text-burgundy-900">{t.count}</span> : null}
          </Link>
        ))}
      </div>

      {tab === "fyrirspurnir" ? (
        inquiries.length === 0 ? (
          <Card><EmptyState icon="inbox" title="Engar fyrirspurnir ennþá">Þegar einhver sendir fyrirspurn á síðunni birtist hún hér og í valmyndinni sést appelsínugult merki.</EmptyState></Card>
        ) : (
          <div className="space-y-3">
            {inquiries.map((q) => (
              <article key={q.id} className={cn("rounded-2xl border bg-white p-5", q.status === "NEW" ? "border-orange/40 shadow-soft" : "border-line opacity-80")}>
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg text-burgundy">{q.name}</span>
                      {q.company ? <span className="text-sm text-muted">· {q.company}</span> : null}
                      <Badge tone={q.type === "B2B" ? "pink" : "neutral"}>{q.type === "B2B" ? "Fyrirtæki" : "Almenn"}</Badge>
                      {q.status === "NEW" ? <Badge tone="orange">Ný</Badge> : <Badge tone="green">Afgreidd</Badge>}
                    </div>
                    <div className="mt-0.5 text-sm text-muted">{q.email}{q.phone ? ` · ${q.phone}` : ""} · {timeAgo(q.createdAt)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`mailto:${q.email}?subject=${encodeURIComponent("Re: Fyrirspurn til Fincafresh")}`} className="inline-flex items-center gap-1 rounded-full bg-burgundy px-4 py-2 text-sm font-semibold text-cream hover:bg-burgundy-700"><Icon name="mail" className="h-4 w-4" /> Svara</a>
                    <form action={toggleInquiry}><input type="hidden" name="id" value={q.id} /><SubmitButton variant="light" size="sm">{q.status === "NEW" ? "Merkja afgreidda" : "Merkja óafgreidda"}</SubmitButton></form>
                    <form action={deleteInquiry}><input type="hidden" name="id" value={q.id} /><SubmitButton variant="ghost" size="sm" confirm="Eyða þessari fyrirspurn?"><Icon name="trash" className="h-4 w-4" /><span className="sr-only">Eyða</span></SubmitButton></form>
                  </div>
                </header>
                <p className="mt-3 whitespace-pre-line text-[15px] text-ink/90">{q.message}</p>
              </article>
            ))}
          </div>
        )
      ) : null}

      {tab === "postlisti" ? (
        <Card
          title={`Póstlisti (${subCount})`}
          description={`Auk þess hafa ${optIns} viðskiptavinir samþykkt markpóst við pöntun. Þeir eru með í Excel skránni.`}
          actions={<a href="/admin/fyrirspurnir/postlisti-csv" className="inline-flex items-center gap-1 rounded-full bg-green px-4 py-2 text-sm font-semibold text-cream hover:bg-green-700"><Icon name="download" className="h-4 w-4" /> Sækja sem Excel (CSV)</a>}
          padded={false}
        >
          {subs.length ? (
            <ul className="divide-y divide-line/70">
              {subs.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[15px]">
                  <span>{s.email} <span className="text-xs text-muted">· {dateTime(s.createdAt)}</span></span>
                  <form action={deleteSubscriber}><input type="hidden" name="id" value={s.id} /><SubmitButton variant="ghost" size="sm" confirm={`Fjarlægja ${s.email} af póstlistanum?`}>Fjarlægja</SubmitButton></form>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon="mail" title="Enginn á póstlistanum ennþá">Fólk skráir sig í gegnum formið neðst á síðunni.</EmptyState>}
        </Card>
      ) : null}

      {tab === "postur" ? (
        <Card title="Útsendur póstur" description="Síðustu 100 póstar. Smelltu til að sjá póstinn eins og viðtakandinn sá hann." padded={false}>
          {outbox.length ? (
            <div className={tableWrap}>
              <table className={tableClass}>
                <thead><tr><th className={th}>Viðtakandi</th><th className={th}>Efni</th><th className={th}>Staða</th><th className={th}>Tími</th></tr></thead>
                <tbody>
                  {outbox.map((m) => (
                    <tr key={m.id}>
                      <td className={td}>{m.to}</td>
                      <td className={td}><Link href={`/admin/fyrirspurnir/postur/${m.id}`} className="font-semibold text-burgundy hover:underline">{m.subject}</Link></td>
                      <td className={td}>{m.status === "SENT" ? <Badge tone="green">Sendur</Badge> : m.status === "FAILED" ? <Badge tone="danger">Mistókst</Badge> : <Badge tone="lemon">Vistaður (ekki sendur)</Badge>}</td>
                      <td className={cn(td, "whitespace-nowrap text-muted")}>{dateTime(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState icon="mail" title="Enginn póstur ennþá" />}
        </Card>
      ) : null}
    </>
  );
}
