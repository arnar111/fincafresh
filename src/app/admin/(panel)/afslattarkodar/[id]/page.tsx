import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dateInput, dateTime, kr } from "@/lib/format";
import { PageHeader, Card } from "@/components/admin/ui";
import { CodeForm } from "../CodeForm";

export const metadata = { title: "Breyta afsláttarkóða" };

export default async function EditCodePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const c = await db.discountCode.findUnique({ where: { id } });
  if (!c) notFound();
  const orders = await db.order.findMany({ where: { discountCode: { contains: c.code } }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, number: true, name: true, discount: true, createdAt: true } });
  return (
    <>
      <PageHeader title={c.code} description={`Notaður ${c.usedCount} sinnum.`} back={{ href: "/admin/afslattarkodar", label: "Allir kóðar" }} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[400px_1fr]">
        <Card title="Stillingar kóða">
          <CodeForm value={{ id: c.id, code: c.code, description: c.description, type: c.type, value: c.value, appliesTo: c.appliesTo, minSubtotal: c.minSubtotal, usageLimit: c.usageLimit, expiresAt: dateInput(c.expiresAt), active: c.active }} />
        </Card>
        <Card title="Pantanir með þessum kóða" padded={false}>
          {orders.length ? (
            <ul className="divide-y divide-line/70">
              {orders.map((o) => (
                <li key={o.id} className="flex justify-between gap-3 px-5 py-3 text-[15px]">
                  <a href={`/admin/pantanir/${o.id}`} className="font-semibold text-burgundy hover:underline">#{o.number} · {o.name}</a>
                  <span className="text-muted">−{kr(o.discount)} · {dateTime(o.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-muted">Enginn hefur notað kóðann ennþá.</p>
          )}
        </Card>
      </div>
    </>
  );
}
