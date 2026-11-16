"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkPassword, getCustomer, hashPassword, logoutCustomer, requireCustomer, startCustomerSession } from "@/lib/auth";
import { sendLoginLink } from "@/lib/login-link";
import { logActivity } from "@/lib/activity";
import { trackLocal } from "@/lib/analytics";
import { getSetting } from "@/lib/settings";
import { getNextDelivery } from "@/lib/catalog";
import { readSubgenLedger, writeSubgenLedger, SKIPPED_BY_CUSTOMER } from "@/lib/subscriptions";

export type AccountState = { ok: boolean; message: string } | null;

export async function login(_: AccountState, fd: FormData): Promise<AccountState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const c = await db.customer.findUnique({ where: { email } });
  if (!c?.passwordHash || !(await checkPassword(password, c.passwordHash))) {
    return { ok: false, message: "Rangt netfang eða lykilorð. Þú getur líka fengið innskráningartengil í tölvupósti." };
  }
  await startCustomerSession(c.id);
  redirect("/minar-sidur");
}

export async function register(_: AccountState, fd: FormData): Promise<AccountState> {
  const parsed = z
    .object({ name: z.string().trim().min(2, "Skrifaðu nafnið þitt"), email: z.string().trim().email("Netfangið virðist ekki rétt"), password: z.string().min(8, "Lykilorðið þarf að vera a.m.k. 8 stafir") })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const email = parsed.data.email.toLowerCase();
  const existing = await db.customer.findUnique({ where: { email } });
  if (existing) {
    // Öryggi: aðgangur sem er þegar til (t.d. úr WooCommerce eða fyrri pöntun) er aldrei tekinn yfir
    // hér. Eigandinn fær innskráningartengil og getur sett lykilorð á Mínum síðum.
    await sendLoginLink(existing, "Það er þegar til aðgangur með þessu netfangi. Smelltu á hnappinn til að skrá þig inn; þar getur þú líka sett lykilorð.");
    return { ok: true, message: "Takk! Við sendum innskráningartengil á netfangið. Opnaðu hann til að skrá þig inn." };
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const c = await db.customer.create({ data: { email, name: parsed.data.name, passwordHash } });
  await startCustomerSession(c.id);
  redirect("/minar-sidur");
}

export async function requestMagicLink(_: AccountState, fd: FormData): Promise<AccountState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const generic: AccountState = { ok: true, message: "Ef netfangið er skráð hjá okkur færðu tölvupóst með innskráningartengli eftir smá stund. Tengillinn gildir í 30 mínútur." };
  if (!z.string().email().safeParse(email).success) return { ok: false, message: "Netfangið virðist ekki rétt." };
  const c = await db.customer.findUnique({ where: { email } });
  if (!c) return generic;
  await sendLoginLink(c);
  return generic;
}

/** Setja eða breyta lykilorði (innskráður viðskiptavinur). Ef lykilorð er þegar til þarf það núverandi. */
export async function setPassword(_: AccountState, fd: FormData): Promise<AccountState> {
  const c = await requireCustomer();
  const current = String(fd.get("current") ?? "");
  const pw = String(fd.get("password") ?? "");
  if (c.passwordHash && !(await checkPassword(current, c.passwordHash))) return { ok: false, message: "Núverandi lykilorð er rangt." };
  if (pw.length < 8) return { ok: false, message: "Lykilorðið þarf að vera a.m.k. 8 stafir." };
  if (pw !== String(fd.get("confirm") ?? "")) return { ok: false, message: "Lykilorðin stemma ekki." };
  await db.customer.update({ where: { id: c.id }, data: { passwordHash: await hashPassword(pw) } });
  revalidatePath("/minar-sidur");
  return { ok: true, message: c.passwordHash ? "Lykilorðinu var breytt." : "Lykilorð vistað. Nú getur þú líka skráð þig inn með því." };
}

export async function logout() {
  await logoutCustomer();
  redirect("/");
}

export async function updateDetails(_: AccountState, fd: FormData): Promise<AccountState> {
  const c = await requireCustomer();
  const data = {
    name: String(fd.get("name") ?? "").trim(),
    phone: String(fd.get("phone") ?? "").trim(),
    street: String(fd.get("street") ?? "").trim(),
    postalCode: String(fd.get("postalCode") ?? "").trim(),
    city: String(fd.get("city") ?? "").trim(),
    marketingOptIn: fd.get("marketing") === "on",
  };
  if (data.name.length < 2) return { ok: false, message: "Nafn vantar." };
  await db.customer.update({ where: { id: c.id }, data });
  revalidatePath("/minar-sidur");
  return { ok: true, message: "Upplýsingarnar hafa verið vistaðar." };
}

// ── Áskrift ──────────────────────────────────────────────────
async function ownSub(id: string) {
  const c = await getCustomer();
  if (!c) redirect("/minar-sidur/innskraning");
  const s = await db.subscription.findUnique({ where: { id }, include: { product: true } });
  if (!s || s.customerId !== c.id) throw new Error("Áskrift fannst ekki");
  return { c, s };
}

function done() {
  revalidatePath("/minar-sidur");
}

/**
 * Sleppa næstu sendingu.
 * - Ef ógreidd áskriftarpöntun er þegar til fyrir næstu sendingu er henni hætt (og hún skráð í
 *   afgreiðsluskrá sendingarinnar svo hún verði ekki búin til aftur).
 * - Ef kassinn í næstu sendingu er þegar greiddur eða í vinnslu gildir "sleppa" um sendinguna þar á eftir.
 * - Annars er merkt við að næstu sendingu sé sleppt.
 */
