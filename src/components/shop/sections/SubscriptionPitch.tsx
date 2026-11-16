import { Section, Eyebrow, H2 } from "./Section";
import { Icon } from "@/components/ui/Icon";
import { SavingsCalculator } from "../SavingsCalculator";
import type { LiteProduct } from "../types";

export function SubscriptionPitch({ boxes, title = "Áskrift er einfaldasta (og ódýrasta) leiðin" }: { boxes: LiteProduct[]; title?: string }) {
  const maxPct = Math.max(0, ...boxes.map((b) => b.subDiscountPct));
  const perks = [
    ["leaf", `Allt að ${maxPct}% afsláttur`, "Afslátturinn gildir á hverja einustu sendingu, ekki bara þá fyrstu."],
    ["calendar", "Þú ræður ferðinni", "Slepptu sendingu, gerðu hlé eða breyttu kassanum á Mínum síðum."],
    ["heart", "Enginn binditími", "Segðu upp hvenær sem er, með einum smelli."],
    ["truck", "Gleymir aldrei að panta", "Kassinn kemur sjálfkrafa með sendingunni sem þú velur."],
  ];
  return (
    <Section tone="pink">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <Eyebrow className="text-burgundy">Af hverju áskrift?</Eyebrow>
          <H2>{title}</H2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {perks.map(([icon, t, d]) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-burgundy shadow-sm"><Icon name={icon} /></span>
                <div>
                  <div className="font-semibold text-burgundy-900">{t}</div>
                  <div className="text-[15px] text-ink/75">{d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <SavingsCalculator boxes={boxes} />
      </div>
    </Section>
  );
}
