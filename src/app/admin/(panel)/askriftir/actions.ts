"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { done, fail, str, int, dateOrNull, intOrNull } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { trackLocal } from "@/lib/analytics";
import { getSetting } from "@/lib/settings";
import { getNextDelivery } from "@/lib/catalog";
import { parseCsv } from "@/lib/admin-ops";
import { dateLong } from "@/lib/format";

const path = (id: string) => `/admin/askriftir/${id}`;

async function load(id: string) {
  const s = await db.subscription.findUnique({ where: { id }, include: { customer: true, product: true } });
  if (!s) fail("/admin/askriftir", "Áskrift fannst ekki.");
  return s;
}

function refresh(id: string) {
  revalidatePath("/admin/askriftir");
  revalidatePath(path(id));
  revalidatePath("/admin");
}

export async function toggleSkip(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const s = await load(id);
  await db.subscription.update({ where: { id }, data: { skipNext: !s.skipNext } });
  await logActivity("subscription", `${s.customer.name}: ${s.skipNext ? "hætt við að sleppa" : "sleppir"} næstu sendingu`, "info", { subscriptionId: id });
  refresh(id);
  done(path(id), s.skipNext ? "Áskriftin fær aftur kassa í næstu sendingu." : "Næstu sendingu verður sleppt. Áskriftin heldur svo áfram eins og venjulega.");
}

export async function pauseSubscription(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const until = dateOrNull(fd, "pausedUntil");
  const s = await load(id);
  await db.subscription.update({ where: { id }, data: { status: "PAUSED", pausedUntil: until } });
  await logActivity("subscription", `${s.customer.name}: áskrift sett í hlé${until ? ` til ${dateLong(until)}` : ""}`, "info", { subscriptionId: id });
  refresh(id);
  done(path(id), until ? `Áskriftin er í hléi til ${dateLong(until)} og fer sjálfkrafa aftur af stað eftir það.` : "Áskriftin er í hléi þar til þú setur hana aftur af stað.");
}

export async function resumeSubscription(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const s = await load(id);
  await db.subscription.update({ where: { id }, data: { status: "ACTIVE", pausedUntil: null, cancelledAt: null } });
  await logActivity("subscription", `${s.customer.name}: áskrift virk á ný`, "success", { subscriptionId: id });
  refresh(id);
  done(path(id), "Áskriftin er virk á ný.");
}

export async function updatePlan(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const s = await load(id);
  const productId = str(fd, "productId");
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.type !== "BOX") fail(path(id), "Veldu kassa.");
  const quantity = Math.min(20, Math.max(1, int(fd, "quantity", 1)));
  const every = Math.min(12, Math.max(1, int(fd, "everyNthDelivery", 1)));
  const def = await getSetting("subscription.defaultDiscountPct");
  const changedProduct = productId !== s.productId;
  const updatePrice = changedProduct || fd.get("updatePrice") === "on";
  const discountOverride = intOrNull(fd, "discountPct");
  await db.subscription.update({
    where: { id },
    data: {
      productId,
      quantity,
      everyNthDelivery: every,
      ...(updatePrice ? { unitPrice: product.price } : {}),
      discountPct: discountOverride !== null ? Math.min(90, Math.max(0, discountOverride)) : changedProduct ? product.subscriptionDiscountPct ?? def : s.discountPct,
    },
  });
  await logActivity("subscription", `${s.customer.name}: áskrift breytt (${product.name}, ${quantity} stk.)`, "info", { subscriptionId: id });
  refresh(id);
  done(path(id), "Áskriftinni var breytt.");
}

export async function updateSubDelivery(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const method = str(fd, "deliveryMethod");
  if (!["PIKKOLO", "HOME", "PICKUP"].includes(method)) fail(path(id), "Veldu afhendingarmáta.");
  await db.subscription.update({
    where: { id },
    data: {
      deliveryMethod: method,
      pikkoloStationId: str(fd, "pikkoloStationId"),
      pikkoloStationName: str(fd, "pikkoloStationName"),
      street: str(fd, "street"),
      postalCode: str(fd, "postalCode"),
      city: str(fd, "city"),
    },
  });
  refresh(id);
  done(path(id), "Afhending áskriftar vistuð. Hún gildir um næstu pantanir sem verða til úr áskriftinni.");
}

