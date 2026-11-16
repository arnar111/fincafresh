"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { done, fail, str } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, DELIVERY_METHOD_LABELS, submitOrderToPikkolo } from "@/lib/orders";
import { cancelPikkoloOrder, getPikkoloOrder } from "@/lib/integrations/pikkolo";
import { pushWooStatus } from "@/lib/admin-ops";

function backTo(fd: FormData, fallback: string) {
  const b = str(fd, "back");
  return b.startsWith("/admin") ? b : fallback;
}

export async function setOrderStatus(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status");
  const back = backTo(fd, `/admin/pantanir/${id}`);
  if (!ORDER_STATUS_LABELS[status]) fail(back, "Óþekkt staða.");
  const order = await db.order.update({ where: { id }, data: { status } });
  await pushWooStatus(order);
  await logActivity("order", `Pöntun #${order.number} merkt "${ORDER_STATUS_LABELS[status]}"`, "info", { orderId: id });
  revalidatePath("/admin", "layout");
  done(back, `Pöntun #${order.number} er nú "${ORDER_STATUS_LABELS[status]}".`);
}

export async function bulkSetStatus(fd: FormData) {
  await requireAdmin();
  const ids = fd.getAll("ids").map(String).filter(Boolean);
  const status = str(fd, "status");
  const back = backTo(fd, "/admin/pantanir");
  if (!ids.length) fail(back, "Veldu fyrst pantanir með því að haka við þær.");
  if (!ORDER_STATUS_LABELS[status]) fail(back, "Veldu stöðu til að setja á pantanirnar.");
  await db.order.updateMany({ where: { id: { in: ids } }, data: { status } });
  const orders = await db.order.findMany({ where: { id: { in: ids } }, select: { wooId: true, number: true, status: true } });
  for (const o of orders) await pushWooStatus(o);
  await logActivity("order", `${ids.length} pantanir merktar "${ORDER_STATUS_LABELS[status]}"`, "info");
  revalidatePath("/admin", "layout");
  done(back, `${ids.length} ${ids.length === 1 ? "pöntun merkt" : "pantanir merktar"} "${ORDER_STATUS_LABELS[status]}".`);
}

