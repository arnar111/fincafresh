import type { Metadata } from "next";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBoxes, getNextDelivery } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";
import { liteProduct } from "@/lib/lite";
import { kr, dateLong, dateWithDayAcc, parseJsonList } from "@/lib/format";
import { SKIPPED_BY_CUSTOMER } from "@/lib/subscriptions";
import { ORDER_STATUS_LABELS, DELIVERY_METHOD_LABELS } from "@/lib/orders";
import { logout } from "@/app/actions/account";
import { SubscriptionCard, type SubLite } from "@/components/shop/SubscriptionCard";
import { DetailsForm, PasswordForm } from "@/components/shop/DetailsForm";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Mínar síður", robots: { index: false } };

export default async function AccountPage() {
  const c = await requireCustomer();
  const [subs, orders, boxes, next, frequencies] = await Promise.all([
    db.subscription.findMany({ where: { customerId: c.id }, include: { product: true }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    db.order.findMany({ where: { customerId: c.id }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    getBoxes(),
    getNextDelivery(),
    getSetting("subscription.frequencies"),
  ]);
  const liteBoxes = boxes.map(liteProduct);
  // Pantanir viðskiptavinarins í næstu sendingu og sendingin þar á eftir (til að segja rétt frá "sleppa")
  const [nextOrders, following] = next
    ? await Promise.all([
        db.order.findMany({ where: { deliveryId: next.id, customerId: c.id }, include: { items: true } }),
        db.delivery.findFirst({ where: { date: { gt: next.date }, status: { in: ["PLANNED", "PACKING"] } }, orderBy: { date: "asc" } }),
      ])
    : [[], null];
  const skipInfo = (s: (typeof subs)[number]) => {
    const mine = nextOrders.filter((x) => x.subscriptionId === s.id || x.items.some((i) => i.isSubscription && i.productId === s.productId));
    const active = mine.filter((o) => o.status !== "CANCELLED");
    const cancelledBySkip = active.length === 0 && mine.some((o) => o.status === "CANCELLED" && o.internalNote === SKIPPED_BY_CUSTOMER);
    const nextLocked = active.some((o) => !(o.status === "NEW" && o.source === "SUBSCRIPTION" && o.paymentStatus === "UNPAID"));
    const skipping = s.skipNext || cancelledBySkip;
    let skipText: string | null = null;
    if (next && skipping) {
      if (cancelledBySkip || active.length === 0) skipText = `Þú sleppir sendingunni ${dateWithDayAcc(next.date)}.`;
      else skipText = `Kassinn í sendingunni ${dateWithDayAcc(next.date)} er þegar frágenginn, svo þú sleppir ${following ? `sendingunni ${dateWithDayAcc(following.date)}` : "sendingunni þar á eftir"}.`;
    }
    return { skipping, skipText, nextLocked };
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-8 sm:px-6 lg:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.16em] text-leaf">Mínar síður</div>
          <h1 className="mt-1 font-display text-4xl text-burgundy sm:text-5xl">Hæ {c.name.split(" ")[0] || "þú"}!</h1>
        </div>
        <form action={logout}><button className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted hover:text-burgundy"><Icon name="logout" className="h-4 w-4" /> Skrá út</button></form>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-3xl text-burgundy">Áskriftir</h2>
        {subs.length ? (
          <div className="space-y-5">
            {subs.map((s) => {
              const lite: SubLite = {
                id: s.id,
                status: s.status,
                skipNext: s.skipNext,
                pausedUntil: s.pausedUntil?.toISOString() ?? null,
                quantity: s.quantity,
                everyNthDelivery: s.everyNthDelivery,
                unitPrice: s.unitPrice,
                discountPct: s.discountPct,
                productId: s.productId,
                productName: s.product.name,
                productImage: parseJsonList(s.product.images)[0] ?? "/brand/lemon-mark.svg",
                deliveryLabel: s.deliveryMethod === "PIKKOLO" ? `Pikkoló${s.pikkoloStationName ? `: ${s.pikkoloStationName}` : ""}` : DELIVERY_METHOD_LABELS[s.deliveryMethod] ?? s.deliveryMethod,
                createdAt: s.createdAt.toISOString(),
                ...skipInfo(s),
              };
              return <SubscriptionCard key={s.id} sub={lite} boxes={liteBoxes} frequencies={frequencies} nextDate={next?.date.toISOString() ?? null} />;
            })}
          </div>
        ) : (
          <div className="rounded-3xl bg-pink-100 p-6 sm:p-8">
            <h3 className="font-display text-2xl text-burgundy">Engin áskrift ennþá</h3>
            <p className="mt-1 max-w-lg text-[15px] text-ink/80">Með áskrift færðu afslátt af hverjum kassa og kassinn kemur sjálfkrafa. Enginn binditími.</p>
            <ButtonLink href="/askrift" className="mt-4">Skoða áskrift</ButtonLink>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-3xl text-burgundy">Pantanir</h2>
        {orders.length ? (
          <div className="overflow-x-auto rounded-3xl border border-line bg-white">
            <table className="w-full min-w-[560px] text-left text-[15px]">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr><th className="p-4">Númer</th><th className="p-4">Dagsetning</th><th className="p-4">Vörur</th><th className="p-4">Staða</th><th className="p-4 text-right">Upphæð</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-line/70">
                    <td className="p-4 font-semibold"><Link href={`/pontun/${o.id}`} className="hover:underline">#{o.number}</Link></td>
                    <td className="p-4">{dateLong(o.createdAt)}</td>
                    <td className="p-4 text-muted">{o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</td>
                    <td className="p-4">{ORDER_STATUS_LABELS[o.status] ?? o.status}</td>
                    <td className="p-4 text-right font-semibold">{kr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-2xl bg-white p-6 text-muted">Engar pantanir ennþá.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-display text-3xl text-burgundy">Mínar upplýsingar</h2>
        <div className="rounded-3xl border border-line bg-cream-50 p-6">
          <p className="mb-4 text-sm text-muted">Netfang: <strong className="text-ink">{c.email}</strong></p>
          <DetailsForm c={{ name: c.name, phone: c.phone, street: c.street, postalCode: c.postalCode, city: c.city, marketingOptIn: c.marketingOptIn }} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-1 font-display text-3xl text-burgundy">Lykilorð</h2>
        <p className="mb-4 text-[15px] text-muted">{c.passwordHash ? "Breyttu lykilorðinu þínu." : "Þú skráðir þig inn með tengli. Settu lykilorð ef þú vilt geta skráð þig inn með því næst."}</p>
        <div className="rounded-3xl border border-line bg-cream-50 p-6">
          <PasswordForm hasPassword={!!c.passwordHash} />
        </div>
      </section>
    </div>
  );
}
