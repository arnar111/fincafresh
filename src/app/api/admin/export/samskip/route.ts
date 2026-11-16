import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/admin";
import { dateInput } from "@/lib/format";

/**
 * Sendingarlisti fyrir heimsendingar. Samskip API er ekki komið (sótt hefur verið um aðgang),
 * svo þetta er almennur listi sem hægt er að senda Samskip. Sniðið verður lagað að þeirra
 * innflutningssniði þegar það liggur fyrir.
 */
export async function GET(req: NextRequest) {
  if (!(await getAdmin())) return new Response("Óheimilt", { status: 401 });
  const id = req.nextUrl.searchParams.get("delivery") ?? "";
  const delivery = await db.delivery.findUnique({ where: { id } });
  if (!delivery) return new Response("Sending fannst ekki", { status: 404 });
  const orders = await db.order.findMany({
    where: { deliveryId: id, deliveryMethod: "HOME", status: { not: "CANCELLED" } },
    include: { items: { include: { product: { select: { type: true } } } } },
    orderBy: [{ postalCode: "asc" }, { number: "asc" }],
  });
  const rows = [
    ["Pöntun", "Nafn viðtakanda", "Sími", "Netfang", "Heimilisfang", "Póstnúmer", "Staður", "Fjöldi kassa", "Aðrar vörur", "Kælivara", "Athugasemd", "Sendingardagur"],
    ...orders.map((o) => {
      const boxes = o.items.filter((i) => i.product?.type === "BOX").reduce((s, i) => s + i.quantity, 0);
      const other = o.items.filter((i) => i.product?.type !== "BOX").reduce((s, i) => s + i.quantity, 0);
      return [o.number, o.name, o.phone, o.email, o.street, o.postalCode, o.city, boxes, other, "Já", o.customerNote, dateInput(delivery.date)];
    }),
  ];
  return csvResponse(`samskip-${dateInput(delivery.date)}.csv`, toCsv(rows));
}
