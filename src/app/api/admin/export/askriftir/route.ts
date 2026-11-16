import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/admin";
import { frequencyMap, subPricePerDelivery, SOURCE_LABELS } from "@/lib/admin-ops";
import { SUB_STATUS_LABELS } from "@/lib/subscriptions";
import { DELIVERY_METHOD_LABELS } from "@/lib/orders";
import { dateInput } from "@/lib/format";

export async function GET(req: NextRequest) {
  if (!(await getAdmin())) return new Response("Óheimilt", { status: 401 });
  const sp = req.nextUrl.searchParams;
  const where: Prisma.SubscriptionWhereInput = {};
  if (sp.get("stada")) where.status = sp.get("stada")!;
  if (sp.get("kassi")) where.productId = sp.get("kassi")!;
  if (sp.get("tidni")) where.everyNthDelivery = Number(sp.get("tidni"));
  const q = sp.get("q")?.trim();
  if (q) where.customer = { OR: [{ name: { contains: q } }, { email: { contains: q.toLowerCase() } }, { phone: { contains: q } }] };
  const subs = await db.subscription.findMany({ where, include: { customer: true, product: true }, orderBy: { createdAt: "desc" } });
  const label = await frequencyMap();
  const rows = [
    ["Netfang", "Nafn", "Sími", "Kassi", "Magn", "Tíðni", "Afsláttur %", "Verð á sendingu", "Staða", "Sleppir næstu", "Í hléi til", "Afhending", "Pikkoló stöð", "Heimilisfang", "Póstnr.", "Staður", "Repeat-auðkenni", "Uppruni", "Stofnuð", "Sagt upp", "Ástæða uppsagnar"],
    ...subs.map((s) => [
      s.customer.email, s.customer.name, s.customer.phone, s.product.name, s.quantity, label(s.everyNthDelivery), s.discountPct, subPricePerDelivery(s),
      SUB_STATUS_LABELS[s.status] ?? s.status, s.skipNext ? "Já" : "Nei", s.pausedUntil ? dateInput(s.pausedUntil) : "",
      DELIVERY_METHOD_LABELS[s.deliveryMethod] ?? s.deliveryMethod, s.pikkoloStationName, s.street, s.postalCode, s.city, s.repeatId,
      SOURCE_LABELS[s.source] ?? s.source, dateInput(s.createdAt), s.cancelledAt ? dateInput(s.cancelledAt) : "", s.cancelReason,
    ]),
  ];
  return csvResponse(`askriftir-${dateInput(new Date())}.csv`, toCsv(rows));
}
