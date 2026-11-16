import { cache } from "react";
import type { Product, Fruit } from "@prisma/client";
import { db } from "./db";
import { parseJsonList } from "./format";
import { getSetting } from "./settings";

export type ProductView = Product & {
  imageList: string[];
  featureList: string[];
  image: string;
  subDiscountPct: number;
  subPrice: number;
};

export function subPriceFor(price: number, pct: number) {
  return Math.round((price * (100 - pct)) / 100);
}

export async function toView(p: Product): Promise<ProductView> {
  const def = await getSetting("subscription.defaultDiscountPct");
  const pct = p.subscriptionDiscountPct ?? def;
  const imageList = parseJsonList(p.images);
  return {
    ...p,
    imageList,
    featureList: parseJsonList(p.features),
    image: imageList[0] ?? "/brand/lemon-mark.svg",
    subDiscountPct: pct,
    subPrice: subPriceFor(p.price, pct),
  };
}

export const getBoxes = cache(async () => {
  const rows = await db.product.findMany({ where: { type: "BOX", active: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] });
  return Promise.all(rows.map(toView));
});

export const getShopProducts = cache(async (categorySlug?: string) => {
  const rows = await db.product.findMany({
    where: { type: "ITEM", active: true, ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { category: true },
  });
  return Promise.all(rows.map(toView));
});

export const getFeaturedProducts = cache(async (limit = 4) => {
  const rows = await db.product.findMany({
    where: { type: "ITEM", active: true },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
    take: limit,
  });
  return Promise.all(rows.map(toView));
});

export const getCategories = cache(async () => {
  return db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: { where: { active: true } } } } },
  });
});

export const getProductBySlug = cache(async (slug: string) => {
  const p = await db.product.findUnique({ where: { slug }, include: { category: true } });
  if (!p || !p.active) return null;
  return { ...(await toView(p)), category: p.category };
});

export type NextDelivery = {
  id: string;
  date: Date;
  cutoffDate: Date | null;
  title: string;
  note: string;
  fruits: { fruit: Fruit; deluxeOnly: boolean }[];
};

/** Næsta sending sem er ekki liðin. Ef engin er skráð er skilað null. */
export const getNextDelivery = cache(async (): Promise<NextDelivery | null> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = await db.delivery.findFirst({
    where: { date: { gte: today }, status: { in: ["PLANNED", "PACKING"] } },
    orderBy: { date: "asc" },
    include: { fruits: { include: { fruit: true }, orderBy: [{ deluxeOnly: "asc" }, { sortOrder: "asc" }] } },
  });
  if (!d) return null;
  return {
    id: d.id,
    date: d.date,
    cutoffDate: d.cutoffDate,
    title: d.title,
    note: d.note,
    fruits: d.fruits.filter((f) => f.fruit.active).map((f) => ({ fruit: f.fruit, deluxeOnly: f.deluxeOnly })),
  };
});

/**
 * Sending sem nýjar pantanir fara í: fyrsta sendingin þar sem pöntunarfrestur er ekki liðinn.
 * Fresturinn gildir út daginn sem hann er skráður á. Ef engin slík sending er til er skilað null
 * (pöntunin fer þá í næstu sendingu sem verður skráð).
 */
export const getOrderableDelivery = cache(async (): Promise<NextDelivery | null> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = await db.delivery.findFirst({
    where: {
      date: { gte: today },
      status: { in: ["PLANNED", "PACKING"] },
      OR: [{ cutoffDate: null }, { cutoffDate: { gte: today } }],
    },
    orderBy: { date: "asc" },
    include: { fruits: { include: { fruit: true }, orderBy: [{ deluxeOnly: "asc" }, { sortOrder: "asc" }] } },
  });
  if (!d) return null;
  return {
    id: d.id,
    date: d.date,
    cutoffDate: d.cutoffDate,
    title: d.title,
    note: d.note,
    fruits: d.fruits.filter((f) => f.fruit.active).map((f) => ({ fruit: f.fruit, deluxeOnly: f.deluxeOnly })),
  };
});

export const getFruitBySlug = cache(async (slug: string) => db.fruit.findUnique({ where: { slug } }));

export async function searchProducts(q: string) {
  const term = q.trim();
  if (!term) return [];
  const rows = await db.product.findMany({
    where: {
      active: true,
      OR: [{ name: { contains: term, mode: "insensitive" } }, { shortDescription: { contains: term, mode: "insensitive" } }, { tagline: { contains: term, mode: "insensitive" } }],
    },
    take: 24,
  });
  return Promise.all(rows.map(toView));
}
