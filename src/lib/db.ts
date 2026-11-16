import { PrismaClient } from "@prisma/client";

/**
 * Tengistrengur gagnagrunns:
 * 1. DATABASE_URL ef hún er stillt (t.d. í .env á eigin vél eða annarri hýsingu)
 * 2. Á Netlify: Netlify Database setur NETLIFY_DB_URL sjálfkrafa
 *    (heimild: Netlify Database skjölun, "@netlify/database" og NETLIFY_DB_URL)
 */
function connectionString(): string | undefined {
  const netlifyEnv = (globalThis as unknown as { Netlify?: { env?: { get(k: string): string | undefined } } }).Netlify?.env;
  return process.env.DATABASE_URL || process.env.NETLIFY_DB_URL || netlifyEnv?.get("NETLIFY_DB_URL") || undefined;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create() {
  const url = connectionString();
  return new PrismaClient(url ? { datasourceUrl: url } : undefined);
}

export const db = globalForPrisma.prisma ?? create();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
