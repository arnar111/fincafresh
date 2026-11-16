"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { done, fail, str, bool, dateOrNull } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { generateSubscriptionOrders } from "@/lib/subscriptions";
import { submitOrderToPikkolo } from "@/lib/orders";
import { pikkoloConfig } from "@/lib/integrations/pikkolo";
import { DELIVERY_STATUS_LABELS, DELIVERY_TO_ORDER_STATUS } from "@/lib/admin-ops";
import { dateWithDayAcc } from "@/lib/format";

const p = (id: string) => `/admin/sendingar/${id}`;

function refresh(id?: string) {
  revalidatePath("/admin/sendingar");
  if (id) revalidatePath(p(id));
  revalidatePath("/admin");
  revalidatePath("/", "layout"); // forsíðan sýnir næstu sendingu
}

export async function createDelivery(fd: FormData) {
  await requireAdmin();
  const date = dateOrNull(fd, "date");
  if (!date) fail("/admin/sendingar", "Veldu dagsetningu sendingar.");
  const cutoff = dateOrNull(fd, "cutoffDate");
  if (cutoff && cutoff > date) fail("/admin/sendingar", "Pöntunarfrestur þarf að vera á undan sendingardegi.");
  const d = await db.delivery.create({ data: { date, cutoffDate: cutoff, title: str(fd, "title"), note: str(fd, "note") } });
  let copied = 0;
  if (bool(fd, "copyFruits")) {
    const prev = await db.delivery.findFirst({ where: { id: { not: d.id } }, orderBy: { date: "desc" }, include: { fruits: true } });
    if (prev) {
      for (const f of prev.fruits) {
        await db.deliveryFruit.create({ data: { deliveryId: d.id, fruitId: f.fruitId, deluxeOnly: f.deluxeOnly, sortOrder: f.sortOrder } });
        copied++;
      }
    }
  }
  await logActivity("delivery", `Ný sending skráð: ${dateWithDayAcc(date)}`, "success", { deliveryId: d.id });
  refresh(d.id);
  done(p(d.id), copied ? `Sendingin var skráð og ${copied} ávextir afritaðir úr síðustu sendingu.` : "Sendingin var skráð. Veldu nú hvaða ávextir fara í kassann.");
}

export async function updateDelivery(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const date = dateOrNull(fd, "date");
  if (!date) fail(p(id), "Veldu dagsetningu.");
  const cutoff = dateOrNull(fd, "cutoffDate");
  if (cutoff && cutoff > date) fail(p(id), "Pöntunarfrestur þarf að vera á undan sendingardegi.");
  await db.delivery.update({ where: { id }, data: { date, cutoffDate: cutoff, title: str(fd, "title"), note: str(fd, "note") } });
  await db.order.updateMany({ where: { deliveryId: id }, data: { deliveryDate: date } });
  refresh(id);
  done(p(id), "Sendingin var uppfærð.");
}

export async function setDeliveryStatus(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!DELIVERY_STATUS_LABELS[status]) fail(p(id), "Óþekkt staða.");
  await db.delivery.update({ where: { id }, data: { status } });
  let msg = `Sendingin er nú "${DELIVERY_STATUS_LABELS[status]}".`;
  const orderStatus = DELIVERY_TO_ORDER_STATUS[status];
  if (bool(fd, "updateOrders") && orderStatus) {
    const r = await db.order.updateMany({ where: { deliveryId: id, status: { notIn: ["CANCELLED", "DELIVERED"] } }, data: { status: orderStatus } });
    msg += ` ${r.count} pantanir uppfærðar.`;
  }
  await logActivity("delivery", msg, "info", { deliveryId: id });
  refresh(id);
  done(p(id), msg);
}

export async function deleteDelivery(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const orders = await db.order.count({ where: { deliveryId: id } });
  if (orders) fail(p(id), `Ekki hægt að eyða sendingu sem ${orders} pantanir eru tengdar. Færðu pantanirnar fyrst eða merktu sendinguna "Lokið".`);
  await db.delivery.delete({ where: { id } });
  refresh();
  done("/admin/sendingar", "Sendingunni var eytt.");
}

export async function addFruit(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const fruitId = str(fd, "fruitId");
  if (!fruitId) fail(p(id), "Veldu ávöxt.");
  const max = await db.deliveryFruit.aggregate({ where: { deliveryId: id }, _max: { sortOrder: true } });
  await db.deliveryFruit.upsert({
    where: { deliveryId_fruitId: { deliveryId: id, fruitId } },
    create: { deliveryId: id, fruitId, deluxeOnly: bool(fd, "deluxeOnly"), sortOrder: (max._max.sortOrder ?? 0) + 1 },
    update: { deluxeOnly: bool(fd, "deluxeOnly") },
  });
  const fruit = await db.fruit.findUnique({ where: { id: fruitId } });
  refresh(id);
  done(p(id), `${fruit?.name ?? "Ávöxtur"} bætt í kassann${bool(fd, "deluxeOnly") ? " (aðeins Delúx)" : ""}.`);
}

