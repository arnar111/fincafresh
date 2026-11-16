"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { kr } from "@/lib/format";
import { useShop } from "./ShopUI";
import type { LiteProduct } from "./types";

export function ItemPurchase({ product, soldOut }: { product: LiteProduct; soldOut?: boolean }) {
  const [qty, setQty] = useState(1);
  const { buy, pending } = useShop();
  return (
    <div className="flex gap-3">
      <div className="flex items-center rounded-full border border-line bg-white">
        <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-12 w-11 place-items-center text-burgundy" aria-label="Fækka"><Icon name="minus" className="h-4 w-4" /></button>
        <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
        <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} className="grid h-12 w-11 place-items-center text-burgundy" aria-label="Fjölga"><Icon name="plus" className="h-4 w-4" /></button>
      </div>
      <button disabled={pending || soldOut} onClick={() => buy({ product, qty })} className={buttonClass("primary", "lg", "flex-1")}>
        {soldOut ? "Uppselt" : pending ? "Augnablik…" : <>Setja í körfu · {kr(product.price * qty)}</>}
      </button>
    </div>
  );
}
