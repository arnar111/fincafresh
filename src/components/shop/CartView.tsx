"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { buttonClass, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { kr, plural, dateWithDayAcc } from "@/lib/format";
import { setQty, removeLine, switchMode, applyCode, removeCode } from "@/app/actions/cart";
import { LemonMark } from "@/components/brand/Logo";
import { useShop } from "./ShopUI";
import { track } from "./track";
import type { Frequency, LiteProduct } from "./types";
import { AddToCartIcon } from "./AddToCartButton";

export type CartLineLite = {
  key: string;
  product: LiteProduct;
  qty: number;
  sub: boolean;
  every: number;
  unitPrice: number;
  lineTotal: number;
  potentialSubSavings: number;
  subSavings: number;
};

export function CartView({
  lines,
  summary,
  recs,
  frequencies,
  nextDate,
}: {
  lines: CartLineLite[];
  summary: { subtotal: number; discount: number; discountCode: string; total: number; subSavings: number; potentialSubSavings: number; count: number };
  recs: LiteProduct[];
  frequencies: Frequency[];
  nextDate: string | null;
}) {
  const [pending, start] = useTransition();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const { celebrate } = useShop();
  const freqLabel = (n: number) => frequencies.find((f) => f.every === n)?.label ?? `Á ${n}. hverri sendingu`;
  const singleBoxes = lines.filter((l) => !l.sub && l.product.type === "BOX");

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <LemonMark className="mx-auto h-28 w-auto" title="" aria-hidden />
        <h1 className="mt-6 font-display text-4xl text-burgundy">Karfan er tóm</h1>
        <p className="mt-3 text-lg text-muted">Það er nóg pláss fyrir ferska ávexti hérna.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/kassar" size="lg">Skoða kassana</ButtonLink>
          <ButtonLink href="/netverslun" variant="outline" size="lg">Netverslun</ButtonLink>
        </div>
      </div>
    );
  }

  const toSub = (l: CartLineLite) => {
    start(async () => {
      await switchMode(l.key, frequencies[0]?.every ?? 1);
      track("upsell_accepted", { where: "cart" }, l.product.id);
      celebrate();
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <Link href="/kassar" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-burgundy">
        <Icon name="arrowLeft" className="h-4 w-4" /> Halda áfram að versla
      </Link>
      <h1 className="mt-3 font-display text-5xl text-burgundy">
        Karfan þín <span className="align-middle font-sans text-lg font-normal text-muted">{plural(summary.count, "vara", "vörur")}</span>
      </h1>

      <div className={cn("mt-8 grid gap-8 lg:grid-cols-[1fr_400px] lg:gap-12", pending && "opacity-70 transition")}>
        <div>
          {summary.subSavings > 0 ? (
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-leaf/10 px-4 py-3 text-[15px] text-leaf">
              <Icon name="leaf" className="h-5 w-5 shrink-0" />
              <span><strong>Vel gert!</strong> Þú sparar {kr(summary.subSavings)} á hverri sendingu með áskrift.</span>
            </div>
          ) : null}

          <ul className="divide-y divide-line/80 border-y border-line/80">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-4 py-5">
                <Link href={l.product.type === "BOX" ? `/kassar/${l.product.slug}` : `/vorur/${l.product.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-sand sm:h-28 sm:w-28">
                  <Image src={l.product.image} alt="" fill sizes="112px" className="object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-display text-xl leading-tight text-burgundy">{l.product.name}</div>
                    <div className="mt-0.5 text-sm text-muted">
                      {l.sub ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-leaf"><Icon name="repeat" className="h-4 w-4" /> Áskrift · {freqLabel(l.every)}</span>
                      ) : l.product.type === "BOX" ? (
                        "Stakur kassi"
                      ) : (
                        `${kr(l.unitPrice)} stk.`
                      )}
                    </div>
                    {l.product.type === "BOX" ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {l.sub ? (
                          <>
                            {frequencies.length > 1
                              ? frequencies.map((f) => (
                                  <button key={f.every} disabled={pending || f.every === l.every} onClick={() => start(() => switchMode(l.key, f.every))} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold transition", f.every === l.every ? "border-leaf bg-leaf/10 text-leaf" : "border-line bg-white hover:border-burgundy/50")}>
                                    {f.label}
                                  </button>
                                ))
                              : null}
                            <button disabled={pending} onClick={() => start(() => switchMode(l.key, null))} className="rounded-full px-2.5 py-1 text-xs font-medium text-muted underline-offset-2 hover:underline">
                              Breyta í stakan kassa
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    <button disabled={pending} onClick={() => start(() => removeLine(l.key))} className="mt-2 text-sm text-muted underline underline-offset-2 hover:text-danger">Fjarlægja</button>
                  </div>
                  <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                    <div className="flex items-center rounded-full border border-line bg-white">
                      <button disabled={pending} onClick={() => start(() => setQty(l.key, l.qty - 1))} className="grid h-10 w-10 place-items-center text-burgundy" aria-label={`Fækka ${l.product.name}`}><Icon name="minus" className="h-4 w-4" /></button>
                      <span className="w-6 text-center font-semibold tabular-nums">{l.qty}</span>
                      <button disabled={pending} onClick={() => start(() => setQty(l.key, l.qty + 1))} className="grid h-10 w-10 place-items-center text-burgundy" aria-label={`Fjölga ${l.product.name}`}><Icon name="plus" className="h-4 w-4" /></button>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{kr(l.lineTotal)}</div>
                      {l.sub ? <div className="text-xs text-muted line-through">{kr(l.product.price * l.qty)}</div> : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {singleBoxes.map((l) => (
            <div key={l.key} className="relative mt-5 overflow-hidden rounded-3xl bg-pink-100 p-5 sm:p-6">
              <LemonMark className="absolute -right-4 -top-4 h-24 w-auto rotate-12 opacity-90" title="" aria-hidden />
              <div className="relative max-w-lg">
                <div className="text-xs font-bold uppercase tracking-[.14em] text-burgundy">Snjallt ráð</div>
                <h2 className="mt-1 font-display text-2xl text-burgundy">Breyttu {l.product.name} í áskrift og sparaðu {kr(l.potentialSubSavings)}</h2>
                <p className="mt-1 text-[15px] text-ink/80">
                  Sama kassi á {kr(l.product.subPrice)} í stað {kr(l.product.price)}, enginn binditími og þú getur sleppt sendingu hvenær sem er.
                </p>
                <button disabled={pending} onClick={() => toSub(l)} className={buttonClass("dark", "md", "mt-4")}>
                  <Icon name="repeat" className="h-4 w-4" /> Já, breyta í áskrift
                </button>
              </div>
            </div>
          ))}

          {recs.length ? (
            <div className="mt-10">
              <h2 className="mb-4 font-display text-2xl text-burgundy">Aðrir keyptu líka</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {recs.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 pr-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sand"><Image src={r.image} alt="" fill sizes="64px" className="object-cover" /></div>
                    <div className="min-w-0 flex-1">
                      <Link href={r.type === "BOX" ? `/kassar/${r.slug}` : `/vorur/${r.slug}`} className="block truncate font-semibold hover:text-burgundy">{r.name}</Link>
                      <div className="text-sm text-muted">{kr(r.price)}</div>
                    </div>
                    <AddToCartIcon product={r} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-line bg-cream-50 p-6 shadow-soft">
            <h2 className="font-display text-2xl text-burgundy">Samantekt</h2>
            <dl className="mt-4 space-y-2.5 text-[15px]">
              <div className="flex justify-between"><dt className="text-muted">Millisamtala</dt><dd className="font-semibold">{kr(summary.subtotal)}</dd></div>
              {summary.subSavings > 0 ? <div className="flex justify-between text-leaf"><dt>Áskriftarafsláttur (innifalinn)</dt><dd className="font-semibold">-{kr(summary.subSavings)}</dd></div> : null}
              {summary.discount > 0 ? (
                <div className="flex justify-between text-leaf">
                  <dt className="flex items-center gap-1.5">
                    Afsláttarkóði {summary.discountCode}
                    <button onClick={() => start(() => removeCode())} className="text-xs text-muted underline">fjarlægja</button>
                  </dt>
                  <dd className="font-semibold">-{kr(summary.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between"><dt className="text-muted">Sending</dt><dd className="text-muted">Reiknast í næsta skrefi</dd></div>
            </dl>
            {!summary.discountCode ? (
              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCodeError("");
                  start(async () => {
                    const r = await applyCode(code);
                    if (!r.ok) setCodeError(r.error);
                    else setCode("");
                  });
                }}
              >
                <div className="flex rounded-full border border-line bg-white p-1">
                  <label htmlFor="afslattarkodi" className="sr-only">Afsláttarkóði</label>
                  <input id="afslattarkodi" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Afsláttarkóði eða gjafabréf" className="min-w-0 flex-1 bg-transparent px-3 text-[15px] focus:outline-none" />
                  <button disabled={!code || pending} className="rounded-full bg-green px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">Virkja</button>
                </div>
                {codeError ? <p className="mt-2 text-sm font-medium text-danger" role="alert">{codeError}</p> : null}
              </form>
            ) : null}
            <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
              <span className="font-semibold">Samtals</span>
              <span className="font-display text-3xl text-burgundy">{kr(summary.total)}</span>
            </div>
            {summary.potentialSubSavings > 0 ? (
              <p className="mt-2 rounded-xl bg-lemon-100 px-3 py-2 text-sm text-burgundy-900">
                Þú gætir sparað <strong>{kr(summary.potentialSubSavings)}</strong> á hverri sendingu með áskrift.
              </p>
            ) : null}
            <Link href="/greidsla" className={buttonClass("primary", "lg", "mt-5 w-full")}>Ganga frá pöntun</Link>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted"><Icon name="lock" className="h-4 w-4" /> Örugg greiðsla</p>
            {nextDate ? <p className="mt-3 text-center text-sm text-muted">Kemur með sendingunni {dateWithDayAcc(nextDate)}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
