import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readCart, summarize } from "@/lib/cart";
import { getSetting } from "@/lib/settings";
import { getCustomer } from "@/lib/auth";
import { getOrderableDelivery } from "@/lib/catalog";
import { paymentMode } from "@/lib/integrations/payments";
import { pikkoloConfig } from "@/lib/integrations/pikkolo";
import { liteProduct } from "@/lib/lite";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { TrackView } from "@/components/shop/TrackView";

export const metadata: Metadata = { title: "Ganga frá pöntun", robots: { index: false } };

export default async function CheckoutPage() {
  const cart = await readCart();
  const s = await summarize(cart);
  if (!s.lines.length) redirect("/karfa");
  const [methods, customer, next, mode, pk, frequencies] = await Promise.all([
    getSetting("shipping.methods"),
    getCustomer(),
    getOrderableDelivery(),
    paymentMode(),
    pikkoloConfig(),
    getSetting("subscription.frequencies"),
  ]);
  const enabled = methods.filter((m) => m.enabled && (m.id !== "PIKKOLO" || pk.canSearch));
  return (
    <>
      <TrackView name="checkout_started" />
      <CheckoutForm
        lines={s.lines.map((l) => ({ key: l.key, name: l.product.name, image: l.product.image, qty: l.qty, sub: l.sub, lineTotal: l.lineTotal, product: liteProduct(l.product), potentialSubSavings: l.potentialSubSavings }))}
        totals={{ subtotal: s.subtotal, discount: s.discount, discountCode: s.discountCode, subSavings: s.subSavings }}
        methods={enabled}
        hasSubscription={s.hasSubscription}
        boxCount={s.lines.reduce((n, l) => n + l.qty, 0)}
        customer={customer ? { email: customer.email, name: customer.name, phone: customer.phone, kennitala: customer.kennitala, street: customer.street, postalCode: customer.postalCode, city: customer.city, hasPassword: !!customer.passwordHash } : null}
        nextDate={next?.date.toISOString() ?? null}
        testMode={mode === "test"}
        frequencies={frequencies}
      />
    </>
  );
}
