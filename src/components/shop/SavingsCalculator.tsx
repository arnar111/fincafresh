"use client";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { kr } from "@/lib/format";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useShop } from "./ShopUI";
import type { LiteProduct } from "./types";

/** Sparnaðarreiknir: notandi velur kassa og fjölda kassa, sér hvað sparast */
export function SavingsCalculator({ boxes }: { boxes: LiteProduct[] }) {
  const [id, setId] = useState(boxes.find((b) => b.tier === "GRANDE")?.id ?? boxes[0]?.id);
  const [count, setCount] = useState(12);
  const { buy, pending, celebrate } = useShop();
  const box = boxes.find((b) => b.id === id) ?? boxes[0];
  if (!box) return null;
  const saved = (box.price - box.subPrice) * count;
  const pct = Math.min(100, (saved / Math.max(1, box.price * 3)) * 100);

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
      <h3 className="font-display text-2xl text-burgundy">Hvað sparar þú?</h3>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Veldu kassa">
        {boxes.map((b) => (
          <button key={b.id} role="radio" aria-checked={b.id === id} onClick={() => setId(b.id)} className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition", b.id === id ? "border-burgundy bg-burgundy text-cream" : "border-line hover:border-burgundy/50")}>
            {b.name.replace("Finca ", "")} <span className="opacity-75">-{b.subDiscountPct}%</span>
          </button>
        ))}
      </div>
      <label className="mt-6 block">
        <span className="flex items-baseline justify-between text-sm font-semibold">
          <span>Fjöldi kassa</span>
          <span className="font-display text-xl text-burgundy">{count}</span>
        </span>
        <input type="range" min={1} max={26} value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-2 w-full accent-[#6A2833]" />
      </label>
      <div className="mt-6 rounded-2xl bg-lemon-100 p-5">
        <div className="text-sm font-semibold text-burgundy-900/80">Þú sparar</div>
        <div className="font-display text-4xl text-burgundy">{kr(saved)}</div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/70" aria-hidden>
          <div className="h-full rounded-full bg-gradient-to-r from-lemon to-orange transition-all duration-500" style={{ width: `${Math.max(6, pct)}%` }} />
        </div>
        <div className="mt-2 text-sm text-burgundy-900/80">
          {kr(box.subPrice)} í stað {kr(box.price)} á hvern kassa
        </div>
      </div>
      <button
        disabled={pending}
        onClick={() => {
          celebrate();
          buy({ product: box, sub: true, every: 1 });
        }}
        className={buttonClass("primary", "lg", "mt-5 w-full")}
      >
        <Icon name="repeat" className="h-5 w-5" /> Byrja í áskrift á {box.name}
      </button>
    </div>
  );
}
