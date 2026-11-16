import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getAdmin } from "@/lib/auth";

// Myndir sem stjórnandi hleður upp eru vistaðar í public/uploads og birtar í gegnum /api/uploads/[nafn]
// (Next.js birtir ekki skrár sem bætast í public/ eftir "build", þess vegna fer birtingin í gegnum route).
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Þú þarft að vera innskráð(ur)." }, { status: 401 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Engin skrá fannst í sendingunni." }, { status: 400 });
  }
  const files = form.getAll("file").filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f);
  if (!files.length) return NextResponse.json({ error: "Engin skrá valin." }, { status: 400 });

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const urls: string[] = [];
  for (const f of files) {
    const ext = ALLOWED[f.type];
    if (!ext) return NextResponse.json({ error: `Skráin "${f.name}" er ekki mynd (leyfð snið: JPG, PNG, WEBP, GIF, AVIF).` }, { status: 400 });
    if (f.size > MAX_BYTES) return NextResponse.json({ error: `Skráin "${f.name}" er of stór (hámark 8 MB).` }, { status: 400 });
    const name = `${Date.now().toString(36)}-${randomBytes(5).toString("hex")}.${ext}`;
    await writeFile(path.join(dir, name), Buffer.from(await f.arrayBuffer()));
    urls.push(`/api/uploads/${name}`);
  }
  return NextResponse.json({ urls });
}
