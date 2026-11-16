/* Grunngögn fyrir Fincafresh (eigin vél): npm run setup
 * - Stjórnandi úr ADMIN_EMAIL / ADMIN_PASSWORD
 * - Grunngögn verslunarinnar (src/lib/seed/catalog.ts) ef engar vörur eru til
 * - Prufugögn (src/lib/seed/demo.ts) nema SEED_DEMO=false
 * Á Netlify eru grunngögnin sett inn með SQL-migration og prufugögn með takka í Stillingum.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedCatalog } from "../src/lib/seed/catalog";
import { seedDemo } from "../src/lib/seed/demo";

const db = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@fincafresh.is").toLowerCase();
  const adminPw = process.env.ADMIN_PASSWORD || "fincafresh";
  if (!(await db.adminUser.findUnique({ where: { email: adminEmail } }))) {
    await db.adminUser.create({ data: { email: adminEmail, name: "Fincafresh", passwordHash: await bcrypt.hash(adminPw, 10) } });
    console.log(`Stjórnandi búinn til: ${adminEmail}`);
  }
  if ((await db.product.count()) === 0) {
    await seedCatalog(db);
    console.log("Grunngögn verslunarinnar komin inn.");
  } else {
    console.log("Vörur eru þegar til, sleppi grunngögnum.");
  }
  if (process.env.SEED_DEMO !== "false" && (await db.customer.count({ where: { email: { endsWith: "@prufa.fincafresh.is" } } })) === 0) {
    await seedDemo(db);
    console.log("Prufugögn komin inn.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
