import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PackingSlip, PRINT_CSS } from "../../_components/PackingSlip";
import { PrintButton } from "../../_components/client";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();
  const s = await getSettings(["store.phone", "store.email", "store.address"]);
  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/pantanir/${order.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-burgundy">
          <Icon name="arrowLeft" className="h-4 w-4" /> Aftur í pöntun #{order.number}
        </Link>
        <PrintButton label="Prenta fylgiseðil" />
      </div>
      <div id="print-root" className="mx-auto max-w-[720px] overflow-hidden rounded-2xl shadow-soft print:max-w-none print:shadow-none">
        <PackingSlip order={order} items={order.items} store={{ phone: s["store.phone"], email: s["store.email"], address: s["store.address"] }} />
      </div>
    </>
  );
}
