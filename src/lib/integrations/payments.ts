import "server-only";
import { getSetting } from "../settings";

/**
 * Greiðslugátt.
 * Í "test" ham er greiðsla samþykkt sjálfkrafa svo hægt sé að prófa allt kaupferlið.
 * Raunveruleg greiðslugátt (t.d. sú sem WooCommerce notar í dag) er tengd hér þegar
 * ákveðið hefur verið hvaða gátt á að nota og skjölun/lyklar liggja fyrir.
 */
export async function paymentMode() {
  return (await getSetting("payment.mode")) === "live" ? "live" : "test";
}

export async function chargeOneOff(input: { orderNumber: number; amount: number; email: string }) {
  const mode = await paymentMode();
  if (mode === "test") {
    return { ok: true as const, ref: `TEST-${input.orderNumber}-${Date.now().toString(36)}`, method: "Prófunargreiðsla" };
  }
  return { ok: false as const, error: "Engin raunveruleg greiðslugátt er tengd ennþá. Hafðu samband við vefstjóra." };
}