export async function setRepeatId(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  await db.subscription.update({ where: { id }, data: { repeatId: str(fd, "repeatId") } });
  refresh(id);
  done(path(id), "Repeat-auðkenni vistað.");
}

export async function cancelSubscription(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const s = await load(id);
  const reason = [str(fd, "reasonPreset"), str(fd, "reason")].filter(Boolean).join(": ");
  await db.subscription.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason, skipNext: false } });
  await trackLocal("subscription_cancelled", { reason, by: "admin" }, "", s.productId);
  await logActivity("subscription", `${s.customer.name}: áskrift sagt upp${reason ? ` (${reason})` : ""}`, "warning", { subscriptionId: id });
  refresh(id);
  done(path(id), "Áskriftinni var sagt upp. Engar nýjar pantanir verða til úr henni.");
}

async function upsertCustomer(email: string, name: string, phone: string) {
  const e = email.trim().toLowerCase();
  const existing = await db.customer.findUnique({ where: { email: e } });
  if (existing) {
    const patch: Record<string, string> = {};
    if (!existing.name && name) patch.name = name;
    if (!existing.phone && phone) patch.phone = phone;
    if (Object.keys(patch).length) await db.customer.update({ where: { id: existing.id }, data: patch });
    return { customer: existing, created: false };
  }
  return { customer: await db.customer.create({ data: { email: e, name, phone } }), created: true };
}

export async function createSubscription(fd: FormData) {
  await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("/admin/askriftir/ny", "Sláðu inn gilt netfang.");
  const product = await db.product.findUnique({ where: { id: str(fd, "productId") } });
  if (!product || product.type !== "BOX") fail("/admin/askriftir/ny", "Veldu kassa.");
  const { customer } = await upsertCustomer(email, str(fd, "name"), str(fd, "phone"));
  const def = await getSetting("subscription.defaultDiscountPct");
  const next = await getNextDelivery();
  const method = str(fd, "deliveryMethod") || "PIKKOLO";
  const s = await db.subscription.create({
    data: {
      customerId: customer.id,
      productId: product.id,
      quantity: Math.max(1, int(fd, "quantity", 1)),
      everyNthDelivery: Math.max(1, int(fd, "everyNthDelivery", 1)),
      unitPrice: product.price,
      discountPct: intOrNull(fd, "discountPct") ?? product.subscriptionDiscountPct ?? def,
      status: "ACTIVE",
      nextDeliveryDate: next?.date ?? null,
      deliveryMethod: method,
      pikkoloStationName: str(fd, "pikkoloStationName"),
      pikkoloStationId: str(fd, "pikkoloStationId"),
      street: str(fd, "street") || customer.street,
      postalCode: str(fd, "postalCode") || customer.postalCode,
      city: str(fd, "city") || customer.city,
      repeatId: str(fd, "repeatId"),
      source: "ADMIN",
    },
  });
  await logActivity("subscription", `Ný áskrift skráð í stjórnborði: ${customer.name || customer.email}`, "success", { subscriptionId: s.id });
  revalidatePath("/admin/askriftir");
  done(path(s.id), "Áskriftin var stofnuð. Hún fær pöntun þegar þú býrð til áskriftarpantanir fyrir næstu sendingu.");
}

export type ImportResult = { ok: boolean; created: number; updated: number; customersCreated: number; errors: { line: number; message: string }[]; message?: string };

function norm(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();
}

