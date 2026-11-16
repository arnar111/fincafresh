import { db } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/admin";

export async function GET() {
  if (!(await getAdmin())) return new Response("Óheimilt", { status: 401 });
  const box = await db.product.findFirst({ where: { type: "BOX" }, orderBy: { sortOrder: "asc" } });
  return csvResponse(
    "askriftir-snidmat.csv",
    toCsv([
      ["netfang", "nafn", "sími", "kassi", "tíðni", "staða", "repeat"],
      ["jon@daemi.is", "Jón Jónsson", "6123456", box?.slug ?? "finca-classic", 1, "virk", ""],
    ])
  );
}