export async function skipNext(id: string, skip: boolean) {
  const { c, s } = await ownSub(id);
  const next = await getNextDelivery();
  const orders = next
    ? await db.order.findMany({
        where: {
          deliveryId: next.id,
          OR: [{ subscriptionId: s.id }, { customerId: s.customerId, items: { some: { productId: s.productId, isSubscription: true } } }],
        },
      })
    : [];
  const active = orders.filter((o) => o.status !== "CANCELLED");
  const cancellable = (o: (typeof orders)[number]) => o.status === "NEW" && o.source === "SUBSCRIPTION" && o.paymentStatus === "UNPAID";

  if (skip) {
    if (next && active.length && active.every(cancellable)) {
      // Ógreiddum áskriftarpöntunum í næstu sendingu er hætt og þær skráðar svo þær verði ekki búnar til aftur
      const ledger = await readSubgenLedger(next.id);
      ledger.add(s.id);
      await db.$transaction([
        db.order.updateMany({ where: { id: { in: active.map((o) => o.id) } }, data: { status: "CANCELLED", internalNote: SKIPPED_BY_CUSTOMER } }),
        writeSubgenLedger(next.id, ledger),
      ]);
    } else {
      // Engin pöntun ennþá (sleppir næstu sendingu) eða kassinn þegar greiddur/í vinnslu (sleppir þeirri á eftir)
      await db.subscription.update({ where: { id }, data: { skipNext: true } });
    }
  } else {
    // Afturkalla: endurvekja pantanir sem var hætt við vegna "sleppa" og taka merkið af
    const restore = orders.filter((o) => o.status === "CANCELLED" && o.internalNote === SKIPPED_BY_CUSTOMER);
    if (next && restore.length) {
      const ledger = await readSubgenLedger(next.id);
      ledger.delete(s.id);
      await db.$transaction([
        db.order.updateMany({ where: { id: { in: restore.map((o) => o.id) } }, data: { status: "NEW", internalNote: "" } }),
        writeSubgenLedger(next.id, ledger),
      ]);
    }
    await db.subscription.update({ where: { id }, data: { skipNext: false } });
  }
  await logActivity("subscription", `${c.name || c.email} ${skip ? "sleppir sendingu" : "hætti við að sleppa sendingu"} (${s.product.name})`, "info", { subscriptionId: id });
  done();
}

export async function pauseSub(id: string, weeks: number) {
  const { c, s } = await ownSub(id);
  const until = new Date();
  until.setDate(until.getDate() + Math.max(1, Math.min(26, weeks)) * 7);
  await db.subscription.update({ where: { id }, data: { status: "PAUSED", pausedUntil: until } });
  await logActivity("subscription", `${c.name || c.email} gerði hlé á áskrift (${s.product.name}) í ${weeks} vikur`, "warning", { subscriptionId: id });
  done();
}

export async function resumeSub(id: string) {
  const { c, s } = await ownSub(id);
  await db.subscription.update({ where: { id }, data: { status: "ACTIVE", pausedUntil: null } });
  await logActivity("subscription", `${c.name || c.email} hélt áfram með áskrift (${s.product.name})`, "success", { subscriptionId: id });
  done();
}

export async function changeBox(id: string, productId: string) {
  const { c, s } = await ownSub(id);
  const p = await db.product.findUnique({ where: { id: productId } });
  if (!p || p.type !== "BOX" || !p.active) throw new Error("Kassi fannst ekki");
  const def = await getSetting("subscription.defaultDiscountPct");
  await db.subscription.update({ where: { id }, data: { productId: p.id, unitPrice: p.price, discountPct: p.subscriptionDiscountPct ?? def } });
  await logActivity("subscription", `${c.name || c.email} skipti úr ${s.product.name} í ${p.name}`, "info", { subscriptionId: id });
  done();
}

export async function changeFrequency(id: string, every: number) {
  const { c } = await ownSub(id);
  await db.subscription.update({ where: { id }, data: { everyNthDelivery: Math.max(1, Math.min(12, every)) } });
  await logActivity("subscription", `${c.name || c.email} breytti tíðni áskriftar`, "info", { subscriptionId: id });
  done();
}

export async function changeQty(id: string, qty: number) {
  await ownSub(id);
  await db.subscription.update({ where: { id }, data: { quantity: Math.max(1, Math.min(10, qty)) } });
  done();
}

export async function cancelSub(id: string, reason: string) {
  const { c, s } = await ownSub(id);
  await db.subscription.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason.slice(0, 300), cancelledAt: new Date() } });
  await logActivity("subscription", `${c.name || c.email} sagði upp áskrift (${s.product.name}). Ástæða: ${reason || "ekki gefin"}`, "warning", { subscriptionId: id });
  await trackLocal("subscription_cancelled", { reason }, "", s.productId);
  done();
}

export async function retentionSaved(id: string, choice: string) {
  const { s } = await ownSub(id);
  await trackLocal("subscription_cancel_prevented", { choice }, "", s.productId);
}

export async function reactivateSub(id: string) {
  const { c, s } = await ownSub(id);
  await db.subscription.update({ where: { id }, data: { status: "ACTIVE", cancelReason: "", cancelledAt: null, pausedUntil: null } });
  await logActivity("subscription", `${c.name || c.email} endurvakti áskrift (${s.product.name})`, "success", { subscriptionId: id });
  done();
}
