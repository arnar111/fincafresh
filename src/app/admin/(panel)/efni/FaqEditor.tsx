"use client";
import { useState } from "react";
import { Input, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/admin/forms";
import { Icon } from "@/components/ui/Icon";
import type { FaqItem } from "@/lib/settings";
import { saveContent } from "./actions";

export function FaqEditor({ initial }: { initial: FaqItem[] }) {
  const [items, setItems] = useState<FaqItem[]>(initial);
  const update = (i: number, k: keyof FaqItem, v: string) => setItems((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const move = (i: number, d: -1 | 1) =>
    setItems((p) => {
      const n = [...p];
      const j = i + d;
      if (j < 0 || j >= n.length) return p;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  return (
    <form action={saveContent} className="space-y-3">
      <input type="hidden" name="section" value="faq" />
      <input type="hidden" name="faq" value={JSON.stringify(items)} />
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-line bg-cream-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-burgundy text-xs font-bold text-cream">{i + 1}</span>
            <Input value={it.q} onChange={(e) => update(i, "q", e.target.value)} placeholder="Spurning" aria-label={`Spurning ${i + 1}`} />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Færa upp" className="rounded-lg p-2 text-muted hover:bg-cream disabled:opacity-30"><Icon name="arrow" className="h-4 w-4 -rotate-90" /></button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Færa niður" className="rounded-lg p-2 text-muted hover:bg-cream disabled:opacity-30"><Icon name="arrow" className="h-4 w-4 rotate-90" /></button>
            <button type="button" onClick={() => setItems((p) => p.filter((_, j) => j !== i))} aria-label="Eyða spurningu" className="rounded-lg p-2 text-muted hover:bg-cream hover:text-danger"><Icon name="trash" className="h-4 w-4" /></button>
          </div>
          <Textarea value={it.a} onChange={(e) => update(i, "a", e.target.value)} rows={3} placeholder="Svar" aria-label={`Svar ${i + 1}`} />
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setItems((p) => [...p, { q: "", a: "" }])} className="inline-flex items-center gap-1 text-sm font-semibold text-burgundy hover:underline"><Icon name="plus" className="h-4 w-4" /> Bæta við spurningu</button>
        <SubmitButton variant="primary">Vista spurningar</SubmitButton>
      </div>
    </form>
  );
}