export async function importSubscriptions(_prev: ImportResult | null, fd: FormData): Promise<ImportResult> {
  await requireAdmin();
  const text = String(fd.get("csv") ?? "");
  const empty: ImportResult = { ok: false, created: 0, updated: 0, customersCreated: 0, errors: [] };
  if (!text.trim()) return { ...empty, message: "Engin gögn. Veldu skrá eða límdu inn texta." };
  const rows = parseCsv(text);
  if (rows.length && /netfang|email/i.test(rows[0][0] ?? "")) rows.shift();
  if (!rows.length) return { ...empty, message: "Engar línur fundust í skránni." };

  const boxes = await db.product.findMany({ where: { type: "BOX" } });
  const freqs = await getSetting("subscription.frequencies");
  const def = await getSetting("subscription.defaultDiscountPct");
  const next = await getNextDelivery();
  const result: ImportResult = { ok: true, created: 0, updated: 0, customersCreated: 0, errors: [] };

  const findBox = (v: string) => {
    const n = norm(v);
    return boxes.find((b) => norm(b.slug) === n || norm(b.name) === n) ?? boxes.find((b) => norm(b.name).includes(n) || (b.tier && norm(b.tier) === n));
  };
  const parseFreq = (v: string) => {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
    const f = freqs.find((x) => norm(x.label) === norm(v));
    if (f) return f.every;
    if (/annarr|2/.test(norm(v))) return 2;
    if (!v.trim() || /hverri|hver/.test(norm(v))) return 1;
    return null;
  };
  const parseStatus = (v: string) => {
    const n = norm(v);
    if (!n || n === "virk" || n === "active" || n === "virkur") return "ACTIVE";
    if (n.includes("hle") || n === "paused") return "PAUSED";
    if (n.includes("upp") || n === "cancelled" || n === "canceled" || n.includes("haett")) return "CANCELLED";
    return null;
  };

  for (const [i, r] of rows.entries()) {
    const line = i + 2;
    const [email = "", name = "", phone = "", box = "", freq = "", status = "", repeatId = ""] = r;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { result.errors.push({ line, message: `Ógilt netfang: "${email}"` }); continue; }
    const product = findBox(box);
    if (!product) { result.errors.push({ line, message: `Kassi fannst ekki: "${box}". Notaðu t.d. ${boxes.map((b) => b.slug).join(", ")}.` }); continue; }
    const every = parseFreq(freq);
    if (every === null) { result.errors.push({ line, message: `Óþekkt tíðni: "${freq}". Notaðu 1 eða 2.` }); continue; }
    const st = parseStatus(status);
    if (!st) { result.errors.push({ line, message: `Óþekkt staða: "${status}". Notaðu virk, í hléi eða sagt upp.` }); continue; }

    const { customer, created } = await upsertCustomer(email, name.trim(), phone.trim());
    if (created) result.customersCreated++;
    const existing = await db.subscription.findFirst({ where: { customerId: customer.id, productId: product.id, status: { not: "CANCELLED" } } });
    if (existing) {
      await db.subscription.update({
        where: { id: existing.id },
        data: { everyNthDelivery: every, status: st, ...(st === "CANCELLED" ? { cancelledAt: new Date(), cancelReason: "Innflutningur" } : {}), ...(repeatId ? { repeatId: repeatId.trim() } : {}) },
      });
      result.updated++;
    } else {
      await db.subscription.create({
        data: {
          customerId: customer.id,
          productId: product.id,
          everyNthDelivery: every,
          unitPrice: product.price,
          discountPct: product.subscriptionDiscountPct ?? def,
          status: st,
          nextDeliveryDate: next?.date ?? null,
          street: customer.street,
          postalCode: customer.postalCode,
          city: customer.city,
          repeatId: repeatId.trim(),
          source: "IMPORT",
          ...(st === "CANCELLED" ? { cancelledAt: new Date(), cancelReason: "Innflutningur" } : {}),
        },
      });
      result.created++;
    }
  }
  await logActivity("subscription", `Áskriftir fluttar inn: ${result.created} nýjar, ${result.updated} uppfærðar, ${result.errors.length} villur`, result.errors.length ? "warning" : "success");
  revalidatePath("/admin/askriftir");
  revalidatePath("/admin");
  return result;
}
