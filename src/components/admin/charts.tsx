import { kr, num } from "@/lib/format";

/** Einföld súlurit í SVG (engin aukasöfn). Merkingar á íslensku. */
export function BarChart({ data, height = 180, money = false, color = "#6A2833" }: { data: { label: string; value: number }[]; height?: number; money?: boolean; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / Math.max(1, data.length);
  return (
    <div>
      <svg viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label="Súlurit">
        {data.map((d, i) => {
          const h = (d.value / max) * (height / 3 - 2);
          return (
            <rect key={i} x={i * w + w * 0.15} y={height / 3 - h} width={w * 0.7} height={Math.max(h, d.value > 0 ? 0.6 : 0)} rx="0.6" fill={color} opacity={0.85}>
              <title>{`${d.label}: ${money ? kr(d.value) : num(d.value)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** Lárétt súla: t.d. trekt (funnel) */
export function HBar({ label, value, max, sub, color = "#6A2833" }: { label: string; value: number; max: number; sub?: string; color?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-muted">{num(value)}{sub ? ` · ${sub}` : ""}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-cream">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
