import { NextResponse } from "next/server";
import { getAvailableStations } from "@/lib/integrations/pikkolo";

// Stöðvaleit fyrir greiðsluferlið. Kallar á Pikkoló frá netþjóni svo vafri þurfi ekki SDK.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const res = await getAvailableStations({
    postalCode: u.searchParams.get("postalCode") ?? "",
    city: u.searchParams.get("city") ?? "",
    street: u.searchParams.get("street") ?? "",
    email: u.searchParams.get("email") ?? "",
    phone: u.searchParams.get("phone") ?? "",
    refrigerated: Number(u.searchParams.get("boxes") ?? "1") || 1,
    startDate: u.searchParams.get("startDate") || undefined,
    endDate: u.searchParams.get("endDate") || undefined,
  });
  return NextResponse.json(res);
}
