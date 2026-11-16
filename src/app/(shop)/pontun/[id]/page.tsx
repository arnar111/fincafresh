import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { kr, dateWithDayAcc } from "@/lib/format";
import { DELIVERY_METHOD_LABELS } from "@/lib/orders";
import { LemonLogo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Celebrate } from "@/components/shop/Celebrate";

export const metadata: Metadata = { title: "Takk fyrir pöntunina", robots: { index: false } };

export default async function OrderConfirmation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, customer, last] = await Promise.all([
    db.order.findUnique({ where: { id }, include: { items: true } }),
    getCustomer(),
    cookies().then((c) => c.get("ff_last_order")?.value),
  ]);
  if (!order || (last !== order.id && (!customer || customer.id !== order.customerId))) notFound();
  const hasSub = order.items.some((i) => i.isSubscription);
  const loggedIn = !!customer && customer.id === order.customerId;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <Celebrate />
      <div className="text-center">
        <LemonLogo className="mx-auto h-28 w-auto" />
        <h1 className="mt-6 font-display text-4xl text-burgundy sm:text-5xl">Takk fyrir, {order.name.split(" ")[0]}!</h1>
        <p className="mt-3 text-lg text-ink/80">
          Pöntun <strong>#{order.number}</strong> er móttekin. Staðfesting var send á {order.email}.
        </p>
      </div>

      {hasSub ? (
        <div className="mt-8 flex items-start gap-4 rounded-3xl bg-pink-100 p-5 sm:p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-burgundy"><Icon name="repeat" /></span>
          <div>
            <h2 className="font-display text-2xl text-burgundy">Velkomin(n) í áskrift!</h2>
            <p className="mt-1 text-[15px] text-ink/80">Kassinn kemur sjálfkrafa með sendingunum. Þú getur sleppt sendingu, gert hlé eða breytt kassanum hvenær sem er.</p>
            <Link href="/minar-sidur" className="mt-3 inline-flex items-center gap-1 font-semibold text-burgundy underline">Stjórna áskriftinni <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
        </div>
      ) : null}

      <div className="mt-8 rounded-3xl border border-line bg-cream-50 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.14em] text-leaf">Afhending</div>
            <div className="mt-1 font-semibold">{DELIVERY_METHOD_LABELS[order.deliveryMethod] ?? order.deliveryMethod}{order.pikkoloStationName ? `: ${order.pikkoloStationName}` : ""}</div>
            {order.deliveryMethod === "HOME" ? <div className="text-sm text-muted">{order.street}, {order.postalCode} {order.city}</div> : null}
            {order.deliveryDate ? <div className="text-sm text-muted">Með sendingunni {dateWithDayAcc(order.deliveryDate)}</div> : null}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[.14em] text-leaf">Greiðsla</div>
            <div className="mt-1 font-semibold">{order.paymentMethod}</div>
            <div className="text-sm text-muted">{order.paymentRef}</div>
          </div>
        </div>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-3 text-[15px]">
              <span>{i.quantity} × {i.name}</span>
              <span className="font-semibold">{kr(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 text-[15px]">
          {order.discount > 0 ? <div className="flex justify-between text-leaf"><dt>Afsláttur {order.discountCode}</dt><dd>-{kr(order.discount)}</dd></div> : null}
          <div className="flex justify-between"><dt className="text-muted">Sending</dt><dd>{order.shipping ? kr(order.shipping) : "Frítt"}</dd></div>
          <div className="flex justify-between pt-2 text-lg"><dt className="font-semibold">Samtals</dt><dd className="font-display text-2xl text-burgundy">{kr(order.total)}</dd></div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {loggedIn ? <ButtonLink href="/minar-sidur" variant="dark">Mínar síður</ButtonLink> : <ButtonLink href={`/minar-sidur/innskraning?netfang=${encodeURIComponent(order.email)}`} variant="dark">Skrá inn á Mínar síður</ButtonLink>}
        <ButtonLink href="/netverslun" variant="outline">Halda áfram að versla</ButtonLink>
      </div>
    </div>
  );
}
