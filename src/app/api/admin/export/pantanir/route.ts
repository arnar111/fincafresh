import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/admin";
import { orderWhere, SOURCE_LABELS, itemsText } from "@/lib/admin-ops";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, DELIVERY_METHOD_LABELS } from "@/lib/orders";
import { dateTime, dateInput } from "@/lib/format";

export async function GET(req: NextRequest) {
  if (!(await getAdmin())) return new Response("Óheimilt", { status: 401 });
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const orders = await db.order.findMany({ where: orderWhere(sp), orderBy: { createdAt: "desc" }, include: { items: true } });
  const rows = [
    ["Pöntun", "Dags.", "Nafn", "Netfang", "Sími", "Kennitala", "Staða", "Greiðsla", "Greiðslumáti", "Afhending", "Pikkoló stöð", "Heimilisfang", "Póstnr.", "Staður", "Sendingardagur", "Vörur", "Millisamtala", "Afsláttur", "Sending", "Samtals", "Afsláttarkóði", "Uppruni", "Rakningarnúmer"],
    ...orders.map((o) => [
      o.number, dateTime(o.createdAt), o.name, o.email, o.phone, o.kennitala,
      ORDER_STATUS_LABELS[o.status] ?? o.status, PAYMENT_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus, o.paymentMethod,
      DELIVERY_METHOD_LABELS[o.deliveryMethod] ?? o.deliveryMethod, o.pikkoloStationName, o.street, o.postalCode, o.city,
      o.deliveryDate ? dateInput(o.deliveryDate) : "", itemsText(o.items), o.subtotal, o.discount, o.shipping, o.total, o.discountCode,
      SOURCE_LABELS[o.source] ?? o.source, o.trackingNumber,
    ]),
  ];
  return csvResponse(`pantanir-${dateInput(new Date())}.csv`, toCsv(rows));
}
