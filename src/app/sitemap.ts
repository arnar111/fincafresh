import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const products = await db.product.findMany({ where: { active: true }, select: { slug: true, type: true, updatedAt: true } });
  const pages = ["", "/kassar", "/askrift", "/netverslun", "/fyrirtaekjathjonusta", "/um-okkur", "/spurt-og-svarad", "/skilmalar", "/personuvernd"];
  return [
    ...pages.map((p) => ({ url: `${site}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...products.map((p) => ({ url: `${site}${p.type === "BOX" ? "/kassar" : "/vorur"}/${p.slug}`, lastModified: p.updatedAt, priority: p.type === "BOX" ? 0.9 : 0.6 })),
  ];
}
