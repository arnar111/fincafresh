import "server-only";
import type { PrismaClient } from "@prisma/client";

export const DEMO_DOMAIN = "@prufa.fincafresh.is";

/** Telur prufugögn (notað til að sýna hvað verður eytt) */
export async function countDemo(db: PrismaClient) {
  const customers = await db.customer.findMany({ where: { email: { endsWith: DEMO_DOMAIN } }, select: { id: true } });
  const ids = customers.map((c) => c.id);
  const [orders, subs, events, code] = await Promise.all([
    db.order.count({ where: { OR: [{ customerId: { in: ids } }, { internalNote: "PRUFUGÖGN" }, { email: { endsWith: DEMO_DOMAIN } }] } }),
    db.subscription.count({ where: { customerId: { in: ids } } }),
    db.analyticsEvent.count({ where: { props: { contains: '"demo":true' } } }),
    db.discountCode.count({ where: { code: "PRUFA10" } }),
  ]);
  return { customers: ids.length, orders, subs, events, code };
}

/**
 * Eyðir prufugögnum sem voru sett inn við uppsetningu.
 * Snertir aðeins: viðskiptavini með netfang @prufa.fincafresh.is, pantanir þeirra (og pantanir merktar PRUFUGÖGN),
 * áskriftir þeirra, atburði merkta {"demo":true} og prufukóðann PRUFA10.
 */
export async function deleteDemo(db: PrismaClient) {
  const customers = await db.customer.findMany({ where: { email: { endsWith: DEMO_DOMAIN } }, select: { id: true } });
  const ids = customers.map((c) => c.id);
  return db.$transaction(async (tx) => {
    const orders = await tx.order.deleteMany({ where: { OR: [{ customerId: { in: ids } }, { internalNote: "PRUFUGÖGN" }, { email: { endsWith: DEMO_DOMAIN } }] } });
    const subs = await tx.subscription.deleteMany({ where: { customerId: { in: ids } } });
    const cust = await tx.customer.deleteMany({ where: { id: { in: ids } } });
    const events = await tx.analyticsEvent.deleteMany({ where: { props: { contains: '"demo":true' } } });
    await tx.discountCode.deleteMany({ where: { code: "PRUFA10" } });
    await tx.setting.upsert({ where: { key: "demo.seeded" }, create: { key: "demo.seeded", value: "false" }, update: { value: "false" } });
    return { orders: orders.count, subs: subs.count, customers: cust.count, events: events.count };
  });
}
