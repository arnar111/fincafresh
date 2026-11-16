"use server";
import { recommendFor } from "@/lib/recommendations";
import { liteProduct } from "@/lib/lite";

/** Meðmæli fyrir körfuglugga: "Aðrir keyptu líka" */
export async function getRecommendations(productIds: string[], limit = 3) {
  const recs = await recommendFor(productIds, limit);
  return recs.map(liteProduct);
}
