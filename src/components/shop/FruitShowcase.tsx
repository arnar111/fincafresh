"use client";
import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Modal, CloseButton } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { FruitArt } from "@/components/brand/FruitArt";
import { cn } from "@/components/ui/cn";
import { kr } from "@/lib/format";
import type { LiteFruit, LiteProduct } from "./types";
import { track } from "./track";

function FruitBubble({ fruit, onOpen, size = "md" }: { fruit: LiteFruit; onOpen: () => void; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "h-28 w-28 sm:h-32 sm:w-32" : "h-24 w-24 sm:h-28 sm:w-28";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col items-center gap-3 rounded-3xl p-2 text-center focus-visible:outline-offset-4"
      aria-label={`${fruit.name}: lesa meira${fruit.deluxeOnly ? " (aðeins í Delúx)" : ""}`}
    >
      <span className={cn("relative block", fruit.deluxeOnly && "gold-ring")}>
        <span
          className={cn("relative grid place-items-center overflow-hidden rounded-full transition duration-300 group-hover:-translate-y-1 group-hover:shadow-soft", dim)}
          style={{ background: `color-mix(in oklab, ${fruit.color} 22%, #FCF8F1)` }}
        >
          {fruit.imageUrl ? (
            <Image src={fruit.imageUrl} alt="" fill sizes="128px" className="object-cover" />
          ) : (
            <FruitArt kind={fruit.illustration} className="h-[68%] w-[68%] transition duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]" title="" />
          )}
        </span>
        {fruit.deluxeOnly ? (
          <>
            <span className="sparkle -right-1 top-1" style={{ animationDelay: "0s" }} />
            <span className="sparkle -left-2 top-1/2" style={{ animationDelay: ".8s" }} />
            <span className="sparkle bottom-0 right-3" style={{ animationDelay: "1.6s" }} />
            <span className="absolute -bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-[#FFE27A] via-lemon to-[#E0A100] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-burgundy-900 shadow-[0_4px_14px_rgb(217_164_0/.55)]">
              <Icon name="crown" className="h-3.5 w-3.5" /> Delúx
            </span>
          </>
        ) : null}
      </span>
      <span className={cn("font-semibold leading-tight", fruit.deluxeOnly ? "mt-1 text-cream" : "text-ink")}>{fruit.name}</span>
      <span className={cn("-mt-2 inline-flex items-center gap-1 text-xs font-medium opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100", fruit.deluxeOnly ? "text-lemon" : "text-burgundy")}>
        Lesa meira <Icon name="arrow" className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

/** Gluggi með upplýsingum um ávöxt. Hægt að fletta á milli ávaxta. */
export function FruitModal({
  fruits,
  index,
  onClose,
  onIndex,
  delux,
}: {
  fruits: LiteFruit[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  delux?: LiteProduct | null;
}) {
  const f = fruits[index];
  if (!f) return null;
  const prev = () => onIndex((index - 1 + fruits.length) % fruits.length);
  const next = () => onIndex((index + 1) % fruits.length);
  const rows: [string, string, string][] = [
    ["Bragð", f.taste, "heart"],
    ["Hvernig veit ég að ávöxturinn er tilbúinn?", f.ripeness, "eye"],
    ["Geymsla", f.storage, "thermometer"],
    ["Gott að vita", f.goodToKnow, "sparkle"],
  ];
  return (
    <Modal open onClose={onClose} labelledBy="avoxtur-titill" className="overflow-hidden p-0" side="center">
      <div
        className="relative px-6 pb-6 pt-8"
        style={{ background: f.deluxeOnly ? "linear-gradient(160deg,#3A151C 0%,#6A2833 100%)" : `color-mix(in oklab, ${f.color} 24%, #FCF8F1)` }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") prev();
          if (e.key === "ArrowRight") next();
        }}
      >
        <CloseButton onClick={onClose} className="absolute right-4 top-4 z-10" />
        <div className="flex flex-col items-center text-center">
          <div className={cn("relative", f.deluxeOnly && "gold-ring")}>
            <div className="relative grid h-40 w-40 place-items-center overflow-hidden rounded-full bg-white/70 sm:h-44 sm:w-44">
              {f.imageUrl ? <Image src={f.imageUrl} alt={f.name} fill sizes="176px" className="object-cover" /> : <FruitArt kind={f.illustration} className="h-[72%] w-[72%] animate-pop-in" />}
            </div>
            {f.deluxeOnly ? <span className="sparkle -right-2 top-3" /> : null}
          </div>
          {f.deluxeOnly ? (
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FFE27A] via-lemon to-[#E0A100] px-3 py-1 text-xs font-bold uppercase tracking-wide text-burgundy-900 shadow-[0_0_18px_rgb(249_194_20/.6)]">
              <Icon name="crown" className="h-4 w-4" /> Aðeins í Delúx kassanum
            </span>
          ) : null}
          <h2 id="avoxtur-titill" className={cn("mt-3 font-display text-3xl", f.deluxeOnly ? "text-cream" : "text-burgundy")}>{f.name}</h2>
          <div className={cn("mt-2 flex flex-wrap justify-center gap-1.5 text-xs font-semibold", f.deluxeOnly ? "text-cream/90" : "text-burgundy-900")}>
            {f.variety ? <Chip dark={f.deluxeOnly}>Afbrigði: {f.variety}</Chip> : null}
            {f.origin ? <Chip dark={f.deluxeOnly}><Icon name="pin" className="h-3.5 w-3.5" /> {[f.region, f.origin].filter(Boolean).join(", ")}</Chip> : null}
            {f.season ? <Chip dark={f.deluxeOnly}><Icon name="sun" className="h-3.5 w-3.5" /> {f.season}</Chip> : null}
            {f.farmer ? <Chip dark={f.deluxeOnly}><Icon name="leaf" className="h-3.5 w-3.5" /> {f.farmer}</Chip> : null}
          </div>
          {f.description ? <p className={cn("mt-4 max-w-md text-[15.5px]", f.deluxeOnly ? "text-cream/90" : "text-ink/85")}>{f.description}</p> : null}
        </div>
      </div>
      <div className="space-y-3 px-6 py-5">
        {rows.filter(([, v]) => v).map(([label, value, icon]) => (
          <div key={label} className="flex gap-3 rounded-2xl bg-white p-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-burgundy"><Icon name={icon} className="h-[18px] w-[18px]" /></span>
            <div>
              <div className="text-sm font-semibold text-burgundy">{label}</div>
              <div className="text-[15px] text-ink/85">{value}</div>
            </div>
          </div>
        ))}
        {f.deluxeOnly && delux ? (
          <Link href={`/kassar/${delux.slug}`} onClick={onClose} className={buttonClass("primary", "lg", "w-full")}>
            Fáðu {f.name} í Delúx kassanum · {kr(delux.subPrice)} í áskrift
          </Link>
        ) : null}
        {fruits.length > 1 ? (
          <div className="flex items-center justify-between pt-1">
            <button onClick={prev} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-burgundy hover:bg-burgundy/5">
              <Icon name="arrowLeft" className="h-4 w-4" /> {fruits[(index - 1 + fruits.length) % fruits.length].name}
            </button>
            <span className="text-xs text-muted">{index + 1} / {fruits.length}</span>
            <button onClick={next} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-burgundy hover:bg-burgundy/5">
              {fruits[(index + 1) % fruits.length].name} <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function Chip({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1", dark ? "bg-white/10" : "bg-white/70")}>{children}</span>;
}

/**
 * "Hvað er í næstu sendingu?": venjulegir ávextir í hring + sérstakt gullið Delúx svæði
 * svo aukaávextirnir í Delúx kassanum fari ekki framhjá neinum.
 */
export function FruitShowcase({ fruits, delux, compact = false }: { fruits: LiteFruit[]; delux: LiteProduct | null; compact?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const regular = fruits.filter((f) => !f.deluxeOnly);
  const deluxe = fruits.filter((f) => f.deluxeOnly);
  const ordered = [...regular, ...deluxe];
  const openFruit = useCallback(
    (f: LiteFruit) => {
      const i = ordered.findIndex((x) => x.id === f.id);
      setOpen(i);
      track("fruit_info_opened", { fruit: f.slug, deluxe: f.deluxeOnly });
    },
    [ordered]
  );

  return (
    <div>
      <ul className={cn("grid gap-x-2 gap-y-6", compact ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 min-[460px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5")}>
        {regular.map((f) => (
          <li key={f.id}><FruitBubble fruit={f} onOpen={() => openFruit(f)} /></li>
        ))}
      </ul>

      {deluxe.length ? (
        <div className="relative mt-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-burgundy-900 via-burgundy to-burgundy-700 px-5 py-8 text-cream shadow-pop sm:px-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lemon/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-pink/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center">
            <div className="lg:w-[34%]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FFE27A] via-lemon to-[#E0A100] px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-burgundy-900 shadow-[0_0_20px_rgb(249_194_20/.55)]">
                <Icon name="crown" className="h-4 w-4" /> Aðeins í Delúx
              </span>
              <h3 className="mt-3 font-display text-3xl leading-tight text-cream sm:text-[2.2rem]">Aukaávextir sem fást hvergi annars staðar</h3>
              <p className="mt-2 text-[15.5px] text-cream/85">
                Í Delúx kassanum færðu allt úr hinum kössunum <em>og</em> þessa sérvöldu ávexti. Smelltu á ávöxt til að lesa um hann.
              </p>
              {delux ? (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link href={`/kassar/${delux.slug}`} className={buttonClass("primary", "md")}>
                    Skoða Delúx <Icon name="arrow" className="h-4 w-4" />
                  </Link>
                  <span className="text-sm text-cream/80">
                    frá <strong className="text-lemon">{kr(delux.subPrice)}</strong> í áskrift
                  </span>
                </div>
              ) : null}
            </div>
            <ul className="grid flex-1 grid-cols-2 gap-x-2 gap-y-8 min-[460px]:grid-cols-3">
              {deluxe.map((f) => (
                <li key={f.id}><FruitBubble fruit={f} onOpen={() => openFruit(f)} size="lg" /></li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {open !== null ? <FruitModal fruits={ordered} index={open} onIndex={setOpen} onClose={() => setOpen(null)} delux={delux} /> : null}
    </div>
  );
}
