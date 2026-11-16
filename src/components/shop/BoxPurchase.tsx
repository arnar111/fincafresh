"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { kr } from "@/lib/format";
import { useShop } from "./ShopUI";
import type { Frequency, LiteProduct } from "./types";

export function BoxPurchase({ box, boxes, frequencies }: { box: LiteProduct; boxes: LiteProduct[]; frequencies: Frequency[] }) {
  const [mode, setMode] = useState<"sub" | "one">("sub");
  const [every, setEvery] = useState(frequencies[0]?.every ?? 1);
  const [qty, setQty] = useState(1);
  const { buy, pending } = useShop();
  const unit = mode === "sub" ? box.subPrice : box.price;

  return (
    <div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Stærð</legend>
        <div className="grid grid-cols-3 gap-2.5">
          {boxes.map((b) => {
            const active = b.id === box.id;
            return (
              <Link
                key={b.id}
                href={`/kassar/${b.slug}`}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "relative rounded-2xl border bg-cream-50 p-3 transition sm:p-4",
                  active ? "border-2 border-burgundy shadow-soft" : "border-line hover:border-burgundy/40",
                  b.tier === "DELUX" && !active && "ring-1 ring-lemon/70"
                )}
              >
                {b.tier === "DELUX" ? <Icon name="crown" className="absolute right-2.5 top-2.5 h-4 w-4 text-gold" /> : null}
                <div className="font-display text-lg leading-tight text-burgundy">{b.name.replace("Finca ", "")}</div>
                <div className="mt-0.5 text-xs text-muted">{[b.weightLabel, b.suitsFor].filter(Boolean).join(" · ")}</div>
                <div className="mt-1.5 text-sm font-semibold">{kr(mode === "sub" ? b.subPrice : b.price)}</div>
              </Link>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-semibold">Kaupmáti</legend>
        <div className="space-y-2.5">
          <label className={cn("block cursor-pointer rounded-2xl border bg-cream-50 p-4 transition", mode === "sub" ? "border-2 border-leaf bg-leaf/[.04] shadow-soft" : "border-line hover:border-burgundy/40")}>
            <div className="flex items-start gap-3">
              <input type="radio" name="kaupmati" className="mt-1 h-5 w-5 accent-[#248A36]" checked={mode === "sub"} onChange={() => setMode("sub")} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">Áskrift</span>
                  <span className="rounded-full bg-leaf px-2.5 py-0.5 text-xs font-bold text-white">Sparaðu {kr(box.price - box.subPrice)} (-{box.subDiscountPct}%)</span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-2 text-sm">
                  <span className="font-semibold text-ink">{kr(box.subPrice)}</span>
                  <span className="text-muted line-through">{kr(box.price)}</span>
                  <span className="text-muted">á kassa · enginn binditími</span>
                </div>
                {mode === "sub" && frequencies.length > 1 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {frequencies.map((f) => (
                      <button key={f.every} type="button" onClick={(e) => { e.preventDefault(); setEvery(f.every); }} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", every === f.every ? "border-burgundy bg-burgundy text-cream" : "border-line bg-white hover:border-burgundy/50")}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </label>
          <label className={cn("block cursor-pointer rounded-2xl border bg-cream-50 p-4 transition", mode === "one" ? "border-2 border-burgundy shadow-soft" : "border-line hover:border-burgundy/40")}>
            <div className="flex items-start gap-3">
              <input type="radio" name="kaupmati" className="mt-1 h-5 w-5 accent-[#6A2833]" checked={mode === "one"} onChange={() => setMode("one")} />
              <div className="flex flex-1 items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">Stakur kassi</div>
                  <div className="text-sm text-muted">Ein stök sending</div>
                </div>
                <span className="font-semibold">{kr(box.price)}</span>
              </div>
            </div>
          </label>
        </div>
      </fieldset>

      <div className="mt-6 flex gap-3">
        <div className="flex items-center rounded-full border border-line bg-white">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-12 w-11 place-items-center text-burgundy" aria-label="Fækka"><Icon name="minus" className="h-4 w-4" /></button>
          <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} className="grid h-12 w-11 place-items-center text-burgundy" aria-label="Fjölga"><Icon name="plus" className="h-4 w-4" /></button>
        </div>
        <button disabled={pending} onClick={() => buy({ product: box, qty, sub: mode === "sub", every })} className={buttonClass("primary", "lg", "flex-1")}>
          {pending ? "Augnablik…" : <>Setja í körfu · {kr(unit * qty)}</>}
        </button>
      </div>
      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink/85">
        {["Um 10 dagar frá uppskeru", "Beint frá bóndanum", "Aðeins það sem er í árstíð"].map((t) => (
          <li key={t} className="flex items-center gap-1.5"><Icon name="check" className="h-4 w-4 text-leaf" /> {t}</li>
        ))}
      </ul>
    </div>
  );
}
