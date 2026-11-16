import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LemonMark } from "@/components/brand/Logo";
import { dateWithDayAcc } from "@/lib/format";

export function Hero({ hero, nextDate, nextFruits, maxPct }: { hero: { eyebrow: string; title: string; subtitle: string }; nextDate: Date | null; nextFruits: string[]; maxPct: number }) {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-pink/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-lemon/20 blur-3xl" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-8 lg:pb-24 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-green shadow-sm">
            <Icon name="leaf" className="h-4 w-4 text-leaf" /> {hero.eyebrow}
          </span>
          <h1 className="mt-5 font-display text-[2.7rem] leading-[1.02] text-burgundy sm:text-6xl lg:text-[4.4rem]">{hero.title}</h1>
          <p className="mt-5 max-w-xl text-lg text-ink/80 sm:text-xl">{hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/askrift" size="lg">Byrja í áskrift <Icon name="arrow" className="h-5 w-5" /></ButtonLink>
            <ButtonLink href="/kassar" variant="outline" size="lg">Kaupa stakan kassa</ButtonLink>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-medium text-ink/85">
            {["Um 10 dagar frá uppskeru", `Allt að ${maxPct}% afsláttur í áskrift`, "Verslað beint við bændur"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Icon name="check" className="h-5 w-5 text-leaf" /> {t}</li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <LemonMark className="absolute -left-6 -top-8 z-10 h-24 w-auto rotate-[-12deg] drop-shadow-lg sm:-left-10 sm:h-28" aria-hidden title="" />
          <div className="relative aspect-[4/4.4] overflow-hidden rounded-[2.2rem] shadow-pop sm:aspect-[4/3.6] lg:aspect-[4/4.4]">
            <Image src="/images/brand-kassi.webp" alt="Fincafresh kassi fullur af árstíðabundnum ávöxtum" fill priority sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
          </div>
          {nextDate ? (
            <Link href="#naesta-sending" className="absolute -bottom-6 left-4 right-4 rounded-2xl bg-cream-50/95 p-4 shadow-pop backdrop-blur transition hover:-translate-y-0.5 sm:left-8 sm:right-auto sm:max-w-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-leaf">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf/60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-leaf" /></span>
                Næsta sending {dateWithDayAcc(nextDate)}
              </div>
              <div className="mt-1 font-display text-lg leading-snug text-burgundy">{nextFruits.slice(0, 3).join(", ")}{nextFruits.length > 3 ? " og fleira" : ""}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-orange-600">Sjá allt í kassanum <Icon name="arrow" className="h-4 w-4" /></div>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
