"use client";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { useShop } from "./ShopUI";
import type { LiteProduct } from "./types";

export function AddToCartIcon({ product }: { product: LiteProduct }) {
  const { buy, pending } = useShop();
  return (
    <button
      onClick={() => buy({ product })}
      disabled={pending}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green text-cream transition hover:scale-105 hover:bg-green-700 disabled:opacity-50"
      aria-label={`Setja ${product.name} í körfu`}
    >
      <Icon name="plus" />
    </button>
  );
}

export function AddToCartLarge({ product, qty = 1 }: { product: LiteProduct; qty?: number }) {
  const { buy, pending } = useShop();
  return (
    <button onClick={() => buy({ product, qty })} disabled={pending} className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
      {pending ? "Augnablik…" : "Setja í körfu"}
    </button>
  );
}
