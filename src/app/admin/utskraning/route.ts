import { NextResponse } from "next/server";
import { logoutAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  await logoutAdmin();
  return NextResponse.redirect(new URL("/admin/innskraning", req.url), 303);
}
