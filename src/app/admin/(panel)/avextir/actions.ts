"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { bool, done, fail, str } from "@/lib/admin";
import { slugify } from "@/lib/format";
import { logActivity } from "@/lib/activity";

function refresh(id?: string) {
  revalidatePath("/admin/avextir");
  if (id) revalidatePath(`/admin/avextir/${id}`);
  revalidatePath("/", "layout");
}

export async function saveFruit(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id") || undefined;
  const back = id ? `/admin/avextir/${id}` : "/admin/avextir/ny";
  const name = str(fd, "name");
  if (!name) fail(back, "Ávöxturinn þarf að hafa nafn.");
  const base = slugify(str(fd, "slug") || name) || "avoxtur";
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await db.fruit.findUnique({ where: { slug } });
    if (!hit || hit.id === id) break;
    slug = `${base}-${i}`;
  }
  const color = /^#[0-9a-f]{6}$/i.test(str(fd, "color")) ? str(fd, "color") : "#F9C214";
  const data = {
    name,
    slug,
    variety: str(fd, "variety"),
    illustration: str(fd, "illustration") || "other",
    color,
    imageUrl: str(fd, "imageUrl"),
    origin: str(fd, "origin"),
    region: str(fd, "region"),
    farmer: str(fd, "farmer"),
    season: str(fd, "season"),
    description: str(fd, "description"),
    taste: str(fd, "taste"),
    ripeness: str(fd, "ripeness"),
    storage: str(fd, "storage"),
    goodToKnow: str(fd, "goodToKnow"),
    reviewed: bool(fd, "reviewed"),
    active: bool(fd, "active"),
  };
  let fruitId = id;
  if (id) await db.fruit.update({ where: { id }, data });
  else fruitId = (await db.fruit.create({ data })).id;
  await logActivity("product", `Ávöxtur ${id ? "uppfærður" : "búinn til"}: ${name}`, "success");
  refresh(fruitId);
  done(`/admin/avextir/${fruitId}`, `"${name}" var vistaður. Breytingin sést strax á síðunni.`);
}

export async function markReviewed(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const f = await db.fruit.findUnique({ where: { id } });
  if (!f) fail("/admin/avextir", "Ávöxtur fannst ekki.");
  await db.fruit.update({ where: { id }, data: { reviewed: !f.reviewed } });
  refresh(id);
  done("/admin/avextir", f.reviewed ? `"${f.name}" merktur sem óyfirfarinn.` : `"${f.name}" merktur sem yfirfarinn.`);
}

export async function deleteFruit(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const f = await db.fruit.findUnique({ where: { id } });
  if (!f) fail("/admin/avextir", "Ávöxtur fannst ekki.");
  await db.fruit.delete({ where: { id } });
  await logActivity("product", `Ávexti eytt: ${f.name}`, "warning");
  refresh();
  done("/admin/avextir", `"${f.name}" var eytt og tekinn úr öllum sendingum.`);
}
