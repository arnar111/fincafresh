"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { readCart, writeCart, lineKey, summarize } from "@/lib/cart";
import { db } from "@/lib/db";
import { trackLocal } from "@/lib/analytics";

function refresh() {
  revalidatePath("/", "layout");
}

/** Auðkenni lotunnar (aðeins til ef notandi samþykkti tölfræðikökur) svo kaupferlið í greiningu tengist rétt */
async function sid() {
  return ((await cookies()).get("ff_sid")?.value ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 64);
}

export async function addToCart(input: { productId: string; qty?: number; sub?: boolean; every?: number }) {
  const product = await db.product.findUnique({ where: { id: input.productId } });
  if (!product || !product.active) return { ok: false as const, error: "Varan fannst ekki." };
  const sub = !!input.sub && product.type === "BOX";
  const every = Math.max(1, Math.min(12, input.every ?? 1));
  const qty = Math.max(1, Math.min(20, input.qty ?? 1));
  const cart = await readCart();
  const key = lineKey({ productId: product.id, sub, every });
  const existing = cart.items.find((i) => lineKey(i) === key);
  if (existing) existing.qty = Math.min(99, existing.qty + qty);
  else cart.items.push({ productId: product.id, qty, sub, every });
  await writeCart(cart);
  await trackLocal("add_to_cart", { sub, qty, type: product.type }, await sid(), product.id);
  refresh();
  return { ok: true as const, count: cart.items.reduce((s, i) => s + i.qty, 0) };
}

export async function setQty(key: string, qty: number) {
  const cart = await readCart();
  cart.items = cart.items
    .map((i) => (lineKey(i) === key ? { ...i, qty: Math.max(0, Math.min(99, qty)) } : i))
    .filter((i) => i.qty > 0);
  await writeCart(cart);
  refresh();
}

export async function removeLine(key: string) {
  const cart = await readCart();
  cart.items = cart.items.filter((i) => lineKey(i) !== key);
  await writeCart(cart);
  refresh();
}

/** Breytir línu í körfu í áskrift (every = 1/2/...) eða aftur í stakan kassa (every = null) */
export async function switchMode(key: string, every: number | null) {
  const cart = await readCart();
  const line = cart.items.find((i) => lineKey(i) === key);
  if (!line) return;
  const target = { productId: line.productId, sub: every !== null, every: every ?? 1 };
  const targetKey = lineKey(target);
  cart.items = cart.items.filter((i) => lineKey(i) !== key);
  const merge = cart.items.find((i) => lineKey(i) === targetKey);
  if (merge) merge.qty += line.qty;
  else cart.items.push({ ...target, qty: line.qty });
  await writeCart(cart);
  if (every !== null) await trackLocal("cart_converted_to_subscription", { every }, await sid(), line.productId);
  refresh();
}

export async function applyCode(code: string) {
  const cart = await readCart();
  cart.code = code.trim().toUpperCase();
  await writeCart(cart);
  const s = await summarize(cart);
  if (s.discountError) {
    cart.code = "";
    await writeCart(cart);
  }
  refresh();
  return { ok: !s.discountError, error: s.discountError };
}

export async function removeCode() {
  const cart = await readCart();
  cart.code = "";
  await writeCart(cart);
  refresh();
}
