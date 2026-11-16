import { NextResponse } from "next/server";
import { trackLocal } from "@/lib/analytics";

/**
 * Tekur við atburðum úr vafranum (sendir með navigator.sendBeacon).
 * Öryggi: aðeins atburðir sem vafrinn sendir í raun eru leyfðir. Kaup, áskriftir og karfa eru skráð
 * á netþjóni og er ekki hægt að falsa héðan. Stærð er takmörkuð og gildi hreinsuð.
 */
const CLIENT_EVENTS = new Set(["product_viewed", "fruit_info_opened", "upsell_shown", "upsell_accepted", "upsell_declined", "checkout_started"]);
const MAX_BODY = 2048;

function cleanProps(input: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!input || typeof input !== "object") return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>).slice(0, 10)) {
    const key = k.slice(0, 40);
    if (typeof v === "string") out[key] = v.slice(0, 100);
    else if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "boolean") out[key] = v;
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return NextResponse.json({ ok: false }, { status: 413 });
    const body = JSON.parse(raw) as { name?: unknown; props?: unknown; productId?: unknown; sid?: unknown };
    const name = typeof body.name === "string" ? body.name : "";
    if (!CLIENT_EVENTS.has(name)) return NextResponse.json({ ok: false }, { status: 400 });
    const productId = typeof body.productId === "string" && /^[a-z0-9]{10,40}$/i.test(body.productId) ? body.productId : null;
    const sid = typeof body.sid === "string" ? body.sid.replace(/[^a-z0-9]/gi, "").slice(0, 64) : "";
    await trackLocal(name, cleanProps(body.props), sid, productId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
