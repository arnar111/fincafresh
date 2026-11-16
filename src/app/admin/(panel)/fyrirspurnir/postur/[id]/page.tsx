import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { PageHeader, Card } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Tölvupóstur" };

export default async function OutboxItem({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const m = await db.emailOutbox.findUnique({ where: { id: (await params).id } });
  if (!m) notFound();
  return (
    <>
      <PageHeader title={m.subject} description={<>Til {m.to} · {dateTime(m.createdAt)}</>} back={{ href: "/admin/fyrirspurnir?flipi=postur", label: "Útsendur póstur" }} />
      <Card
        title="Svona leit pósturinn út"
        actions={m.status === "SENT" ? <Badge tone="green">Sendur</Badge> : m.status === "FAILED" ? <Badge tone="danger">Mistókst</Badge> : <Badge tone="lemon">Vistaður, ekki sendur</Badge>}
      >
        {m.status === "LOGGED" ? (
          <p className="mb-4 rounded-xl bg-lemon-100 px-3 py-2 text-sm">Pósturinn var ekki sendur því tölvupóstur (SMTP) er ekki tengdur. Tengdu hann undir <Link href="/admin/tengingar#smtp" className="font-semibold underline">Tengingar</Link>.</p>
        ) : null}
        {m.error ? <p className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">Villa: {m.error}</p> : null}
        <iframe title="Tölvupóstur" sandbox="" srcDoc={m.html} className="h-[640px] w-full rounded-xl border border-line bg-white" />
      </Card>
    </>
  );
}
