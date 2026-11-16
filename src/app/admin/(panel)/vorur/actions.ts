"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bool, done, fail, int, intOrNull, str } from "@/lib/admin";
import { slugify } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { pushProductToWoo } from "@/lib/integrations/woo-sync";
import { wooConfig } from "@/lib/integrations/woocommerce";

function parseList(raw: string): string[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function uniqueSlug(base: string, ignoreId?: string) {
  const root = slugify(base) || "vara";
  let s = root;
  for (let i = 2; i < 500; i++) {
    const hit = await db.product.findUnique({ where: { slug: s } });
    if (!hit || hit.id === ignoreId) return s;
    s = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

function refresh(id?: string) {
  revalidatePath("/admin/vorur");
  if (id) revalidatePath(`/admin/vorur/${id}`);
  revalidatePath("/", "layout");
}

export async function saveProduct(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id") || undefined;
  const back = id ? `/admin/vorur/${id}` : "/admin/vorur/ny";
  const name = str(fd, "name");
  const price = int(fd, "price", -1);
  if (!name) fail(back, "Varan þarf að hafa nafn.");
  if (price <= 0) fail(back, "Verð þarf að vera hærra en 0 kr.");
  const type = str(fd, "type") === "BOX" ? "BOX" : "ITEM";
  const compareAt = intOrNull(fd, "compareAtPrice");
  const subPct = intOrNull(fd, "subscriptionDiscountPct");
  if (subPct !== null && (subPct < 0 || subPct > 90)) fail(back, "Áskriftarafsláttur þarf að vera á bilinu 0 til 90%.");
  const trackStock = bool(fd, "trackStock");
  const categoryId = str(fd, "categoryId") || null;

  const data = {
    name,
    slug: await uniqueSlug(str(fd, "slug") || name, id),
    sku: str(fd, "sku"),
    type,
    tier: type === "BOX" ? str(fd, "tier") || null : null,
    tagline: str(fd, "tagline"),
    shortDescription: str(fd, "shortDescription"),
    description: str(fd, "description"),
    features: JSON.stringify(parseList(str(fd, "features"))),
    images: JSON.stringify(parseList(str(fd, "images"))),
    price,
    compareAtPrice: compareAt && compareAt > price ? compareAt : null,
    subscriptionDiscountPct: type === "BOX" ? subPct : null,
    weightLabel: str(fd, "weightLabel"),
    suitsFor: str(fd, "suitsFor"),
    storageType: ["Refrigerated", "Frozen", "Ambient"].includes(str(fd, "storageType")) ? str(fd, "storageType") : "Refrigerated",
    trackStock,
    stock: trackStock ? int(fd, "stock", 0) : null,
    active: bool(fd, "active"),
    featured: bool(fd, "featured"),
    sortOrder: int(fd, "sortOrder", 0),
    syncToWoo: bool(fd, "syncToWoo"),
    categoryId,
  };

  let productId = id;
  if (id) {
    await db.product.update({ where: { id }, data });
  } else {
    const created = await db.product.create({ data });
    productId = created.id;
  }
  await logActivity("product", `Vara ${id ? "uppfærð" : "búin til"}: ${name}`, "success", { productId });

  // Samstilling við WooCommerce ef hakað er við það
  let wooMsg = "";
  if (data.syncToWoo && (await wooConfig()).configured) {
    try {
      await pushProductToWoo(productId!);
      wooMsg = " og uppfærð í WooCommerce";
    } catch (e) {
      refresh(productId);
      fail(`/admin/vorur/${productId}`, `Varan var vistuð, en WooCommerce svaraði með villu: ${(e as Error).message}`);
    }
  }
  refresh(productId);
  done(`/admin/vorur/${productId}`, `Varan "${name}" var vistuð${wooMsg}.`);
}

export async function toggleProductActive(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const p = await db.product.findUnique({ where: { id } });
  if (!p) fail("/admin/vorur", "Vara fannst ekki.");
  await db.product.update({ where: { id }, data: { active: !p.active } });
  refresh(id);
  done(str(fd, "back") || "/admin/vorur", p.active ? `"${p.name}" er nú falin í versluninni.` : `"${p.name}" er nú sýnileg í versluninni.`);
}

export async function deleteProduct(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const p = await db.product.findUnique({ where: { id }, include: { _count: { select: { subscriptions: true, orderItems: true } } } });
  if (!p) fail("/admin/vorur", "Vara fannst ekki.");
  if (p._count.subscriptions > 0) {
    fail(`/admin/vorur/${id}`, `Ekki hægt að eyða "${p.name}" því ${p._count.subscriptions} áskrift(ir) tengjast henni. Feldu hana frekar (taktu hakið úr "Sýnileg").`);
  }
  await db.product.delete({ where: { id } });
  await logActivity("product", `Vöru eytt: ${p.name}`, "warning");
  refresh();
  done("/admin/vorur", `"${p.name}" var eytt. Eldri pantanir halda nafni vörunnar.`);
}

export async function addPin(fd: FormData) {
  await requireAdmin();
  const productId = str(fd, "productId");
  const rec = str(fd, "recommendedProductId");
  const back = str(fd, "back") || `/admin/vorur/${productId}`;
  if (!rec || rec === productId) fail(back, "Veldu aðra vöru til að mæla með.");
  const count = await db.recommendationPin.count({ where: { productId } });
  await db.recommendationPin.upsert({
    where: { productId_recommendedProductId: { productId, recommendedProductId: rec } },
    create: { productId, recommendedProductId: rec, sortOrder: count },
    update: {},
  });
  refresh(productId);
  revalidatePath("/admin/greining");
  done(back, "Meðmælin voru fest. Þau birtast nú fyrst undir „Passar vel með“.");
}

export async function removePin(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "pinId");
  const pin = await db.recommendationPin.findUnique({ where: { id } });
  if (pin) await db.recommendationPin.delete({ where: { id } });
  refresh(pin?.productId);
  done(str(fd, "back") || "/admin/vorur", "Meðmælin voru fjarlægð.");
}

export async function pushToWoo(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  try {
    const r = await pushProductToWoo(id);
    revalidatePath(`/admin/vorur/${id}`);
    done(`/admin/vorur/${id}`, r.created ? "Varan var búin til í WooCommerce." : "Verð og birgðir voru uppfærð í WooCommerce.");
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    fail(`/admin/vorur/${id}`, (e as Error).message);
  }
}

// ── Flokkar ────────────────────────────────────────────────────
export async function saveCategory(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  if (!name) fail("/admin/vorur/flokkar", "Flokkurinn þarf að hafa nafn.");
  const base = slugify(str(fd, "slug") || name) || "flokkur";
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await db.category.findUnique({ where: { slug } });
    if (!hit || hit.id === id) break;
    slug = `${base}-${i}`;
  }
  if (id) await db.category.update({ where: { id }, data: { name, slug, sortOrder: int(fd, "sortOrder", 0) } });
  else await db.category.create({ data: { name, slug, sortOrder: (await db.category.count()) + 1 } });
  revalidatePath("/admin/vorur/flokkar");
  revalidatePath("/", "layout");
  done("/admin/vorur/flokkar", `Flokkurinn "${name}" var vistaður.`);
}

export async function deleteCategory(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const c = await db.category.findUnique({ where: { id } });
  if (!c) fail("/admin/vorur/flokkar", "Flokkur fannst ekki.");
  await db.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await db.category.delete({ where: { id } });
  revalidatePath("/admin/vorur/flokkar");
  revalidatePath("/", "layout");
  done("/admin/vorur/flokkar", `Flokknum "${c.name}" var eytt. Vörurnar í honum eru nú óflokkaðar.`);
}
