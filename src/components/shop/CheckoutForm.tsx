"use client";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { checkout, type CheckoutState } from "@/app/actions/checkout";
import { switchMode } from "@/app/actions/cart";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { inputClass } from "@/components/ui/Field";
import { kr, dateWithDayAcc, dateWithDay } from "@/lib/format";
import type { ShippingMethod } from "@/lib/settings";
import { useShop } from "./ShopUI";
import { track } from "./track";
import type { Frequency, LiteProduct } from "./types";

type Line = { key: string; name: string; image: string; qty: number; sub: boolean; lineTotal: number; product: LiteProduct; potentialSubSavings: number };
type Station = {
  id: string;
  name: string;
  address: { street: string; postalCode: string; city: string };
  googleMapsLink?: string;
  nextAvailableDeliveryTime?: { id: string; date: string; available: boolean };
  deliveryTimes: { id: string; date: string; available: boolean }[];
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CheckoutForm({
  lines,
  totals,
  methods,
  hasSubscription,
  boxCount,
  customer,
  nextDate,
  testMode,
  frequencies,
}: {
  lines: Line[];
  totals: { subtotal: number; discount: number; discountCode: string; subSavings: number };
  methods: ShippingMethod[];
  hasSubscription: boolean;
  boxCount: number;
  customer: { email: string; name: string; phone: string; kennitala: string; street: string; postalCode: string; city: string; hasPassword: boolean } | null;
  nextDate: string | null;
  testMode: boolean;
  frequencies: Frequency[];
}) {
  const [state, action, submitting] = useActionState<CheckoutState, FormData>(checkout, null);
  const [method, setMethod] = useState<ShippingMethod["id"]>(methods[0]?.id ?? "PIKKOLO");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [postal, setPostal] = useState(customer?.postalCode ?? "");
  const [city, setCity] = useState(customer?.city ?? "");
  const [stations, setStations] = useState<Station[] | null>(null);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationError, setStationError] = useState("");
  const [station, setStation] = useState<{ id: string; name: string; timeId: string; date: string } | null>(null);
  const [converting, startConvert] = useTransition();
  const { celebrate } = useShop();
  const errRef = useRef<HTMLDivElement>(null);

  const m = methods.find((x) => x.id === method) ?? null;
  const afterDiscount = totals.subtotal - totals.discount;
  const shipping = m ? (m.freeOver !== null && afterDiscount >= m.freeOver ? 0 : m.price) : 0;
  const total = Math.max(0, afterDiscount + shipping);
  const f = state?.fields ?? {};
  const singles = lines.filter((l) => !l.sub && l.product.type === "BOX");
  const potential = singles.reduce((s, l) => s + l.potentialSubSavings, 0);
  const needPassword = hasSubscription && !customer?.hasPassword;

  useEffect(() => {
    if (state?.error) errRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  const startDate = useMemo(() => {
    const d = nextDate ? new Date(nextDate) : new Date(Date.now() + 86400000);
    return d;
  }, [nextDate]);

  async function findStations() {
    if (!/^\d{3}$/.test(postal)) {
      setStationError("Sláðu inn póstnúmer (3 tölustafir).");
      return;
    }
    setLoadingStations(true);
    setStationError("");
    const end = new Date(startDate);
    end.setDate(end.getDate() + 6);
    const q = new URLSearchParams({ postalCode: postal, city: city || "Reykjavík", email, phone, boxes: String(Math.max(1, boxCount)), startDate: ymd(startDate), endDate: ymd(end) });
    try {
      const res = await fetch(`/api/pikkolo/stations?${q}`);
      const json = (await res.json()) as { stations: Station[]; best?: Station; error?: string };
      if (json.error) setStationError(json.error);
      const list = json.stations ?? [];
      if (json.best) list.sort((a, b) => (a.id === json.best!.id ? -1 : b.id === json.best!.id ? 1 : 0));
      setStations(list);
      const first = list[0];
      if (first && !station) {
        const t = first.deliveryTimes.find((x) => x.available) ?? first.nextAvailableDeliveryTime;
        if (t) setStation({ id: first.id, name: first.name, timeId: t.id, date: t.date });
      }
    } catch {
      setStationError("Náði ekki sambandi við Pikkoló. Reyndu aftur eftir smá stund.");
    } finally {
      setLoadingStations(false);
    }
  }

  useEffect(() => {
    if (method === "PIKKOLO" && /^\d{3}$/.test(postal) && stations === null) void findStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <Link href="/karfa" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-burgundy"><Icon name="arrowLeft" className="h-4 w-4" /> Til baka í körfu</Link>
      <h1 className="mt-3 font-display text-4xl text-burgundy sm:text-5xl">Ganga frá pöntun</h1>

      <form action={action} className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px] lg:gap-12" noValidate>
        <div className="space-y-6">
          {state?.error ? (
            <div ref={errRef} role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 font-medium text-danger">{state.error}</div>
          ) : null}

          {singles.length ? (
            <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-pink-100 p-5">
              <div className="flex-1">
                <div className="font-display text-xl text-burgundy">Síðasti séns: sparaðu {kr(potential)}</div>
                <p className="text-[15px] text-ink/80">Breyttu {singles.map((s) => s.name).join(" og ")} í áskrift. Enginn binditími.</p>
              </div>
              <button
                type="button"
                disabled={converting}
                onClick={() =>
                  startConvert(async () => {
                    for (const s of singles) await switchMode(s.key, frequencies[0]?.every ?? 1);
                    track("upsell_accepted", { where: "checkout" });
                    celebrate();
                  })
                }
                className={buttonClass("dark", "md")}
              >
                <Icon name="repeat" className="h-4 w-4" /> {converting ? "Augnablik…" : "Breyta í áskrift"}
              </button>
            </div>
          ) : null}

          <Step n={1} title="Tengiliðaupplýsingar">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Netfang" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={f.email} className="sm:col-span-2" />
              <Input label="Fullt nafn" name="name" autoComplete="name" required defaultValue={customer?.name} error={f.name} />
              <Input label="Símanúmer" name="phone" type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} error={f.phone} hint="Notað ef við þurfum að ná í þig vegna afhendingar" />
              <Input label="Kennitala (valfrjálst)" name="kennitala" inputMode="numeric" defaultValue={customer?.kennitala} error={f.kennitala} className="sm:col-span-2" />
            </div>
          </Step>

          <Step n={2} title="Afhending">
            {nextDate ? <p className="-mt-1 mb-4 text-[15px] text-muted">Pöntunin kemur með sendingunni <strong className="text-ink">{dateWithDayAcc(nextDate)}</strong>.</p> : null}
            <input type="hidden" name="deliveryMethod" value={method} />
            <div className="grid gap-3" role="radiogroup" aria-label="Afhendingarmáti">
              {methods.map((x) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={method === x.id}
                  key={x.id}
                  onClick={() => setMethod(x.id)}
                  className={cn("flex items-start gap-3 rounded-2xl border bg-white p-4 text-left transition", method === x.id ? "border-2 border-burgundy shadow-soft" : "border-line hover:border-burgundy/40")}
                >
                  <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", method === x.id ? "border-burgundy" : "border-line")}>
                    {method === x.id ? <span className="h-2.5 w-2.5 rounded-full bg-burgundy" /> : null}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between gap-2 font-semibold">
                      <span className="inline-flex items-center gap-2"><Icon name={x.id === "PIKKOLO" ? "pin" : x.id === "HOME" ? "truck" : "home"} className="h-5 w-5 text-burgundy" /> {x.label}</span>
                      <span>{x.price === 0 || (x.freeOver !== null && afterDiscount >= x.freeOver) ? "Frítt" : kr(x.price)}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{x.description}</span>
                  </span>
                </button>
              ))}
            </div>

            {method === "PIKKOLO" ? (
              <div className="mt-5 rounded-2xl bg-cream-100 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <Input label="Póstnúmer" name="postalCode" inputMode="numeric" maxLength={3} value={postal} onChange={(e) => setPostal(e.target.value.replace(/\D/g, ""))} className="w-32" />
                  <Input label="Staður" name="city" value={city} onChange={(e) => setCity(e.target.value)} className="min-w-40 flex-1" />
                  <button type="button" onClick={findStations} disabled={loadingStations} className={buttonClass("green", "md")}>
                    {loadingStations ? "Leita…" : stations ? "Leita aftur" : "Finna stöðvar"}
                  </button>
                </div>
                {stationError ? <p className="mt-3 text-sm font-medium text-danger">{stationError}</p> : null}
                {f.pikkoloStationId ? <p className="mt-3 text-sm font-semibold text-danger">{f.pikkoloStationId}</p> : null}
                {stations?.length ? (
                  <ul className="mt-4 grid gap-2.5" aria-label="Pikkoló stöðvar">
                    {stations.slice(0, 8).map((st, i) => {
                      const times = st.deliveryTimes.filter((t) => t.available);
                      const chosen = station?.id === st.id;
                      return (
                        <li key={st.id}>
                          <div className={cn("rounded-2xl border bg-white p-3.5 transition", chosen ? "border-2 border-leaf shadow-soft" : "border-line")}>
                            <button
                              type="button"
                              onClick={() => {
                                const t = times[0] ?? st.nextAvailableDeliveryTime;
                                if (t) setStation({ id: st.id, name: st.name, timeId: t.id, date: t.date });
                              }}
                              className="flex w-full items-start gap-3 text-left"
                            >
                              <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", chosen ? "border-leaf" : "border-line")}>{chosen ? <span className="h-2.5 w-2.5 rounded-full bg-leaf" /> : null}</span>
                              <span className="flex-1">
                                <span className="flex flex-wrap items-center gap-2 font-semibold">
                                  {st.name}
                                  {i === 0 ? <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-xs font-bold text-leaf">Mælt með</span> : null}
                                </span>
                                <span className="block text-sm text-muted">{st.address.street}, {st.address.postalCode} {st.address.city}</span>
                              </span>
                              {st.googleMapsLink ? <a href={st.googleMapsLink} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="text-sm font-medium text-burgundy underline">Kort</a> : null}
                            </button>
                            {chosen && times.length > 1 ? (
                              <div className="mt-3 flex flex-wrap gap-1.5 pl-8">
                                {times.slice(0, 7).map((t) => (
                                  <button key={t.id} type="button" onClick={() => setStation({ id: st.id, name: st.name, timeId: t.id, date: t.date })} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", station?.timeId === t.id ? "border-leaf bg-leaf text-white" : "border-line bg-white hover:border-leaf")}>
                                    {dateWithDay(t.date).replace(/^(\S+)/, (s) => s.charAt(0).toUpperCase() + s.slice(1))}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : stations && !stationError ? (
                  <p className="mt-3 text-sm text-muted">Engar stöðvar fundust fyrir þetta póstnúmer. Prófaðu annað póstnúmer eða veldu heimsendingu.</p>
                ) : null}
                <input type="hidden" name="pikkoloStationId" value={station?.id ?? ""} />
                <input type="hidden" name="pikkoloStationName" value={station?.name ?? ""} />
                <input type="hidden" name="pikkoloDeliveryTimeId" value={station?.timeId ?? ""} />
              </div>
            ) : null}

            {method === "HOME" ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_120px_1fr]">
                <Input label="Heimilisfang" name="street" autoComplete="street-address" defaultValue={customer?.street} error={f.street} />
                <Input label="Póstnúmer" name="postalCode" inputMode="numeric" maxLength={3} value={postal} onChange={(e) => setPostal(e.target.value.replace(/\D/g, ""))} error={f.postalCode} />
                <Input label="Staður" name="city" value={city} onChange={(e) => setCity(e.target.value)} error={f.city} />
              </div>
            ) : null}
          </Step>

          <Step n={3} title={needPassword ? "Aðgangur að áskriftinni" : "Aðgangur (valfrjálst)"}>
            {customer?.hasPassword ? (
              <p className="text-[15px] text-muted">Þú ert skráð(ur) inn sem {customer.email}. Pöntunin og áskriftir birtast á Mínum síðum.</p>
            ) : (
              <>
                <p className="mb-3 text-[15px] text-muted">
                  {needPassword ? "Búðu til lykilorð svo þú getir sleppt sendingu, gert hlé eða breytt áskriftinni á Mínum síðum." : "Búðu til lykilorð ef þú vilt geta skoðað pantanir á Mínum síðum."}
                </p>
                <Input label="Lykilorð" name="password" type="password" autoComplete="new-password" minLength={8} required={needPassword} error={f.password} hint="A.m.k. 8 stafir" className="max-w-sm" />
              </>
            )}
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-semibold">Athugasemd (valfrjálst)</span>
              <textarea name="customerNote" rows={2} className={cn(inputClass, "min-h-0")} placeholder="Eitthvað sem við eigum að vita?" />
            </label>
          </Step>

          <Step n={4} title="Greiðsla">
            {testMode ? (
              <div className="flex gap-3 rounded-2xl border border-dashed border-orange/60 bg-orange/5 p-4 text-[15px]">
                <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                <div>
                  <strong className="text-orange-600">Prófunarhamur.</strong> Engin greiðsla er tekin. Þegar greiðslugátt hefur verið tengd birtist kortagreiðsla hér.
                </div>
              </div>
            ) : null}
            <label className="mt-4 flex items-start gap-3 text-[15px]">
              <input type="checkbox" name="terms" className="mt-1 h-5 w-5 accent-[#6A2833]" required />
              <span>Ég hef lesið og samþykki <Link href="/skilmalar" target="_blank" className="underline">skilmála</Link> og <Link href="/personuvernd" target="_blank" className="underline">persónuverndarstefnu</Link> Fincafresh.</span>
            </label>
            {f.terms ? <p className="mt-1 text-sm font-semibold text-danger">{f.terms}</p> : null}
            <label className="mt-3 flex items-start gap-3 text-[15px]">
              <input type="checkbox" name="marketing" className="mt-1 h-5 w-5 accent-[#6A2833]" />
              <span>Já takk, sendið mér fréttir af næstu sendingum og tilboðum.</span>
            </label>
          </Step>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-line bg-cream-50 p-6 shadow-soft">
            <h2 className="font-display text-2xl text-burgundy">Pöntunin þín</h2>
            <ul className="mt-4 space-y-3">
              {lines.map((l) => (
                <li key={l.key} className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sand">
                    <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-burgundy px-1 text-[11px] font-bold text-cream">{l.qty}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{l.name}</div>
                    <div className="text-xs text-muted">{l.sub ? "Áskrift" : l.product.type === "BOX" ? "Stakur kassi" : "Vara"}</div>
                  </div>
                  <div className="text-sm font-semibold">{kr(l.lineTotal)}</div>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[15px]">
              <div className="flex justify-between"><dt className="text-muted">Millisamtala</dt><dd>{kr(totals.subtotal)}</dd></div>
              {totals.subSavings > 0 ? <div className="flex justify-between text-leaf"><dt>Áskriftarafsláttur (innifalinn)</dt><dd>-{kr(totals.subSavings)}</dd></div> : null}
              {totals.discount > 0 ? <div className="flex justify-between text-leaf"><dt>Afsláttarkóði {totals.discountCode}</dt><dd>-{kr(totals.discount)}</dd></div> : null}
              <div className="flex justify-between"><dt className="text-muted">Sending ({m?.label ?? "veldu"})</dt><dd>{shipping === 0 ? "Frítt" : kr(shipping)}</dd></div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="font-semibold">Samtals</span>
              <span className="font-display text-3xl text-burgundy">{kr(total)}</span>
            </div>
            <button disabled={submitting} className={buttonClass("primary", "lg", "mt-5 w-full")}>
              {submitting ? "Augnablik…" : <><Icon name="lock" className="h-5 w-5" /> {testMode ? "Staðfesta pöntun" : `Greiða ${kr(total)}`}</>}
            </button>
            {station && method === "PIKKOLO" ? <p className="mt-3 text-center text-sm text-muted">Sótt í Pikkoló: {station.name}, {dateWithDayAcc(station.date)}</p> : null}
          </div>
        </aside>
      </form>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-cream-50 p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 font-display text-2xl text-burgundy">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-burgundy font-sans text-sm font-bold text-cream">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Input({ label, error, hint, className, ...p }: React.ComponentProps<"input"> & { label: string; error?: string; hint?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <input className={cn(inputClass, error && "border-danger ring-2 ring-danger/15")} aria-invalid={!!error || undefined} {...p} />
      {error ? <span className="mt-1 block text-xs font-semibold text-danger">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
