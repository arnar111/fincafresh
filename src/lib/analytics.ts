import "server-only";
import { db } from "./db";

/** Eigin atburðaskráning í gagnagrunn: knýr greiningu í stjórnborði, líka án PostHog. */
export async function trackLocal(name: string, props: Record<string, unknown> = {}, sessionId = "", productId?: string | null) {
  try {
    await db.analyticsEvent.create({ data: { name, sessionId, productId: productId ?? null, props: JSON.stringify(props) } });
  } catch (e) {
    console.error("[analytics]", e);
  }
}

export const TRACKED_EVENTS = [
  "product_viewed",
  "fruit_info_opened",
  "add_to_cart",
  "upsell_shown",
  "upsell_accepted",
  "upsell_declined",
  "cart_converted_to_subscription",
  "checkout_started",
  "order_completed",
  "subscription_started",
  "subscription_cancel_prevented",
  "subscription_cancelled",
] as const;
