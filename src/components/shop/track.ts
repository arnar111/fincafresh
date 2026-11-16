"use client";
import posthog from "posthog-js";

// Nafnlaust auðkenni lotunnar, aðeins notað ef notandi hefur samþykkt tölfræðivafrakökur
function sid(): string {
  try {
    if (localStorage.getItem("ff_consent") !== "all") return "";
    let s = sessionStorage.getItem("ff_sid");
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("ff_sid", s);
    }
    // Sama auðkenni í lotukökku svo atburðir sem netþjónninn skráir (karfa, pöntun) tengist sömu lotu
    if (!document.cookie.includes(`ff_sid=${s}`)) document.cookie = `ff_sid=${s}; path=/; SameSite=Lax`;
    return s;
  } catch {
    return "";
  }
}

/** Skráir atburð: alltaf nafnlaust í eigin gagnagrunn, og í PostHog ef samþykki er fyrir hendi */
export function track(name: string, props: Record<string, unknown> = {}, productId?: string) {
  try {
    const body = JSON.stringify({ name, props, productId, sid: sid() });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    if ((posthog as unknown as { __loaded?: boolean }).__loaded) posthog.capture(name, { ...props, product_id: productId });
  } catch {
    /* mælingar mega aldrei brjóta síðuna */
  }
}
