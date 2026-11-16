import { NextResponse } from "next/server";
import { startCustomerSession, verifyMagicToken } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = await verifyMagicToken(url.searchParams.get("t") ?? "");
  if (!id) return NextResponse.redirect(new URL("/minar-sidur/innskraning?utrunnid=1", req.url));
  await startCustomerSession(id);
  return NextResponse.redirect(new URL("/minar-sidur", req.url));
}
