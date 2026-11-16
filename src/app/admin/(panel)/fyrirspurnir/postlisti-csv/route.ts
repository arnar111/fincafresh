import { db } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/admin";
import { dateTime } from "@/lib/format";

/** Póstlisti sem CSV (opnast í Excel). Inniheldur líka viðskiptavini sem samþykktu markpóst. */
export async function GET() {
  if (!(await getAdmin())) return new Response("Óheimilt", { status: 401 });
  const [subs, customers] = await Promise.all([
    db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } }),
    db.customer.findMany({ where: { marketingOptIn: true }, select: { email: true, name: true, createdAt: true } }),
  ]);
  const seen = new Set<string>();
  const rows: (string | number)[][] = [["Netfang", "Nafn", "Hvaðan", "Skráð"]];
  for (const s of subs) {
    if (seen.has(s.email)) continue;
    seen.add(s.email);
    rows.push([s.email, "", s.source === "footer" ? "Póstlisti á síðu" : s.source, dateTime(s.createdAt)]);
  }
  for (const c of customers) {
    if (seen.has(c.email)) continue;
    seen.add(c.email);
    rows.push([c.email, c.name, "Viðskiptavinur (samþykkti markpóst)", dateTime(c.createdAt)]);
  }
  return csvResponse(`postlisti-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
}
