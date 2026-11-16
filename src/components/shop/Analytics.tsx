"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

/** Ræsir PostHog aðeins eftir samþykki og sýnir vafrakökuborða */
export function Analytics({ posthogKey, posthogHost }: { posthogKey: string; posthogHost: string }) {
  const [consent, setConsent] = useState<string | null>("pending");
  const path = usePathname();

  useEffect(() => {
    try {
      setConsent(localStorage.getItem("ff_consent"));
    } catch {
      setConsent("necessary");
    }
  }, []);

  useEffect(() => {
    if (consent !== "all" || !posthogKey) return;
    if (!(posthog as unknown as { __loaded?: boolean }).__loaded) {
      posthog.init(posthogKey, { api_host: posthogHost, capture_pageview: false, person_profiles: "identified_only" });
    }
  }, [consent, posthogKey, posthogHost]);

  useEffect(() => {
    if (consent === "all" && (posthog as unknown as { __loaded?: boolean }).__loaded) posthog.capture("$pageview");
  }, [path, consent]);

  const choose = (v: "all" | "necessary") => {
    try {
      localStorage.setItem("ff_consent", v);
    } catch {}
    // Án samþykkis er engin lotukaka fyrir tölfræði
    if (v !== "all") document.cookie = "ff_sid=; path=/; max-age=0; SameSite=Lax";
    setConsent(v);
  };

  if (consent !== null || path.startsWith("/admin")) return null;
  return (
    <div role="dialog" aria-label="Vafrakökur" className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-xl rounded-2xl border border-line bg-cream-50 p-4 shadow-pop animate-slide-up sm:p-5">
      <p className="text-[15px] text-ink">
        <strong className="font-semibold text-burgundy">Má bjóða þér smáköku?</strong> Við notum vafrakökur til að skilja hvernig síðan er notuð og gera hana betri.
        Nauðsynlegar kökur (t.d. karfan) eru alltaf virkar. <Link href="/personuvernd" className="underline">Nánar</Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={buttonClass("dark", "sm")} onClick={() => choose("all")}>Samþykkja allt</button>
        <button className={buttonClass("light", "sm")} onClick={() => choose("necessary")}>Aðeins nauðsynlegar</button>
      </div>
    </div>
  );
}
