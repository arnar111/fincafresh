"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, CloseButton } from "@/components/ui/Modal";
import { cn } from "@/components/ui/cn";
import { kr, dateLong, dateWithDayAcc } from "@/lib/format";
import { skipNext, pauseSub, resumeSub, changeBox, changeFrequency, changeQty, cancelSub, retentionSaved, reactivateSub } from "@/app/actions/account";
import type { Frequency, LiteProduct } from "./types";

export type SubLite = {
  id: string;
  status: string;
  skipNext: boolean;
  pausedUntil: string | null;
  quantity: number;
  everyNthDelivery: number;
  unitPrice: number;
  discountPct: number;
  productId: string;
  productName: string;
  productImage: string;
  deliveryLabel: string;
  createdAt: string;
  /** Satt ef sendingu er sleppt (merki eða pöntun sem var hætt við) */
  skipping: boolean;
  /** Nákvæm lýsing á hvaða sendingu er sleppt */
  skipText: string | null;
  /** Kassinn í næstu sendingu er þegar greiddur/í vinnslu: "sleppa" gildir um sendinguna þar á eftir */
  nextLocked: boolean;
};

const REASONS = ["Of mikið af ávöxtum", "Of dýrt", "Er að fara í frí", "Líkaði ekki innihaldið", "Afhendingin hentar ekki", "Annað"];

