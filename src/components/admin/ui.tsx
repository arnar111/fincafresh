import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/ui/Badge";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/orders";
import { SUB_STATUS_LABELS } from "@/lib/subscriptions";

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-burgundy">
            <Icon name="arrowLeft" className="h-4 w-4" /> {back.label}
          </Link>
        ) : null}
        <h1 className="font-display text-3xl text-burgundy sm:text-[2.1rem]">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-[15px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, description, actions, children, className, padded = true }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white shadow-[0_1px_0_rgb(0_0_0/.02)]", className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-5 py-4">
          <div>
            {title ? <h2 className="font-display text-lg text-burgundy">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon, tone = "default", href }: { label: string; value: ReactNode; hint?: ReactNode; icon?: string; tone?: "default" | "good" | "warn" | "pink"; href?: string }) {
  const inner = (
    <div className={cn("h-full rounded-2xl border p-5 transition", tone === "default" && "border-line bg-white", tone === "good" && "border-leaf/25 bg-leaf/5", tone === "warn" && "border-orange/30 bg-orange/5", tone === "pink" && "border-pink/50 bg-pink-100/60", href && "hover:-translate-y-0.5 hover:shadow-soft")}>
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-muted">
        <span>{label}</span>
        {icon ? <Icon name={icon} className="h-5 w-5 text-burgundy/60" /> : null}
      </div>
      <div className="mt-2 font-display text-[1.9rem] leading-tight text-burgundy">{value}</div>
      {hint ? <div className="mt-1 text-sm text-muted">{hint}</div> : null}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

export function EmptyState({ icon = "inbox", title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-cream text-burgundy"><Icon name={icon} className="h-7 w-7" /></div>
      <div className="font-display text-lg text-burgundy">{title}</div>
      {children ? <div className="max-w-md text-sm text-muted">{children}</div> : null}
    </div>
  );
}

/** Útskýring á mannamáli: blár kassi með ljósaperu */
export function Explainer({ children, title = "Hvernig virkar þetta?" }: { children: ReactNode; title?: string }) {
  return (
    <details className="group mb-6 rounded-2xl border border-lemon/50 bg-lemon-100/50 px-5 py-3 text-[15px] open:pb-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-burgundy-900">
        <Icon name="help" className="h-5 w-5 text-burgundy" /> {title}
        <span className="ml-auto text-xs font-medium text-muted group-open:hidden">Smelltu til að sjá</span>
      </summary>
      <div className="mt-2 space-y-2 text-ink/90">{children}</div>
    </details>
  );
}

export function HelpTip({ children }: { children: ReactNode }) {
  return (
    <span className="group relative inline-flex align-middle">
      <span tabIndex={0} className="grid h-5 w-5 cursor-help place-items-center rounded-full bg-sand text-[11px] font-bold text-burgundy">?</span>
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-xl bg-burgundy-900 px-3 py-2 text-xs font-normal leading-relaxed hidden text-cream shadow-pop group-hover:block group-focus-within:block">
        {children}
      </span>
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const tone = ({ NEW: "orange", PROCESSING: "lemon", SHIPPED: "pink", DELIVERED: "green", CANCELLED: "muted" } as const)[status as "NEW"] ?? "neutral";
  return <Badge tone={tone}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}
export function PaymentStatusBadge({ status }: { status: string }) {
  const tone = ({ PAID: "green", UNPAID: "orange", REFUNDED: "muted", FAILED: "danger" } as const)[status as "PAID"] ?? "neutral";
  return <Badge tone={tone}>{PAYMENT_STATUS_LABELS[status] ?? status}</Badge>;
}
export function SubStatusBadge({ status }: { status: string }) {
  const tone = ({ ACTIVE: "green", PAUSED: "lemon", CANCELLED: "muted" } as const)[status as "ACTIVE"] ?? "neutral";
  return <Badge tone={tone}>{SUB_STATUS_LABELS[status] ?? status}</Badge>;
}

export const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted";
export const td = "px-4 py-3 align-middle";
export const tableWrap = "relative overflow-x-auto";
export const tableClass = "w-full min-w-[640px] border-collapse text-[14.5px] [&_tbody_tr]:border-t [&_tbody_tr]:border-line/70 [&_tbody_tr:hover]:bg-cream-50";
