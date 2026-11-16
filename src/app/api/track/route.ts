import { NextResponse } from "next/server";
import { trackLocal, TRACKED_EVENTS } from "@/lib/analytics";

// Tekur við nafnlausum atburðum úr vafranum (sendir með navigator.sendBeacon)
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: string; props?: Record<string, unknown>; productId?: string; sid?: string };
    if (!body.name || !(TRACKED_EVENTS as readonly string[]).includes(body.name)) return NextResponse.json({ ok: false }, { status: 400 });
    await trackLocal(body.name, body.props ?? {}, (body.sid ?? "").slice(0, 64), body.productId ?? null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