export async function removeFruit(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const df = await db.deliveryFruit.delete({ where: { id: str(fd, "dfId") }, include: { fruit: true } });
  refresh(id);
  done(p(id), `${df.fruit.name} tekið úr kassanum.`);
}

export async function toggleDeluxe(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const df = await db.deliveryFruit.findUnique({ where: { id: str(fd, "dfId") }, include: { fruit: true } });
  if (!df) fail(p(id), "Fannst ekki.");
  await db.deliveryFruit.update({ where: { id: df.id }, data: { deluxeOnly: !df.deluxeOnly } });
  refresh(id);
  done(p(id), df.deluxeOnly ? `${df.fruit.name} fer nú í alla kassa.` : `${df.fruit.name} fer nú aðeins í Delúx kassann og fær gullhring á síðunni.`);
}

export async function moveFruit(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const list = await db.deliveryFruit.findMany({ where: { deliveryId: id }, orderBy: [{ deluxeOnly: "asc" }, { sortOrder: "asc" }] });
  const idx = list.findIndex((x) => x.id === str(fd, "dfId"));
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= list.length) done(p(id), "Röðin er óbreytt.");
  const reordered = [...list];
  [reordered[idx], reordered[j]] = [reordered[j], reordered[idx]];
  for (const [i, x] of reordered.entries()) await db.deliveryFruit.update({ where: { id: x.id }, data: { sortOrder: i } });
  refresh(id);
  done(p(id), "Röð uppfærð.");
}

export async function generateOrders(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  let r: Awaited<ReturnType<typeof generateSubscriptionOrders>> | null = null;
  let error = "";
  try {
    r = await generateSubscriptionOrders(id);
  } catch (e) {
    error = (e as Error).message;
  }
  refresh(id);
  revalidatePath("/admin/pantanir");
  revalidatePath("/admin/askriftir");
  if (!r) fail(p(id), `Tókst ekki: ${error}`);
  const one = (n: number) => n % 10 === 1 && n % 100 !== 11;
  const parts = [one(r.created) ? `${r.created} ný áskriftarpöntun` : `${r.created} nýjar áskriftarpantanir`];
  if (r.skipped) parts.push(one(r.skipped) ? `${r.skipped} sleppti þessari sendingu` : `${r.skipped} slepptu þessari sendingu`);
  if (r.paused) parts.push(`${r.paused} í hléi`);
  if (r.notDue) parts.push(one(r.notDue) ? `${r.notDue} fær kassa í sendingunni á eftir` : `${r.notDue} fá kassa í sendingunni á eftir`);
  if (r.already) parts.push(one(r.already) ? `${r.already} var þegar með pöntun` : `${r.already} voru þegar með pöntun`);
  if (r.handled) parts.push(one(r.handled) ? `${r.handled} hafði þegar verið afgreidd` : `${r.handled} höfðu þegar verið afgreiddar`);
  done(p(id), parts.join(", ") + ".");
}

export async function sendDeliveryToPikkolo(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const cfg = await pikkoloConfig();
  if (!cfg.canSubmit) fail(p(id), "Pikkoló API-lykil vantar. Settu hann inn undir Tengingar.");
  const orders = await db.order.findMany({ where: { deliveryId: id, deliveryMethod: "PIKKOLO", pikkoloOrderId: "", status: { not: "CANCELLED" } }, select: { id: true, number: true } });
  if (!orders.length) done(p(id), "Allar Pikkoló pantanir í þessari sendingu hafa þegar verið sendar.");
  let ok = 0;
  const errors: string[] = [];
  for (const o of orders) {
    try {
      await submitOrderToPikkolo(o.id);
      ok++;
    } catch (e) {
      errors.push(`#${o.number}: ${(e as Error).message}`);
    }
  }
  refresh(id);
  if (errors.length) fail(p(id), `${ok} sendar til Pikkoló, ${errors.length} tókst ekki (t.d. ${errors[0]}). Opnaðu pantanirnar til að laga stöð eða afhendingardag.`);
  done(p(id), `${ok} pantanir sendar til Pikkoló.`);
}

export async function saveTrackingNumbers(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  let n = 0;
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("tracking_")) continue;
    const orderId = k.slice("tracking_".length);
    await db.order.updateMany({ where: { id: orderId, deliveryId: id }, data: { trackingNumber: String(v).trim() } });
    n++;
  }
  refresh(id);
  done(p(id), `Rakningarnúmer vistuð (${n} pantanir).`);
}

export async function attachUnassigned(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const d = await db.delivery.findUnique({ where: { id } });
  if (!d) fail("/admin/sendingar", "Sending fannst ekki.");
  const r = await db.order.updateMany({ where: { deliveryId: null, status: { in: ["NEW", "PROCESSING"] } }, data: { deliveryId: id, deliveryDate: d.date } });
  refresh(id);
  done(p(id), r.count ? `${r.count} pantanir tengdar við sendinguna.` : "Engar ótengdar pantanir fundust.");
}
