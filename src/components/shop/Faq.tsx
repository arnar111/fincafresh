import { Icon } from "@/components/ui/Icon";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line rounded-3xl border border-line bg-cream-50">
      {items.map((it, i) => (
        <details key={i} className="group px-5 py-4 sm:px-6" open={i === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl text-burgundy">
            {it.q}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white transition group-open:rotate-45"><Icon name="plus" className="h-4 w-4" /></span>
          </summary>
          <p className="mt-3 whitespace-pre-line text-[16px] text-ink/80">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
