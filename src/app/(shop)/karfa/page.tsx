import type { Metadata } from "next";
import { readCart, summarize } from "@/lib/cart";
import { recommendFor } from "@/lib/recommendations";
import { getSetting } from "@/lib/settings";
import { getNextDelivery } from "@/lib/catalog";
import { liteProduct } from "@/lib/lite";
import { CartView, type CartLineLite } from "@/components/shop/CartView";

export const metadata: Metadata = { title: "Karfa", robots: { index: false } };

export default async function CartPage() {
  const cart = await readCart();
  const s = await summarize(cart);
  const [recs, frequencies, next] = await Promise.all([
    s.lines.length ? recommendFor(s.lines.map((l) => l.product.id), 4) : Promise.resolve([]),
    getSetting("subscription.frequencies"),
    getNextDelivery(),
  ]);
  const lines: CartLineLite[] = s.lines.map((l) => ({
    key: l.key,
    product: liteProduct(l.product),
    qty: l.qty,
    sub: l.sub,
    every: l.every,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
    potentialSubSavings: l.potentialSubSavings,
    subSavings: l.subSavings,
  }));
  return (
    <CartView
      lines={lines}
      summary={{ subtotal: s.subtotal, discount: s.discount, discountCode: s.discountCode, total: s.total, subSavings: s.subSavings, potentialSubSavings: s.potentialSubSavings, count: s.count }}
      recs={recs.map(liteProduct)}
      frequencies={frequencies}
      nextDate={next?.date.toISOString() ?? null}
    />
  );
}