export async function bulkSendPikkolo(fd: FormData) {
  await requireAdmin();
  const ids = fd.getAll("ids").map(String).filter(Boolean);
  const back = backTo(fd, "/admin/pantanir");
  if (!ids.length) fail(back, "Veldu fyrst pantanir með því að haka við þær.");
  const orders = await db.order.findMany({ where: { id: { in: ids }, deliveryMethod: "PIKKOLO", pikkoloOrderId: "", status: { not: "CANCELLED" } }, select: { id: true } });
  let ok = 0;
  const errors: string[] = [];
  for (const o of orders) {
    try {
      await submitOrderToPikkolo(o.id);
      ok++;
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  revalidatePath("/admin", "layout");
  if (!orders.length) fail(back, "Engin af völdu pöntununum á eftir að fara til Pikkoló.");
  if (errors.length) fail(back, `${ok} sendar til Pikkoló, ${errors.length} tókst ekki. Fyrsta villa: ${errors[0]}`);
  done(back, `${ok} ${ok === 1 ? "pöntun send" : "pantanir sendar"} til Pikkoló.`);
}

export async function setPaymentStatus(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const paymentStatus = str(fd, "paymentStatus");
  const back = backTo(fd, `/admin/pantanir/${id}`);
  if (!PAYMENT_STATUS_LABELS[paymentStatus]) fail(back, "Óþekkt greiðslustaða.");
  const order = await db.order.update({ where: { id }, data: { paymentStatus } });
  await logActivity("order", `Greiðslustaða #${order.number}: ${PAYMENT_STATUS_LABELS[paymentStatus]}`, "info", { orderId: id });
  revalidatePath("/admin", "layout");
  done(back, `Greiðslustaða uppfærð: ${PAYMENT_STATUS_LABELS[paymentStatus]}.`);
}

export async function saveOrderNotes(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const back = backTo(fd, `/admin/pantanir/${id}`);
  await db.order.update({
    where: { id },
    data: { internalNote: str(fd, "internalNote"), trackingNumber: str(fd, "trackingNumber"), samskipRef: str(fd, "samskipRef") },
  });
  revalidatePath(`/admin/pantanir/${id}`);
  done(back, "Athugasemdir og rakningarnúmer vistuð.");
}

export async function updateOrderDelivery(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const back = backTo(fd, `/admin/pantanir/${id}`);
  const method = str(fd, "deliveryMethod");
  if (!DELIVERY_METHOD_LABELS[method]) fail(back, "Veldu afhendingarmáta.");
  const data: Record<string, unknown> = {
    deliveryMethod: method,
    street: str(fd, "street"),
    postalCode: str(fd, "postalCode"),
    city: str(fd, "city"),
    phone: str(fd, "phone"),
  };
  const deliveryId = str(fd, "deliveryId");
  if (fd.has("deliveryId")) {
    if (deliveryId) {
      const d = await db.delivery.findUnique({ where: { id: deliveryId } });
      if (d) Object.assign(data, { deliveryId, deliveryDate: d.date });
    } else Object.assign(data, { deliveryId: null });
  }
  // Stöð valin úr lista: "stationId|deliveryTimeId|nafn"
  const station = str(fd, "station");
  if (station) {
    const [stationId, timeId, ...name] = station.split("|");
    Object.assign(data, { pikkoloStationId: stationId, pikkoloDeliveryTimeId: timeId, pikkoloStationName: name.join("|") });
  } else if (fd.has("pikkoloStationId")) {
    Object.assign(data, { pikkoloStationId: str(fd, "pikkoloStationId"), pikkoloDeliveryTimeId: str(fd, "pikkoloDeliveryTimeId"), pikkoloStationName: str(fd, "pikkoloStationName") });
  }
  const order = await db.order.update({ where: { id }, data });
  await logActivity("order", `Afhending pöntunar #${order.number} uppfærð`, "info", { orderId: id });
  revalidatePath("/admin", "layout");
  done(`/admin/pantanir/${id}`, "Afhendingarupplýsingar vistaðar.");
}

export async function cancelOrder(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const back = backTo(fd, `/admin/pantanir/${id}`);
  const order = await db.order.findUnique({ where: { id } });
  if (!order) fail(back, "Pöntun fannst ekki.");
  let note = "";
  if (order.pikkoloOrderId && order.pikkoloStatus !== "CANCELLED") {
    try {
      await cancelPikkoloOrder(order.pikkoloOrderId);
      note = " Hætt var við hana hjá Pikkoló líka.";
    } catch (e) {
      note = ` ATH: ekki tókst að hætta við hjá Pikkoló (${(e as Error).message}). Gerðu það í Pikkoló.`;
    }
  }
  const updated = await db.order.update({ where: { id }, data: { status: "CANCELLED", ...(note.startsWith(" Hætt") ? { pikkoloStatus: "CANCELLED" } : {}) } });
  await pushWooStatus(updated);
  await logActivity("order", `Hætt við pöntun #${order.number}`, "warning", { orderId: id });
  revalidatePath("/admin", "layout");
  done(back, `Hætt var við pöntun #${order.number}.${note}`);
}

export async function sendToPikkolo(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const back = backTo(fd, `/admin/pantanir/${id}`);
  let error = "";
  try {
    await submitOrderToPikkolo(id);
  } catch (e) {
    error = (e as Error).message;
  }
  revalidatePath("/admin", "layout");
  if (error) fail(back, `Tókst ekki að senda til Pikkoló: ${error}`);
  done(back, "Pöntunin var send til Pikkoló.");
}

export async function refreshPikkolo(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const back = backTo(fd, `/admin/pantanir/${id}`);
  const order = await db.order.findUnique({ where: { id } });
  if (!order?.pikkoloOrderId) fail(back, "Pöntunin hefur ekki verið send til Pikkoló.");
  let status = "";
  let error = "";
  try {
    status = (await getPikkoloOrder(order.pikkoloOrderId)).status;
  } catch (e) {
    error = (e as Error).message;
  }
  if (error) fail(back, `Tókst ekki að sækja stöðu: ${error}`);
  await db.order.update({ where: { id }, data: { pikkoloStatus: status } });
  revalidatePath(`/admin/pantanir/${id}`);
  done(back, `Staða hjá Pikkoló: ${status || "óþekkt"}.`);
}

export async function cancelAtPikkolo(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const back = backTo(fd, `/admin/pantanir/${id}`);
  const order = await db.order.findUnique({ where: { id } });
  if (!order?.pikkoloOrderId) fail(back, "Pöntunin hefur ekki verið send til Pikkoló.");
  let error = "";
  try {
    await cancelPikkoloOrder(order.pikkoloOrderId);
  } catch (e) {
    error = (e as Error).message;
  }
  if (error) fail(back, `Tókst ekki að hætta við hjá Pikkoló: ${error}`);
  await db.order.update({ where: { id }, data: { pikkoloStatus: "CANCELLED" } });
  await logActivity("integration", `Hætt við pöntun #${order.number} hjá Pikkoló`, "warning", { orderId: id });
  revalidatePath(`/admin/pantanir/${id}`);
  done(back, "Hætt var við pöntunina hjá Pikkoló. Pöntunin sjálf er óbreytt hér.");
}
