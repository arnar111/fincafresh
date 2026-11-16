import "server-only";
import { db } from "../db";
import { logActivity } from "../activity";
import { slugify, parseJsonList } from "../format";
import { nextOrderNumber } from "../orders";
import { setSetting } from "../settings";
import {
  wooFetch,
  wooFetchAll,
  WOO_STATUS_MAP,
  type WooCustomer,
  type WooOrder,
  type WooProduct,
} from "./woocommerce";

/**
 * Samstilling við WooCommerce (REST API v3).
 * Heimild: https://woocommerce.github.io/woocommerce-rest-api-docs/
 * Allt er "upsert": ef færsla er þegar til (sama wooId) er hún uppfærð, annars búin til.
 * Því er öruggt að keyra innflutning oftar en einu sinni.
 */

export type SyncResult = { created: number; updated: number; skipped: number; errors: string[] };
const empty = (): SyncResult => ({ created: 0, updated: 0, skipped: 0, errors: [] });

type WooCategory = { id: number; name: string; slug: string; menu_order?: number };
type WooOrderFull = WooOrder & {
  shipping_lines?: { method_id: string; method_title: string }[];
  line_items: (WooOrder["line_items"][number] & { total_tax?: string; variation_id?: number })[];
};

/** Fjarlægir HTML úr lýsingum frá WordPress og heldur málsgreinum */
export function stripHtml(html: string): string {
  return (html || "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&#8211;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function money(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "vara";
  let s = root;
  for (let i = 2; i < 500; i++) {
    const hit = await db.product.findUnique({ where: { slug: s } });
    if (!hit || hit.id === ignoreId) return s;
    s = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

// ── Flokkar ────────────────────────────────────────────────────
export async function upsertWooCategory(c: WooCategory) {
  const byWoo = await db.category.findUnique({ where: { wooId: c.id } });
  if (byWoo) {
    await db.category.update({ where: { id: byWoo.id }, data: { name: stripHtml(c.name) } });
    return { id: byWoo.id, created: false };
  }
  const bySlug = await db.category.findUnique({ where: { slug: c.slug } });
  if (bySlug) {
    await db.category.update({ where: { id: bySlug.id }, data: { wooId: c.id } });
    return { id: bySlug.id, created: false };
  }
  const created = await db.category.create({ data: { name: stripHtml(c.name), slug: c.slug || slugify(c.name), wooId: c.id, sortOrder: c.menu_order ?? 99 } });
  return { id: created.id, created: true };
}

export async function importCategories(): Promise<SyncResult> {
  const r = empty();
  const cats = await wooFetchAll<WooCategory>("/products/categories");
  for (const c of cats) {
    if (c.slug === "uncategorized" || c.slug === "ekki-flokkad") { r.skipped++; continue; }
    try {
      const res = await upsertWooCategory(c);
      res.created ? r.created++ : r.updated++;
    } catch (e) {
      r.errors.push(`Flokkur ${c.name}: ${(e as Error).message}`);
    }
  }
  return r;
}

// ── Vörur ──────────────────────────────────────────────────────
export async function upsertWooProduct(p: WooProduct): Promise<"created" | "updated"> {
  const existing =
    (await db.product.findUnique({ where: { wooId: p.id } })) ??
    (p.sku ? await db.product.findFirst({ where: { sku: p.sku, wooId: null } }) : null) ??
    (p.slug ? await db.product.findFirst({ where: { slug: p.slug, wooId: null } }) : null);

  const regular = money(p.regular_price);
  const current = money(p.price) || regular;
  const compareAt = regular > current ? regular : null;
  let categoryId: string | null | undefined = undefined;
  if (p.categories?.length) {
    const c = p.categories[0];
    categoryId = (await upsertWooCategory({ id: c.id, name: c.name, slug: c.slug })).id;
  }
  const images = (p.images ?? []).map((i) => i.src).filter(Boolean);

  const data = {
    wooId: p.id,
    name: stripHtml(p.name),
    sku: p.sku || existing?.sku || "",
    price: current,
    compareAtPrice: compareAt,
    shortDescription: stripHtml(p.short_description) || existing?.shortDescription || "",
    description: stripHtml(p.description) || existing?.description || "",
    trackStock: !!p.manage_stock,
    stock: p.manage_stock ? p.stock_quantity ?? 0 : null,
    active: p.status === "publish",
    ...(images.length ? { images: JSON.stringify(images) } : {}),
    ...(categoryId !== undefined ? { categoryId } : {}),
  };

  if (existing) {
    await db.product.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await db.product.create({
    data: { ...data, slug: await uniqueSlug(p.slug || p.name), type: "ITEM", images: JSON.stringify(images) },
  });
  return "created";
}

export async function importProducts(): Promise<SyncResult> {
  const r = empty();
  const products = await wooFetchAll<WooProduct>("/products", { status: "any" });
  for (const p of products) {
    if (p.status === "trash") { r.skipped++; continue; }
    try {
      (await upsertWooProduct(p)) === "created" ? r.created++ : r.updated++;
    } catch (e) {
      r.errors.push(`Vara ${p.name}: ${(e as Error).message}`);
    }
  }
  return r;
}

// ── Viðskiptavinir ─────────────────────────────────────────────
export async function upsertWooCustomer(c: WooCustomer): Promise<"created" | "updated" | "skipped"> {
  const email = (c.email || "").trim().toLowerCase();
  if (!email) return "skipped";
  const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
  const existing = (await db.customer.findUnique({ where: { wooId: c.id } })) ?? (await db.customer.findUnique({ where: { email } }));
  const data = {
    wooId: c.id,
    email,
    ...(name ? { name } : {}),
    ...(c.billing?.phone ? { phone: c.billing.phone } : {}),
    ...(c.billing?.address_1 ? { street: c.billing.address_1 } : {}),
    ...(c.billing?.postcode ? { postalCode: c.billing.postcode } : {}),
    ...(c.billing?.city ? { city: c.billing.city } : {}),
  };
  if (existing) {
    // Ef annar viðskiptavinur er þegar tengdur þessu wooId sleppum við því að færa það
    const clash = await db.customer.findUnique({ where: { wooId: c.id } });
    const safe = clash && clash.id !== existing.id ? { ...data, wooId: undefined } : data;
    await db.customer.update({ where: { id: existing.id }, data: safe });
    return "updated";
  }
  await db.customer.create({ data });
  return "created";
}

export async function importCustomers(): Promise<SyncResult> {
  const r = empty();
  const customers = await wooFetchAll<WooCustomer>("/customers", { role: "all" });
  for (const c of customers) {
    try {
      const res = await upsertWooCustomer(c);
      if (res === "created") r.created++;
      else if (res === "updated") r.updated++;
      else r.skipped++;
    } catch (e) {
      r.errors.push(`Viðskiptavinur ${c.email}: ${(e as Error).message}`);
    }
  }
  return r;
}

// ── Pantanir ───────────────────────────────────────────────────
function paymentStatusFor(wooStatus: string) {
  if (wooStatus === "processing" || wooStatus === "completed") return "PAID";
  if (wooStatus === "refunded") return "REFUNDED";
  if (wooStatus === "failed") return "FAILED";
  return "UNPAID";
}

function deliveryMethodFor(o: WooOrderFull): "PIKKOLO" | "HOME" | "PICKUP" {
  const t = (o.shipping_lines ?? []).map((s) => `${s.method_id} ${s.method_title}`).join(" ").toLowerCase();
  if (t.includes("pikkol")) return "PIKKOLO";
  if (t.includes("local_pickup") || t.includes("sækja") || t.includes("saekja") || t.includes("pickup")) return "PICKUP";
  return "HOME";
}

export async function upsertWooOrder(o: WooOrderFull): Promise<"created" | "updated" | "skipped"> {
  const email = (o.billing?.email || "").trim().toLowerCase();
  if (!email) return "skipped";
  const name = `${o.billing?.first_name ?? ""} ${o.billing?.last_name ?? ""}`.trim() || email;

  // Viðskiptavinur: eftir wooId, svo netfangi; annars búinn til (gestapantanir líka)
  let customer =
    (o.customer_id ? await db.customer.findUnique({ where: { wooId: o.customer_id } }) : null) ??
    (await db.customer.findUnique({ where: { email } }));
  if (!customer) {
    customer = await db.customer.create({
      data: {
        email,
        name,
        phone: o.billing?.phone ?? "",
        street: o.shipping?.address_1 || o.billing?.address_1 || "",
        postalCode: o.shipping?.postcode || o.billing?.postcode || "",
        city: o.shipping?.city || o.billing?.city || "",
        ...(o.customer_id ? { wooId: o.customer_id } : {}),
      },
    });
  }

  // Vörulínur: tengjum við okkar vörur eftir wooId, annars SKU
  const items = [];
  for (const li of o.line_items ?? []) {
    const product =
      (li.product_id ? await db.product.findUnique({ where: { wooId: li.product_id } }) : null) ??
      (li.sku ? await db.product.findFirst({ where: { sku: li.sku } }) : null);
    const qty = Math.max(1, li.quantity || 1);
    const lineTotal = money(li.total) + money(li.total_tax);
    items.push({
      productId: product?.id ?? null,
      name: stripHtml(li.name),
      sku: li.sku ?? "",
      unitPrice: lineTotal ? Math.round(lineTotal / qty) : money(li.price),
      quantity: qty,
      isSubscription: false,
    });
  }

  const total = money(o.total);
  const shipping = money(o.shipping_total);
  const discount = money(o.discount_total);
  const base = {
    customerId: customer.id,
    email,
    name,
    phone: o.billing?.phone ?? "",
    street: o.shipping?.address_1 || o.billing?.address_1 || "",
    postalCode: o.shipping?.postcode || o.billing?.postcode || "",
    city: o.shipping?.city || o.billing?.city || "",
    status: WOO_STATUS_MAP[o.status] ?? "NEW",
    paymentStatus: paymentStatusFor(o.status),
    paymentMethod: o.payment_method_title || "WooCommerce",
    subtotal: Math.max(0, total - shipping + discount),
    discount,
    shipping,
    total,
    discountCode: (o.coupon_lines ?? []).map((c) => c.code.toUpperCase()).join(", "),
    deliveryMethod: deliveryMethodFor(o),
    customerNote: o.customer_note ?? "",
    source: "WOO",
  };

  const existing = await db.order.findUnique({ where: { wooId: o.id } });
  if (existing) {
    await db.$transaction([
      db.order.update({ where: { id: existing.id }, data: base }),
      db.orderItem.deleteMany({ where: { orderId: existing.id } }),
      db.orderItem.createMany({ data: items.map((i) => ({ ...i, orderId: existing.id })) }),
    ]);
    return "updated";
  }

  // Pöntunarnúmer: notum númerið úr WooCommerce ef það er laust, annars næsta lausa
  const wooNumber = Number(o.number);
  const taken = Number.isInteger(wooNumber) && wooNumber > 0 ? await db.order.findUnique({ where: { number: wooNumber } }) : true;
  const number = !taken ? wooNumber : await nextOrderNumber();
  await db.order.create({
    data: {
      ...base,
      number,
      wooId: o.id,
      createdAt: o.date_created_gmt ? new Date(o.date_created_gmt + "Z") : new Date(),
      items: { create: items },
    },
  });
  return "created";
}

export async function importOrders(afterIso?: string): Promise<SyncResult> {
  const r = empty();
  const orders = await wooFetchAll<WooOrderFull>("/orders", afterIso ? { after: afterIso, orderby: "date", order: "asc" } : { orderby: "date", order: "asc" });
  for (const o of orders) {
    try {
      const res = await upsertWooOrder(o);
      if (res === "created") r.created++;
      else if (res === "updated") r.updated++;
      else r.skipped++;
    } catch (e) {
      r.errors.push(`Pöntun #${o.number}: ${(e as Error).message}`);
    }
  }
  return r;
}

/** Sækir allt í réttri röð: flokkar → vörur → viðskiptavinir → pantanir */
export async function importEverything(afterIso?: string) {
  const categories = await importCategories();
  const products = await importProducts();
  const customers = await importCustomers();
  const orders = await importOrders(afterIso);
  await setSetting("woo.lastSync", new Date().toISOString());
  const fmt = (n: string, x: SyncResult) => `${n}: ${x.created} nýjar, ${x.updated} uppfærðar${x.errors.length ? `, ${x.errors.length} villur` : ""}`;
  await logActivity(
    "integration",
    `WooCommerce innflutningur. ${fmt("Flokkar", categories)}. ${fmt("Vörur", products)}. ${fmt("Viðskiptavinir", customers)}. ${fmt("Pantanir", orders)}.`,
    [categories, products, customers, orders].some((x) => x.errors.length) ? "warning" : "success"
  );
  return { categories, products, customers, orders };
}

// ── Senda vöru til WooCommerce ─────────────────────────────────
export async function pushProductToWoo(productId: string) {
  const p = await db.product.findUnique({ where: { id: productId } });
  if (!p) throw new Error("Vara fannst ekki");
  const regular = p.compareAtPrice && p.compareAtPrice > p.price ? p.compareAtPrice : p.price;
  const body: Record<string, unknown> = {
    name: p.name,
    regular_price: String(regular),
    sale_price: p.compareAtPrice && p.compareAtPrice > p.price ? String(p.price) : "",
    manage_stock: p.trackStock,
    ...(p.trackStock ? { stock_quantity: p.stock ?? 0 } : {}),
    status: p.active ? "publish" : "draft",
    ...(p.sku ? { sku: p.sku } : {}),
  };
  if (p.wooId) {
    await wooFetch(`/products/${p.wooId}`, { method: "PUT", body });
    await logActivity("integration", `Vara "${p.name}" uppfærð í WooCommerce`, "success");
    return { created: false };
  }
  // Ný vara í WooCommerce. Myndir eru aðeins sendar ef slóðin er opinber (ekki localhost).
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const publicImages = site && !/localhost|127\.0\.0\.1/.test(site)
    ? parseJsonList(p.images).map((src) => ({ src: src.startsWith("http") ? src : site + src }))
    : [];
  const { data } = await wooFetch<{ id: number }>("/products", {
    method: "POST",
    body: { ...body, type: "simple", short_description: p.shortDescription, description: p.description, images: publicImages },
  });
  await db.product.update({ where: { id: p.id }, data: { wooId: data.id } });
  await logActivity("integration", `Vara "${p.name}" búin til í WooCommerce`, "success");
  return { created: true };
}
