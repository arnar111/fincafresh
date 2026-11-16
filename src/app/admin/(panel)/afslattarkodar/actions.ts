"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bool, dateOrNull, done, fail, int, intOrNull, str } from "@/lib/admin";
import { logActivity } from "@/lib/activity";

export async function saveCode(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id") || undefined;
  const back = id ? `/admin/afslattarkodar/${id}` : "/admin/afslattarkodar";
  const code = str(fd, "code").toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9ÁÐÉÍÓÚÝÞÆÖ_-]{3,30}$/.test(code)) fail(back, "Kóðinn þarf að vera 3 til 30 stafir, aðeins bókstafir, tölustafir, - og _.");
  const clash = await db.discountCode.findUnique({ where: { code } });
  if (clash && clash.id !== id) fail(back, `Kóðinn ${code} er þegar til.`);
  const type = str(fd, "type") === "FIXED" ? "FIXED" : "PERCENT";
  const value = int(fd, "value", 0);
  if (value <= 0) fail(back, "Afslátturinn þarf að vera hærri en 0.");
  if (type === "PERCENT" && value > 100) fail(back, "Prósenta getur ekki verið hærri en 100.");
  const appliesTo = ["ALL", "SUBSCRIPTION", "SINGLE"].includes(str(fd, "appliesTo")) ? str(fd, "appliesTo") : "ALL";
  const data = {
    code,
    description: str(fd, "description"),
    type,
    value,
    appliesTo,
    minSubtotal: int(fd, "minSubtotal", 0),
    usageLimit: intOrNull(fd, "usageLimit"),
    expiresAt: dateOrNull(fd, "expiresAt"),
    active: id ? bool(fd, "active") : true,
  };
  if (id) await db.discountCode.update({ where: { id }, data });
  else await db.discountCode.create({ data });
  await logActivity("system", `Afsláttarkóði ${id ? "uppfærður" : "búinn til"}: ${code}`, "success");
  revalidatePath("/admin/afslattarkodar");
  done("/admin/afslattarkodar", `Kóðinn ${code} var vistaður.`);
}

export async function toggleCode(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const c = await db.discountCode.findUnique({ where: { id } });
  if (!c) fail("/admin/afslattarkodar", "Kóði fannst ekki.");
  await db.discountCode.update({ where: { id }, data: { active: !c.active } });
  revalidatePath("/admin/afslattarkodar");
  done("/admin/afslattarkodar", c.active ? `${c.code} er nú óvirkur.` : `${c.code} er nú virkur.`);
}

export async function deleteCode(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const c = await db.discountCode.findUnique({ where: { id } });
  if (!c) fail("/admin/afslattarkodar", "Kóði fannst ekki.");
  await db.discountCode.delete({ where: { id } });
  revalidatePath("/admin/afslattarkodar");
  done("/admin/afslattarkodar", `${c.code} var eytt.`);
}
