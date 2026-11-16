"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { done, fail } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { seedDemo } from "@/lib/seed/demo";
import { deleteDemo } from "./stillingar/demo";

function back(fd: FormData) {
  const from = String(fd.get("from") ?? "/admin");
  return from.startsWith("/admin") ? from : "/admin";
}

/** Setur inn sýndargögn svo hægt sé að prófa allt kerfið */
export async function loadDemo(fd: FormData) {
  await requireAdmin();
  const to = back(fd);
  let r: Awaited<ReturnType<typeof seedDemo>>;
  try {
    r = await seedDemo(db);
  } catch (e) {
    fail(to, `Tókst ekki að setja inn sýndargögn: ${(e as Error).message}`);
  }
  revalidatePath("/", "layout");
  done(to, `Sýndargögn komin inn: ${r.orders} pantanir, ${r.subscriptions} áskriftir, ${r.customers} viðskiptavinir.`);
}

/** Eyðir sýndargögnum (raunveruleg gögn haldast) */
export async function removeDemo(fd: FormData) {
  await requireAdmin();
  const to = back(fd);
  try {
    const r = await deleteDemo(db);
    await logActivity("system", `Sýndargögnum eytt: ${r.orders} pantanir, ${r.subs} áskriftir, ${r.customers} viðskiptavinir.`, "warning");
  } catch (e) {
    fail(to, `Tókst ekki að eyða sýndargögnum: ${(e as Error).message}`);
  }
  revalidatePath("/", "layout");
  done(to, "Sýndargögnum hefur verið eytt. Raunveruleg gögn eru óbreytt.");
}

/** Eyðir sýndargögnum og setur þau inn aftur (gott eftir að búið er að prófa og breyta) */
export async function resetDemo(fd: FormData) {
  await requireAdmin();
  const to = back(fd);
  try {
    await deleteDemo(db);
    await seedDemo(db);
  } catch (e) {
    fail(to, `Tókst ekki að endurstilla sýndargögn: ${(e as Error).message}`);
  }
  revalidatePath("/", "layout");
  done(to, "Sýndargögnin eru komin inn aftur, eins og ný.");
}
