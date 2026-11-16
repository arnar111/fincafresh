"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Frequency } from "@/lib/settings";

export function FrequencyEditor({ initial }: { initial: Frequency[] }) {
  const [items, setItems] = useState<Frequency[]>(initial);
  return (
    <div>
      <input type="hidden" name="frequencies" value={JSON.stringify(items)} />
      <div className="mb-1.5 text-sm font-semibold text-ink">Hversu oft geta áskrifendur fengið kassa?</div>
      <div className="space-y-2">
        {items.map((f, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-cream-50 p-2">
            <span className="text-sm text-muted">Á</span>
            <select
              value={f.every}
              onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, every: Number(e.target.value) } : x)))}
              className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
              aria-label="Hversu oft"
            >
              {[1, 2, 3, 4, 6, 8].map((n) => <option key={n} value={n}>{n === 1 ? "hverri sendingu" : `${n}. hverri sendingu`}</option>)}
            </select>
            <span className="text-sm text-muted">heiti:</span>
            <input
              value={f.label}
              onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              className="min-w-48 flex-1 rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
              aria-label="Heiti sem viðskiptavinurinn sér"
            />
            <button type="button" onClick={() => setItems((p) => p.filter((_, j) => j !== i))} aria-label="Fjarlægja" className="rounded-lg p-2 text-muted hover:bg-cream hover:text-danger"><Icon name="trash" className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setItems((p) => [...p, { every: 4, label: "Í fjórðu hverri sendingu" }])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-burgundy hover:underline"><Icon name="plus" className="h-4 w-4" /> Bæta við möguleika</button>
    </div>
  );
}
