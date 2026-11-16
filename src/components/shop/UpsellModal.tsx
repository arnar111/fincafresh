"use client";
import { useState } from "react";
import Image from "next/image";
import { Modal, CloseButton } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { LemonMark } from "@/components/brand/Logo";
import { kr } from "@/lib/format";
import { CountUp } from "./Confetti";
import type { Frequency, LiteProduct } from "./types";

/**
 * Birtist þegar viðskiptavinur velur STAKAN kassa.
 * Sýnir svart á hvítu hvað sparast með áskrift og býður að skipta með einum smelli.
 */
export function UpsellModal({
  product,
  qty,
  frequencies,
  title,
  body,
  onClose,
  onAccept,
  onDecline,
}: {
  product: LiteProduct;
  qty: number;
  frequencies: Frequency[];
  title: string;
  body: string;
  onClose: () => void;
  onAccept: (every: number) => void;
  onDecline: () => void;
}) {
  const [every, setEvery] = useState(frequencies[0]?.every ?? 1);
  const perBox = product.price - product.subPrice;
  const perDelivery = perBox * qty;
  const tenBoxes = perBox * 10;

  return (
    <Modal open onClose={onClose} labelledBy="upsell-titill" className="overflow-hidden p-0">
      <div className="relative bg-pink-100 px-6 pb-6 pt-7 text-center">
        <CloseButton onClick={onClose} className="absolute right-4 top-4" />
        <LemonMark className="mx-auto h-16 w-auto animate-wiggle" title="" aria-hidden />
        <h2 id="upsell-titill" className="mt-2 font-display text-[1.7rem] leading-tight text-burgundy">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink/85">{body}</p>
      </div>

      <div className="px-6 pb-6 pt-5">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sand">
            <Image src={product.image} alt="" fill sizes="56px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg leading-tight text-burgundy">{product.name}</div>
            <div className="text-sm text-muted">{product.tagline}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3" role="group" aria-label="Verðsamanburður">
          <div className="rounded-2xl border border-line bg-cream-50 p-4 text-center">
            <div className="text-xs font-bold uppercase tracking-[.12em] text-muted">Stakur kassi</div>
            <div className="mt-1 font-display text-2xl text-ink/60 line-through decoration-orange/70 decoration-2">{kr(product.price)}</div>
            <div className="text-xs text-muted">á kassa</div>
          </div>
          <div className="relative rounded-2xl border-2 border-leaf bg-leaf/5 p-4 text-center">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-leaf px-2.5 py-0.5 text-xs font-bold text-white">-{product.subDiscountPct}%</span>
            <div className="text-xs font-bold uppercase tracking-[.12em] text-leaf">Í áskrift</div>
            <div className="mt-1 font-display text-2xl text-burgundy">{kr(product.subPrice)}</div>
            <div className="text-xs text-muted">á kassa</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-lemon-100 px-4 py-3 text-center">
          <div className="text-[15px] text-burgundy-900">
            Þú sparar <strong className="font-display text-xl"><CountUp value={perDelivery} format={kr} /></strong> á hverri sendingu
          </div>
          <div className="text-sm text-burgundy-900/75">Á 10 kössum eru það {kr(tenBoxes)} sem verða eftir í veskinu.</div>
        </div>

        <ul className="mt-4 space-y-1.5 text-[15px]">
          {["Enginn binditími, segðu upp hvenær sem er", "Slepptu sendingu eða gerðu hlé á Mínum síðum", "Afslátturinn gildir á hverja einustu sendingu"].map((t) => (
            <li key={t} className="flex items-start gap-2"><Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-leaf" /> {t}</li>
          ))}
        </ul>

        {frequencies.length > 1 ? (
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-semibold">Hversu oft?</legend>
            <div className="flex flex-wrap gap-2">
              {frequencies.map((f) => (
                <label key={f.every} className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition ${every === f.every ? "border-burgundy bg-burgundy text-cream" : "border-line bg-white hover:border-burgundy/50"}`}>
                  <input type="radio" name="tidni" className="sr-only" checked={every === f.every} onChange={() => setEvery(f.every)} />
                  {f.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <button data-autofocus onClick={() => onAccept(every)} className={buttonClass("primary", "lg", "mt-5 w-full")}>
          Já takk, áskrift og spara {kr(perDelivery)}
        </button>
        <button onClick={onDecline} className="mt-2 w-full rounded-full py-2.5 text-sm font-medium text-muted underline-offset-2 hover:text-burgundy hover:underline">
          Nei takk, ég vil bara stakan kassa
        </button>
      </div>
    </Modal>
  );
}
