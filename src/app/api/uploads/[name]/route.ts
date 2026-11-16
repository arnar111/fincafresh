import { readUpload } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" };

/** Birtir myndir sem stjórnandi hefur hlaðið upp (Netlify Blobs eða public/uploads). */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-z0-9-]+\.(jpg|png|webp|gif|avif)$/i.test(name)) return new Response("Fannst ekki", { status: 404 });
  try {
    const buf = await readUpload(name);
    if (!buf) return new Response("Fannst ekki", { status: 404 });
    const ext = name.split(".").pop()!.toLowerCase();
    return new Response(buf as unknown as BodyInit, {
      headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Fannst ekki", { status: 404 });
  }
}
