import type { Fruit } from "@prisma/client";
import type { ProductView } from "./catalog";
import type { LiteFruit, LiteProduct } from "@/components/shop/types";

export function liteProduct(p: ProductView): LiteProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    tier: p.tier,
    tagline: p.tagline,
    shortDescription: p.shortDescription,
    features: p.featureList,
    image: p.image,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    subPrice: p.subPrice,
    subDiscountPct: p.subDiscountPct,
    weightLabel: p.weightLabel,
    suitsFor: p.suitsFor,
  };
}

export function liteFruit(f: Fruit, deluxeOnly = false): LiteFruit {
  return {
    id: f.id,
    slug: f.slug,
    name: f.name,
    variety: f.variety,
    illustration: f.illustration,
    color: f.color,
    imageUrl: f.imageUrl,
    origin: f.origin,
    region: f.region,
    farmer: f.farmer,
    season: f.season,
    description: f.description,
    taste: f.taste,
    storage: f.storage,
    ripeness: f.ripeness,
    goodToKnow: f.goodToKnow,
    deluxeOnly,
  };
}

/** Hvaða kassi er Delúx (til að bjóða uppfærslu þegar sýndir eru Delúx-ávextir) */
export function findDelux(boxes: LiteProduct[]) {
  return boxes.find((b) => b.tier === "DELUX") ?? boxes[boxes.length - 1];
}
