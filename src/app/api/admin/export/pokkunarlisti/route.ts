import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/admin";
import { packingSummary } from "@/lib/admin-ops";
import { DELIVERY_METHOD_LABELS } from "@/lib/orders";
import { dateInput } from "@/lib/format";

export async function GET(req: NextRequest) {
  if (!(await getAdmin())) return new Response("Óheimilt", { status: 401 });
  const id = req.nextUrl.searchParams.get("delivery") ?? "";
  const data = await packingSummary(id);
  if (!data) return new Response("Sending fannst ekki", { status: 404 });
  const rows: (string | number)[][] = [
    ["SAMANTEKT"],
    ["Kassi", "Stakir", "Áskrift", "Áskriftir sem á eftir að stofna", "Samtals"],
    ...data.boxRows.map((b) => [b.name, b.single, b.sub, b.projected, b.grandTotal]),
    ...data.extras.map((e) => [e.name, e.qty, "", "", e.qty]),
    [],
    ["PANTANIR"],
    ["Pöntun", "Nafn", "Sími", "Afhending", "Stöð / heimilisfang", "Vara", "Magn", "Áskrift", "Athugasemd viðskiptavinar"],
  ];
  const orders = [...data.orders].sort((a, b) => a.deliveryMethod.localeCompare(b.deliveryMethod) || a.pikkoloStationName.localeCompare(b.pikkoloStationName) || a.number - b.number);
  for (const o of orders) {
    const where = o.deliveryMethod === "PIKKOLO" ? o.pikkoloStationName : `${o.street}, ${o.postalCode} ${o.city}`;
    for (const i of o.items) {
      rows.push([o.number, o.name, o.phone, DELIVERY_METHOD_LABELS[o.deliveryMethod] ?? o.deliveryMethod, where, i.name, i.quantity, i.isSubscription ? "Já" : "Nei", o.customerNote]);
    }
  }
  return csvResponse(`pokkunarlisti-${dateInput(data.delivery.date)}.csv`, toCsv(rows));
}
