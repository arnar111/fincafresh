// Býr til netlify/database/migrations/..._seed_catalog.sql úr src/lib/seed/catalog.ts
// með því að keyra grunngögnin í staðbundnum Netlify gagnagrunni (keyrt einu sinni: npx tsx scripts/generate-seed-sql.mts)
import { NetlifyDB } from "@netlify/database-dev";
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import * as catalog from "../src/lib/seed/catalog";
// Skráin er CommonJS (TypeScript án "type": "module"), svo nafngreind útflutningur kemur í gegnum default
const seedCatalog = (catalog as unknown as { seedCatalog?: typeof import("../src/lib/seed/catalog").seedCatalog; default: { seedCatalog: typeof import("../src/lib/seed/catalog").seedCatalog } }).seedCatalog ?? (catalog as unknown as { default: { seedCatalog: typeof import("../src/lib/seed/catalog").seedCatalog } }).default.seedCatalog;

const ndb = new NetlifyDB({ logger: () => {} });
const url = await ndb.start();
console.log("local db", url);
const applied = await ndb.applyMigrations("netlify/database/migrations");
console.log("applied", applied);
const db = new PrismaClient({ datasourceUrl: url });
await seedCatalog(db);
const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return `'${v.toISOString().replace("T", " ").replace("Z", "")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
let sql = "-- Grunngögn verslunarinnar: flokkar, kassar, vörur, ávextir og næsta sending.\n-- Búið til úr src/lib/seed/catalog.ts. Textar og verð eru af mockup-inu og breytt í stjórnborðinu.\n";
for (const table of ["Category", "Product", "Fruit", "Delivery", "DeliveryFruit", "RecommendationPin"]) {
  const { rows } = await ndb.query<Record<string, unknown>>(`SELECT * FROM "${table}"`);
  for (const r of rows) {
    const cols = Object.keys(r);
    sql += `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${cols.map((c) => lit(r[c])).join(", ")}) ON CONFLICT DO NOTHING;\n`;
  }
}
writeFileSync("netlify/database/migrations/20261116150100_seed_catalog.sql", sql);
console.log("rows written", sql.split("\n").length);
await db.$disconnect();
await ndb.stop();
