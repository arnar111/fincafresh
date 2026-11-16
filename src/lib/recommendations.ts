import { unstable_cache } from "next/cache";
import { db } from "./db";
import { toView, type ProductView } from "./catalog";

type Pair = { a: string; b: string; together: number; aCount: number; bCount: number };

/**
 * "Þeir sem keyptu þetta keyptu líka": reiknað út frá raunverulegum pöntunum
 * (líka pöntunum sem eru fluttar inn úr WooCommerce). Handvalin meðmæli úr
 * stjórnborði ganga alltaf fyrir.
 */
async function orderBaskets(): Promise<string[][]> {
  const items = await db.orderItem.findMany({
    where: { productId: { not: null }, order: { status: { not: "CANCELLED" } } },
    select: { orderId: true, productId: true },
  });
  const map = new Map<string, Set<string>>();
  for (const it of items) {
    if (!it.productId) continue;
    if (!map.has(it.orderId)) map.set(it.orderId, new Set());
    map.get(it.orderId)!.add(it.productId);
  }
  return [...map.values()].map((s) => [...s]);
}

export async function coPurchasePairs(): Promise<{ pairs: Pair[]; orders: number }> {
  const baskets = await orderBaskets();
  const single = new Map<string, number>();
  const pair = new Map<string, number>();
  for (const b of baskets) {
    for (const p of b) single.set(p, (single.get(p) ?? 0) + 1);
    for (let i = 0; i < b.length; i++)
      for (let j = i + 1; j < b.length; j++) {
        const [x, y] = [b[i], b[j]].sort();
        const k = `${x}|${y}`;
        pair.set(k, (pair.get(k) ?? 0) + 1);
      }
  }
  const pairs: Pair[] = [...pair.entries()].map(([k, together]) => {
    const [a, b] = k.split("|");
    return { a, b, together, aCount: single.get(a) ?? 0, bCount: single.get(b) ?? 0 };
  });
  pairs.sort((x, y) => y.together - x.together);
  return { pairs, orders: baskets.length };
}

/**
 * Hversu oft aðrar vörur eru keyptar með tilteknum vörum, reiknað í gagnagrunninum (ekki með því að
 * lesa allar pantanir) og geymt í skyndiminni í 10 mínútur. Notað á vörusíðum, í körfu og í körfuglugga.
 */
const coPurchasedWith = unstable_cache(
  async (ids: string[]) => {
    if (!ids.length) return [] as { productId: string; together: number }[];
    const rows = await db.$queryRaw<{ productId: string; together: bigint | number }[]>`
      SELECT oi2."productId" AS "productId", COUNT(DISTINCT oi2."orderId") AS together
      FROM "OrderItem" oi1
      JOIN "OrderItem" oi2 ON oi2."orderId" = oi1."orderId" AND oi2."productId" IS NOT NULL AND oi2."productId" <> oi1."productId"
      JOIN "Order" o ON o.id = oi1."orderId"
      WHERE oi1."productId" = ANY(${ids}) AND o.status <> 'CANCELLED'
      GROUP BY oi2."productId"
      ORDER BY together DESC
      LIMIT 24`;
    return rows.map((r) => ({ productId: r.productId, together: Number(r.together) }));
  },
  ["co-purchased-with"],
  { revalidate: 600 }
);

/** Meðmæli fyrir eina eða fleiri vörur (t.d. allt í körfunni) */
export async function recommendFor(productIds: string[], limit = 4): Promise<ProductView[]> {
  const exclude = new Set(productIds);
  const scores = new Map<string, number>();

  const pins = await db.recommendationPin.findMany({ where: { productId: { in: productIds } }, orderBy: { sortOrder: "asc" } });
  pins.forEach((p, i) => scores.set(p.recommendedProductId, 1000 - i));

  if (productIds.length) {
    for (const r of await coPurchasedWith([...new Set(productIds)].sort())) {
      scores.set(r.productId, (scores.get(r.productId) ?? 0) + r.together);
    }
  }

  const ranked = [...scores.entries()].filter(([id]) => !exclude.has(id)).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const found = await db.product.findMany({ where: { id: { in: ranked }, active: true } });
  const byId = new Map(found.map((p) => [p.id, p]));
  const result = ranked.map((id) => byId.get(id)).filter(Boolean) as typeof found;

  if (result.length < limit) {
    const fill = await db.product.findMany({
      where: { active: true, type: "ITEM", id: { notIn: [...exclude, ...result.map((r) => r.id)] } },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
      take: limit - result.length,
    });
    result.push(...fill);
  }
  return Promise.all(result.slice(0, limit).map(toView));
}
