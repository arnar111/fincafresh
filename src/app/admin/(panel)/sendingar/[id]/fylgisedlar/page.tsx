import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { dateWithDayAcc, plural } from "@/lib/format";
import { PackingSlip, PRINT_CSS } from "../../../pantanir/_components/PackingSlip";
import { PrintButton } from "../../../pantanir/_components/client";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function DeliverySlips({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const delivery = await db.delivery.findUnique({ where: { id } });
  if (!delivery) notFound();
  const orders = await db.order.findMany({ where: { deliveryId: id, status: { not: "CANCELLED" } }, include: { items: true }, orderBy: [{ deliveryMethod: "asc" }, { pikkoloStationName: "asc" }, { number: "asc" }] });
  const s = await getSettings(["store.phone", "store.email", "store.address"]);
  const store = { phone: s["store.phone"], email: s["store.email"], address: s["store.address"] };
  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/admin/sendingar/${id}`} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-burgundy">
            <Icon name="arrowLeft" className="h-4 w-4" /> Aftur í sendinguna
          </Link>
          <h1 className="mt-1 font-display text-2xl text-burgundy">Fylgiseðlar: sending {dateWithDayAcc(delivery.date)}</h1>
          <p className="text-sm text-muted">{plural(orders.length, "fylgiseðill", "fylgiseðlar")}, einn á hverja blaðsíðu. Raðað eftir afhendingu og stöð.</p>
        </div>
        {orders.length ? <PrintButton label={`Prenta alla (${orders.length})`} /> : null}
      </div>
      <div id="print-root" className="space-y-8">
        {orders.length ? (
          orders.map((o) => (
            <div key={o.id} className="mx-auto max-w-[720px] overflow-hidden rounded-2xl shadow-soft print:max-w-none print:shadow-none">
              <PackingSlip order={o} items={o.items} store={store} />
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-white p-8 text-center text-muted">Engar pantanir í þessari sendingu ennþá.</p>
        )}
      </div>
    </>
  );
}
