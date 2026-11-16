"use client";
import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Modal, CloseButton } from "@/components/ui/Modal";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { kr } from "@/lib/format";
import { addToCart } from "@/app/actions/cart";
import { getRecommendations } from "@/app/actions/shop";
import type { Frequency, LiteProduct } from "./types";
import { UpsellModal } from "./UpsellModal";
import { FruitBurst } from "./Confetti";
import { track } from "./track";

type AddArgs = { product: LiteProduct; qty?: number; sub?: boolean; every?: number };

type Ctx = {
  /** Setur í körfu. Ef stakur kassi er valinn er fyrst boðið upp á áskrift. */
  buy: (a: AddArgs) => void;
  pending: boolean;
  celebrate: () => void;
};

const ShopCtx = createContext<Ctx | null>(null);

export function useShop() {
  const c = useContext(ShopCtx);
  if (!c) throw new Error("useShop verður að vera innan ShopUIProvider");
  return c;
}

export function ShopUIProvider({ children, frequencies, upsell }: { children: ReactNode; frequencies: Frequency[]; upsell: { enabled: boolean; title: string; body: string } }) {
  const [pending, start] = useTransition();
  const [drawer, setDrawer] = useState<{ product: LiteProduct; qty: number; sub: boolean; every: number } | null>(null);
  const [recs, setRecs] = useState<LiteProduct[]>([]);
  const [upsellFor, setUpsellFor] = useState<AddArgs | null>(null);
  const [burst, setBurst] = useState(0);

  const doAdd = useCallback((a: AddArgs) => {
    const sub = !!a.sub && a.product.type === "BOX";
    start(async () => {
      const res = await addToCart({ productId: a.product.id, qty: a.qty ?? 1, sub, every: a.every ?? 1 });
      if (!res.ok) return;
      setDrawer({ product: a.product, qty: a.qty ?? 1, sub, every: a.every ?? 1 });
      setRecs([]);
      getRecommendations([a.product.id], 3).then(setRecs).catch(() => setRecs([]));
    });
  }, []);

  const buy = useCallback(
    (a: AddArgs) => {
      if (a.product.type === "BOX" && !a.sub && upsell.enabled) {
        setUpsellFor(a);
        track("upsell_shown", { where: "add" }, a.product.id);
        return;
      }
      doAdd(a);
    },
    [doAdd, upsell.enabled]
  );

  const celebrate = useCallback(() => setBurst((b) => b + 1), []);

  return (
    <ShopCtx.Provider value={{ buy, pending, celebrate }}>
      {children}
      <FruitBurst fire={burst} />
      {upsellFor ? (
        <UpsellModal
          product={upsellFor.product}
          qty={upsellFor.qty ?? 1}
          frequencies={frequencies}
          title={upsell.title}
          body={upsell.body}
          onClose={() => setUpsellFor(null)}
          onAccept={(every) => {
            track("upsell_accepted", { every }, upsellFor.product.id);
            setBurst((b) => b + 1);
            doAdd({ ...upsellFor, sub: true, every });
            setUpsellFor(null);
          }}
          onDecline={() => {
            track("upsell_declined", {}, upsellFor.product.id);
            doAdd({ ...upsellFor, sub: false });
            setUpsellFor(null);
          }}
        />
      ) : null}
      <Modal open={!!drawer} onClose={() => setDrawer(null)} side="right" labelledBy="karfa-titill" className="flex flex-col bg-cream">
        {drawer ? (
          <div className="flex min-h-full flex-col">
            <div className="flex items-center justify-between px-5 pb-2 pt-5">
              <h2 id="karfa-titill" className="flex items-center gap-2 font-display text-2xl text-burgundy">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-leaf text-white"><Icon name="check" className="h-5 w-5" /></span>
                Komið í körfuna
              </h2>
              <CloseButton onClick={() => setDrawer(null)} />
            </div>
            <div className="mx-5 mt-3 flex gap-4 rounded-2xl bg-white p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-sand">
                <Image src={drawer.product.image} alt="" fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-lg leading-tight text-burgundy">{drawer.product.name}</div>
                <div className="text-sm text-muted">
                  {drawer.qty} × {drawer.sub ? kr(drawer.product.subPrice) : kr(drawer.product.price)}
                  {drawer.sub ? ` · ${frequencies.find((f) => f.every === drawer.every)?.label ?? "Áskrift"}` : ""}
                </div>
                {drawer.sub ? (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2 py-0.5 text-xs font-semibold text-leaf">
                    <Icon name="leaf" className="h-3.5 w-3.5" /> Þú sparar {kr((drawer.product.price - drawer.product.subPrice) * drawer.qty)} á hverri sendingu
                  </div>
                ) : null}
              </div>
            </div>
            {recs.length ? (
              <div className="mt-6 px-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-leaf">Aðrir keyptu líka</h3>
                <ul className="space-y-2">
                  {recs.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white/70 p-2 pr-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sand">
                        <Image src={r.image} alt="" fill sizes="56px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/vorur/${r.slug}`} onClick={() => setDrawer(null)} className="block truncate font-semibold text-ink hover:text-burgundy">{r.name}</Link>
                        <div className="text-sm text-muted">{kr(r.price)}</div>
                      </div>
                      <button
                        onClick={() => doAdd({ product: r })}
                        disabled={pending}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green text-cream hover:bg-green-700 disabled:opacity-50"
                        aria-label={`Setja ${r.name} í körfu`}
                      >
                        <Icon name="plus" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-auto space-y-2 p-5">
              <Link href="/karfa" onClick={() => setDrawer(null)} className={buttonClass("primary", "lg", "w-full")}>Fara í körfu</Link>
              <button onClick={() => setDrawer(null)} className={buttonClass("light", "lg", "w-full")}>Halda áfram að versla</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </ShopCtx.Provider>
  );
}