export function SubscriptionCard({ sub, boxes, frequencies, nextDate }: { sub: SubLite; boxes: LiteProduct[]; frequencies: Frequency[]; nextDate: string | null }) {
  const [pending, start] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [edit, setEdit] = useState(false);
  const unit = Math.round((sub.unitPrice * (100 - sub.discountPct)) / 100);
  const saved = (sub.unitPrice - unit) * sub.quantity;
  const smaller = boxes.filter((b) => b.price < sub.unitPrice).sort((a, b) => b.price - a.price)[0];
  const freqLabel = frequencies.find((f) => f.every === sub.everyNthDelivery)?.label ?? `Á ${sub.everyNthDelivery}. hverri sendingu`;
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); });

  const statusBadge =
    sub.status === "ACTIVE" ? <Badge tone="green">Virk</Badge> : sub.status === "PAUSED" ? <Badge tone="lemon">Í hléi</Badge> : <Badge tone="muted">Sagt upp</Badge>;

  return (
    <article className={cn("overflow-hidden rounded-3xl border border-line bg-cream-50 shadow-soft", pending && "opacity-70")}>
      <div className="flex flex-wrap items-start gap-4 p-5 sm:p-6">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-sand">
          <Image src={sub.productImage} alt="" fill sizes="96px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl text-burgundy">{sub.quantity > 1 ? `${sub.quantity} × ` : ""}{sub.productName}</h3>
            {statusBadge}
          </div>
          <div className="mt-1 text-[15px] text-muted">{freqLabel} · {kr(unit * sub.quantity)} á sendingu · {sub.deliveryLabel}</div>
          {sub.status !== "CANCELLED" ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-leaf/10 px-2.5 py-1 text-sm font-semibold text-leaf">
              <Icon name="leaf" className="h-4 w-4" /> Þú sparar {kr(saved)} á hverri sendingu
            </div>
          ) : null}
        </div>
      </div>

      {sub.status === "ACTIVE" ? (
        <div className="border-t border-line/70 bg-white/60 px-5 py-4 sm:px-6">
          {nextDate ? (
            <p className="mb-3 text-[15px]">
              {sub.skipping && sub.skipText ? (
                <><Icon name="skip" className="mr-1 inline h-4 w-4 text-orange-600" /> {sub.skipText}</>
              ) : (
                <><Icon name="calendar" className="mr-1 inline h-4 w-4 text-leaf" /> Næsta sending: <strong>{dateWithDayAcc(nextDate)}</strong></>
              )}
            </p>
          ) : null}
          {!sub.skipping && sub.nextLocked ? (
            <p className="-mt-1 mb-3 text-sm text-muted">Kassinn í næstu sendingu er þegar frágenginn, svo „Sleppa“ gildir um sendinguna þar á eftir.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button disabled={pending} onClick={() => run(() => skipNext(sub.id, !sub.skipping))} className={buttonClass("light", "sm")}>
              <Icon name="skip" className="h-4 w-4" /> {sub.skipping ? "Hætta við að sleppa" : "Sleppa næstu sendingu"}
            </button>
            <button disabled={pending} onClick={() => run(() => pauseSub(sub.id, 4))} className={buttonClass("light", "sm")}><Icon name="pause" className="h-4 w-4" /> Gera hlé í 4 vikur</button>
            <button disabled={pending} onClick={() => setEdit((e) => !e)} className={buttonClass("light", "sm")}><Icon name="edit" className="h-4 w-4" /> Breyta áskrift</button>
            <button disabled={pending} onClick={() => setCancelOpen(true)} className="rounded-full px-3 py-2 text-sm font-medium text-muted underline-offset-2 hover:text-danger hover:underline">Segja upp</button>
          </div>
        </div>
      ) : sub.status === "PAUSED" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 bg-lemon-100/60 px-5 py-4 sm:px-6">
          <span className="text-[15px]">Í hléi{sub.pausedUntil ? ` til ${dateLong(sub.pausedUntil)}` : ""}. Áskriftin fer sjálfkrafa aftur af stað.</span>
          <button disabled={pending} onClick={() => run(() => resumeSub(sub.id))} className={buttonClass("dark", "sm")}><Icon name="play" className="h-4 w-4" /> Halda áfram núna</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 bg-white/60 px-5 py-4 sm:px-6">
          <span className="text-[15px] text-muted">Áskriftinni hefur verið sagt upp.</span>
          <button disabled={pending} onClick={() => run(() => reactivateSub(sub.id))} className={buttonClass("primary", "sm")}><Icon name="repeat" className="h-4 w-4" /> Byrja aftur</button>
        </div>
      )}

      {edit && sub.status === "ACTIVE" ? (
        <div className="space-y-5 border-t border-line/70 px-5 py-5 sm:px-6">
          <div>
            <div className="mb-2 text-sm font-semibold">Kassi</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {boxes.map((b) => (
                <button key={b.id} disabled={pending || b.id === sub.productId} onClick={() => run(() => changeBox(sub.id, b.id))} className={cn("rounded-2xl border p-3 text-left transition", b.id === sub.productId ? "border-2 border-burgundy bg-white" : "border-line bg-white hover:border-burgundy/50")}>
                  <div className="font-display text-lg text-burgundy">{b.name}</div>
                  <div className="text-sm text-muted">{kr(b.subPrice)} í áskrift</div>
                </button>
              ))}
            </div>
          </div>
          {frequencies.length > 1 ? (
            <div>
              <div className="mb-2 text-sm font-semibold">Hversu oft</div>
              <div className="flex flex-wrap gap-2">
                {frequencies.map((f) => (
                  <button key={f.every} disabled={pending} onClick={() => run(() => changeFrequency(sub.id, f.every))} className={cn("rounded-full border px-3.5 py-2 text-sm font-medium", f.every === sub.everyNthDelivery ? "border-burgundy bg-burgundy text-cream" : "border-line bg-white hover:border-burgundy/50")}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <div className="mb-2 text-sm font-semibold">Fjöldi kassa</div>
            <div className="inline-flex items-center rounded-full border border-line bg-white">
              <button disabled={pending || sub.quantity <= 1} onClick={() => run(() => changeQty(sub.id, sub.quantity - 1))} className="grid h-10 w-10 place-items-center text-burgundy" aria-label="Fækka"><Icon name="minus" className="h-4 w-4" /></button>
              <span className="w-6 text-center font-semibold">{sub.quantity}</span>
              <button disabled={pending} onClick={() => run(() => changeQty(sub.id, sub.quantity + 1))} className="grid h-10 w-10 place-items-center text-burgundy" aria-label="Fjölga"><Icon name="plus" className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} labelledBy={`uppsogn-${sub.id}`} className="p-0">
        <div className="relative bg-pink-100 px-6 pb-5 pt-7">
          <CloseButton onClick={() => setCancelOpen(false)} className="absolute right-4 top-4" />
          <h2 id={`uppsogn-${sub.id}`} className="font-display text-3xl text-burgundy">Áður en þú ferð…</h2>
          <p className="mt-2 text-[15px] text-ink/80">Þú sparar {kr(saved)} á hverri sendingu. Kannski hentar eitthvað af þessu betur?</p>
        </div>
        <div className="space-y-2.5 p-6">
          <Alt icon="pause" title="Gera hlé í 4 vikur" text="Fullkomið ef þú ert að fara í frí. Fer sjálfkrafa aftur af stað." onClick={() => run(async () => { await retentionSaved(sub.id, "pause"); await pauseSub(sub.id, 4); setCancelOpen(false); })} />
          <Alt icon="skip" title="Sleppa bara næstu sendingu" text="Þú missir ekki afsláttinn." onClick={() => run(async () => { await retentionSaved(sub.id, "skip"); await skipNext(sub.id, true); setCancelOpen(false); })} />
          {smaller ? (
            <Alt icon="box" title={`Skipta í ${smaller.name}`} text={`Minni kassi á ${kr(smaller.subPrice)} í áskrift.`} onClick={() => run(async () => { await retentionSaved(sub.id, "downgrade"); await changeBox(sub.id, smaller.id); setCancelOpen(false); })} />
          ) : null}
          {frequencies.length > 1 && sub.everyNthDelivery === 1 ? (
            <Alt icon="calendar" title="Fá kassann sjaldnar" text={frequencies[1].label + "."} onClick={() => run(async () => { await retentionSaved(sub.id, "less_often"); await changeFrequency(sub.id, frequencies[1].every); setCancelOpen(false); })} />
          ) : null}
          <details className="mt-4 rounded-2xl border border-line bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-muted">Nei takk, ég vil segja upp</summary>
            <label className="mt-3 block text-sm font-semibold" htmlFor={`astaeda-${sub.id}`}>Má spyrja af hverju? (hjálpar okkur að verða betri)</label>
            <select id={`astaeda-${sub.id}`} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5">
              <option value="">Veldu ástæðu</option>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <button disabled={pending} onClick={() => run(async () => { await cancelSub(sub.id, reason); setCancelOpen(false); })} className={buttonClass("danger", "md", "mt-3 w-full")}>Staðfesta uppsögn</button>
          </details>
        </div>
      </Modal>
    </article>
  );
}

function Alt({ icon, title, text, onClick }: { icon: string; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 text-left transition hover:border-leaf hover:shadow-soft">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf/10 text-leaf"><Icon name={icon} /></span>
      <span className="flex-1"><span className="block font-semibold">{title}</span><span className="text-sm text-muted">{text}</span></span>
      <Icon name="arrow" className="h-5 w-5 text-muted" />
    </button>
  );
}
