// Staðbundinn Postgres-gagnagrunnur fyrir þróun (sami gagnagrunnur og Netlify notar).
// Keyrðu: npm run db:local   og settu svo í .env:
//   DATABASE_URL="postgres://postgres@localhost:5433/postgres"
// Gögnin eru geymd í möppunni .netlify-db/ (ekki í git).
import { NetlifyDB } from "@netlify/database-dev";

const port = Number(process.env.LOCAL_DB_PORT || 5433);
const db = new NetlifyDB({ directory: ".netlify-db", port, logger: () => {} });
const url = await db.start();
const applied = await db.applyMigrations("netlify/database/migrations");
console.log(`Gagnagrunnur keyrir: ${url}`);
console.log(applied.length ? `Nýjar migrations: ${applied.join(", ")}` : "Allar migrations voru þegar komnar inn.");
console.log("Ýttu á Ctrl+C til að stöðva.");
const stop = async () => {
  await db.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
