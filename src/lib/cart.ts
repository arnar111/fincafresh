import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "./db";
import { toView, subPriceFor, type ProductView } from "./catalog";
import { getSetting, type ShippingMethod } from "./settings";

const CART_COOKIE = "ff_cart";

const CartItemSchema = z.object({
  productId: z.string(),
  qty: z.number().int().min(1).max(99),
  sub: z.boolean().default(false),
  every: z.number().int().min(1).max(12).default(1),
});
const CartSchema = z.object({
  items: z.array(CartItemSchema).default([]),
  code: z.string().default(""),
});
export type CartItem = z.infer<typeof CartItemSchema>;
export type CartData = z.infer<typeof CartSchema>;

export function lineKey(i: Pick<CartItem, "productId" | "sub" | "every">) {
  return i.sub ? `${i.productId}:sub:${i.every}` : `${i.productId}:one`;
}

export async function readCart(): Promise<CartData> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return { items: [], code: "" };
  try {
    return CartSchema.parse(JSON.parse(raw));
  } catch {
    return { items: [], code: "" };
  }
}

export async function writeCart(cart: CartData) {
  (await cookies()).set(CART_COOKIE, JSON.stringify(cart), {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCart() {
  (await cookies()).delete(CART_COOKIE);
}

export type CartLine = {
  key: string;
  product: ProductView;
  qty: number;
  sub: boolean;
  every: number;
  unitPrice: number;
  lineTotal: number;
  /** Ef þetta er stakur kassi: hvað sparast ef skipt er í áskrift */
  potentialSubSavings: number;
  /** Ef áskrift: sparnaður miðað við stakan kassa */
  subSavings: number;
};

export type CartSummary = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  discount: number;
  discountCode: string;
  discountError: string;
  shipping: number;
  total: number;
  subSavings: number;
  potentialSubSavings: number;
  hasSubscription: boolean;
  hasSingleBox: boolean;
  shippingMethod: ShippingMethod | null;
};

export async function validateDiscount(code: string, lines: CartLine[], subtotal: number) {
  if (!code) return { amount: 0, error: "" };
  const dc = await db.discountCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!dc || !dc.active) return { amount: 0, error: "Kóðinn fannst ekki eða er ekki lengur virkur." };
  if (dc.expiresAt && dc.expiresAt < new Date()) return { amount: 0, error: "Kóðinn er útrunninn." };
  if (dc.usageLimit !== null && dc.usedCount >= dc.usageLimit) return { amount: 0, error: "Kóðinn hefur þegar verið fullnýttur." };
  if (subtotal < dc.minSubtotal) return { amount: 0, error: `Kóðinn gildir aðeins ef keypt er fyrir a.m.k. ${dc.minSubtotal} kr.` };
  const eligible = lines
    .filter((l) => dc.appliesTo === "ALL" || (dc.appliesTo === "SUBSCRIPTION" ? l.sub : !l.sub))
    .reduce((s, l) => s + l.lineTotal, 0);
  if (eligible <= 0)
    return { amount: 0, error: dc.appliesTo === "SUBSCRIPTION" ? "Kóðinn gildir aðeins um áskriftir." : "Kóðinn gildir ekki um vörurnar í körfunni." };
  const amount = dc.type === "PERCENT" ? Math.round((eligible * dc.value) / 100) : Math.min(dc.value, eligible);
  return { amount, error: "" };
}

export async function summarize(cart: CartData, shippingMethodId?: string): Promise<CartSummary> {
  const ids = [...new Set(cart.items.map((i) => i.productId))];
  const products = await db.product.findMany({ where: { id: { in: ids }, active: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: CartLine[] = [];
  for (const it of cart.items) {
    const p = byId.get(it.productId);
    if (!p) continue;
    const view = await toView(p);
    const sub = it.sub && view.type === "BOX";
    const unit = sub ? subPriceFor(view.price, view.subDiscountPct) : view.price;
    lines.push({
      key: lineKey({ ...it, sub }),
      product: view,
      qty: it.qty,
      sub,
      every: it.every,
      unitPrice: unit,
      lineTotal: unit * it.qty,
      potentialSubSavings: !sub && view.type === "BOX" ? (view.price - view.subPrice) * it.qty : 0,
      subSavings: sub ? (view.price - unit) * it.qty : 0,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const { amount: discount, error: discountError } = await validateDiscount(cart.code, lines, subtotal);

  const methods = await getSetting("shipping.methods");
  const method = shippingMethodId ? methods.find((m) => m.id === shippingMethodId && m.enabled) ?? null : null;
  let shipping = 0;
  if (method && lines.length) {
    shipping = method.freeOver !== null && subtotal - discount >= method.freeOver ? 0 : method.price;
  }

  return {
    lines,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotal,
    discount,
    discountCode: cart.code,
    discountError,
    shipping,
    total: Math.max(0, subtotal - discount + shipping),
    subSavings: lines.reduce((s, l) => s + l.subSavings, 0),
    potentialSubSavings: lines.reduce((s, l) => s + l.potentialSubSavings, 0),
    hasSubscription: lines.some((l) => l.sub),
    hasSingleBox: lines.some((l) => !l.sub && l.product.type === "BOX"),
    shippingMethod: method,
  };
}

export async function cartCount(): Promise<number> {
  const c = await readCart();
  return c.items.reduce((s, i) => s + i.qty, 0);
}
