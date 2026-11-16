import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/admin";
import { dateInput } from "@/lib/format";

export async function GET(req: NextRequest) {
  if (!(await getAdmin())) return new Response("Óheimilt", { status: 401 });
  const sp = req.nextUrl.searchParams;
  const where: Prisma.CustomerWhereInput = {};
  const q = sp.get("q")?.trim();
  if (q) where.OR = [{ name: { contains: q } }, { email: { contains: q.toLowerCase() } }, { phone: { contains: q } }, { kennitala: { contains: q } }];
  const hopur = sp.get("hopur");
  if (hopur === "askrifendur") where.subscriptions = { some: { status: "ACTIVE" } };
  if (hopur === "postlisti") where.marketingOptIn = true;
  if (hopur === "stakir") where.AND = [{ subscriptions: { none: { status: "ACTIVE" } } }, { orders: { some: {} } }];
  const customers = await db.customer.findMany({ where, orderBy: { createdAt: "desc" }, include: { subscriptions: { where: { status: "ACTIVE" }, select: { id: true } } } });
  const stats = await db.order.groupBy({ by: ["customerId"], where: { customerId: { in: customers.map((c) => c.id) }, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: true, _max: { createdAt: true } });
  const byId = new Map(stats.map((s) => [s.customerId, s]));
  const rows = [
    ["Nafn", "Netfang", "Sími", "Kennitala", "Heimilisfang", "Póstnr.", "Staður", "Fjöldi pantana", "Heildarviðskipti", "Síðasta pöntun", "Í áskrift", "Á póstlista", "Stofnaður"],
    ...customers.map((c) => {
      const st = byId.get(c.id);
      return [c.name, c.email, c.phone, c.kennitala, c.street, c.postalCode, c.city, st?._count ?? 0, st?._sum.total ?? 0, st?._max.createdAt ? dateInput(st._max.createdAt) : "", c.subscriptions.length ? "Já" : "Nei", c.marketingOptIn ? "Já" : "Nei", dateInput(c.createdAt)];
    }),
  ];
  return csvResponse(`vidskiptavinir-${dateInput(new Date())}.csv`, toCsv(rows));
}
