"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { kr } from "@/lib/format";
import { useShop } from "./ShopUI";
import type { LiteProduct } from "./types";

/** Kassaval með rofa: Áskrift (sjálfgefið) eða stakur kassi */
export function BoxChooser({ boxes }: { boxes: LiteProduct[] }) {
  const [sub, setSub] = useState(true);
  const { buy, pending } = useShop();
  const maxPct = Math.max(...boxes.map((b) => b.subDiscountPct));

  return (
    <div>
      <div className="mb-10 flex justify-center">
        <div className="inline-flex rounded-full bg-white p-1.5 shadow-sm" role="radiogroup" aria-label="Kaupmáti">
          <button role="radio" aria-checked={sub} onClick={() => setSub(true)} className={cn("inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold transition", sub ? "bg-burgundy text-cream shadow" : "text-ink hover:text-burgundy")}>
            Áskrift <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", sub ? "bg-lemon text-burgundy-900" : "bg-lemon-100 text-burgundy")}>allt að -{maxPct}%</span>
          </button>
          <button role="radio" aria-checked={!sub} onClick={() => setSub(false)} className={cn("rounded-full px-5 py-2.5 text-[15px] font-semibold transition", !sub ? "bg-burgundy text-cream shadow" : "text-ink hover:text-burgundy")}>
            Stakur kassi
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {boxes.map((b) => {
          const isDelux = b.tier === "DELUX";
          const price = sub ? b.subPrice : b.price;
          return (
            <article key={b.id} className={cn("group relative flex flex-col rounded-[1.75rem] border bg-cream-50 p-4 transition hover:-translate-y-1 hover:shadow-pop", isDelux ? "border-transparent ring-2 ring-lemon shadow-[0_0_0_6px_rgb(249_194_20/.15),0_30px_60px_-30px_rgb(217_164_0/.7)]" : "border-line")}>
              {isDelux ? (
                <span className="absolute -top-3 left-6 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FFE27A] via-lemon to-[#E0A100] px-3 py-1 text-xs font-bold uppercase tracking-wide text-burgundy-900 shadow-[0_6px_18px_rgb(217_164_0/.5)]">
                  <Icon name="crown" className="h-4 w-4" /> Sælkerakassi
                </span>
              ) : null}
              <Link href={`/kassar/${b.slug}`} className="relative block aspect-[1.05] overflow-hidden rounded-2xl bg-sand">
                <Image src={b.image} alt={b.name} fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
                {sub ? (
                  <span className="absolute right-3 top-3 rounded-full bg-leaf px-2.5 py-1 text-xs font-bold text-white shadow">-{b.subDiscountPct}% í áskrift</span>
                ) : null}
              </Link>
              <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
                <div className="text-xs font-bold uppercase tracking-[.12em] text-orange-600">{b.tagline}</div>
                <h3 className="mt-1 font-display text-[1.7rem] leading-tight text-burgundy"><Link href={`/kassar/${b.slug}`}>{b.name}</Link></h3>
                <p className="mt-2 text-[15px] text-muted">{b.shortDescription}</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {b.features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-leaf" /> {f}</li>
                  ))}
                </ul>
                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-ink">{kr(price)}</span>
                      {sub ? <span className="text-sm text-muted line-through">{kr(b.price)}</span> : b.compareAtPrice ? <span className="text-sm text-muted line-through">{kr(b.compareAtPrice)}</span> : null}
                    </div>
                    <div className="text-sm text-muted">{sub ? <span className="font-semibold text-leaf">Sparar {kr(b.price - b.subPrice)} á kassa</span> : "stakur kassi"}</div>
                  </div>
                  <button disabled={pending} onClick={() => buy({ product: b, sub, every: 1 })} className={buttonClass("primary", "md")}>
                    Velja
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
