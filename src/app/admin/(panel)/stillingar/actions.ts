"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, hashPassword, checkPassword } from "@/lib/auth";
import { bool, done, fail, int, intOrNull, str } from "@/lib/admin";
import { getSetting, setSetting, type Frequency, type ShippingMethod } from "@/lib/settings";
import { logActivity } from "@/lib/activity";
import { deleteDemo } from "./demo";

const P = "/admin/stillingar";

export async function saveShipping(fd: FormData) {
  await requireAdmin();
  const current = await getSetting("shipping.methods");
  const next: ShippingMethod[] = current.map((m) => ({
    ...m,
    label: str(fd, `${m.id}.label`) || m.label,
    description: str(fd, `${m.id}.description`),
    price: Math.max(0, int(fd, `${m.id}.price`, 0)),
    freeOver: intOrNull(fd, `${m.id}.freeOver`),
    enabled: bool(fd, `${m.id}.enabled`),
  }));
  if (!next.some((m) => m.enabled)) fail(`${P}#sending`, "Að minnsta kosti einn afhendingarmáti þarf að vera virkur.");
  await setSetting("shipping.methods", next);
  await setSetting("shipping.pricesConfirmed", bool(fd, "pricesConfirmed"));
  await logActivity("system", "Afhendingarmátar og sendingarverð uppfærð", "success");
  revalidatePath(P);
  revalidatePath("/", "layout");
  done(`${P}#sending`, "Afhendingarmátar vistaðir.");
}

export async function saveSubscription(fd: FormData) {
  await requireAdmin();
  const pct = int(fd, "defaultDiscountPct", -1);
  if (pct < 0 || pct > 90) fail(`${P}#askrift`, "Afslátturinn þarf að vera á bilinu 0 til 90%.");
  let freqs: Frequency[] = [];
  try {
    freqs = (JSON.parse(str(fd, "frequencies")) as Frequency[])
      .map((f) => ({ every: Math.round(Number(f.every)), label: String(f.label ?? "").trim() }))
      .filter((f) => f.every >= 1 && f.every <= 12 && f.label);
  } catch {
    fail(`${P}#askrift`, "Tókst ekki að lesa tíðnina.");
  }
  if (!freqs.length) fail(`${P}#askrift`, "Það þarf að vera að minnsta kosti einn tíðnimöguleiki.");
  const seen = new Set<number>();
  freqs = freqs.filter((f) => (seen.has(f.every) ? false : (seen.add(f.every), true))).sort((a, b) => a.every - b.every);
  await setSetting("subscription.defaultDiscountPct", pct);
  await setSetting("subscription.frequencies", freqs);
  await logActivity("system", "Áskriftarstillingar uppfærðar", "success");
  revalidatePath(P);
  revalidatePath("/", "layout");
  done(`${P}#askrift`, "Áskriftarstillingar vistaðar.");
}

export async function saveUpsell(fd: FormData) {
  await requireAdmin();
  await setSetting("upsell.enabled", bool(fd, "enabled"));
  await setSetting("upsell.title", str(fd, "title") || "Bíddu aðeins! Viltu spara?");
  await setSetting("upsell.body", str(fd, "body"));
  revalidatePath(P);
  revalidatePath("/", "layout");
  done(`${P}#upsala`, "Stillingar áskriftargluggans vistaðar.");
}

export async function changePassword(fd: FormData) {
  const me = await requireAdmin();
  const user = await db.adminUser.findUnique({ where: { id: me.id } });
  if (!user || !(await checkPassword(str(fd, "current"), user.passwordHash))) fail(`${P}#adgangur`, "Núverandi lykilorð er rangt.");
  const pw = String(fd.get("password") ?? "");
  if (pw.length < 8) fail(`${P}#adgangur`, "Nýja lykilorðið þarf að vera a.m.k. 8 stafir.");
  if (pw !== String(fd.get("confirm") ?? "")) fail(`${P}#adgangur`, "Lykilorðin stemma ekki.");
  await db.adminUser.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(pw) } });
  await logActivity("system", `${me.email} breytti lykilorðinu sínu`, "info");
  done(`${P}#adgangur`, "Lykilorðinu var breytt.");
}

export async function addAdmin(fd: FormData) {
  await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name");
  const pw = String(fd.get("password") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(`${P}#adgangur`, "Netfangið er ekki gilt.");
  if (pw.length < 8) fail(`${P}#adgangur`, "Lykilorðið þarf að vera a.m.k. 8 stafir.");
  if (await db.adminUser.findUnique({ where: { email } })) fail(`${P}#adgangur`, "Stjórnandi með þetta netfang er þegar til.");
  await db.adminUser.create({ data: { email, name: name || email, passwordHash: await hashPassword(pw) } });
  await logActivity("system", `Nýr stjórnandi: ${email}`, "success");
  revalidatePath(P);
  done(`${P}#adgangur`, `${email} getur nú skráð sig inn í stjórnborðið.`);
}

export async function removeAdmin(fd: FormData) {
  const me = await requireAdmin();
  const id = str(fd, "id");
  if (id === me.id) fail(`${P}#adgangur`, "Þú getur ekki fjarlægt sjálfa(n) þig.");
  const u = await db.adminUser.findUnique({ where: { id } });
  if (!u) fail(`${P}#adgangur`, "Stjórnandi fannst ekki.");
  await db.adminUser.delete({ where: { id } });
  await logActivity("system", `Stjórnandi fjarlægður: ${u.email}`, "warning");
  revalidatePath(P);
  done(`${P}#adgangur`, `${u.email} hefur ekki lengur aðgang.`);
}

export async function deleteDemoData() {
  await requireAdmin();
  const r = await deleteDemo(db);
  await logActivity("system", `Prufugögnum eytt: ${r.orders} pantanir, ${r.subs} áskriftir, ${r.customers} viðskiptavinir, ${r.events} atburðir`, "warning");
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  done(`${P}#prufugogn`, `Prufugögnum eytt: ${r.orders} pantanir, ${r.subs} áskriftir og ${r.customers} viðskiptavinir.`);
}
