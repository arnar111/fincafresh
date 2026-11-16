import type { ReactNode } from "react";
import Link from "next/link";

export function PageIntro({ eyebrow, title, children, crumbs }: { eyebrow?: string; title: string; children?: ReactNode; crumbs?: { href: string; label: string }[] }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      {crumbs ? (
        <nav aria-label="Brauðmolar" className="mb-5 text-sm text-muted">
          {crumbs.map((c, i) => (
            <span key={c.href}>
              {i > 0 ? <span className="mx-2">/</span> : null}
              <Link href={c.href} className="hover:text-burgundy">{c.label}</Link>
            </span>
          ))}
        </nav>
      ) : null}
      {eyebrow ? <div className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-leaf">{eyebrow}</div> : null}
      <h1 className="font-display text-[2.4rem] leading-[1.05] text-burgundy sm:text-5xl">{title}</h1>
      {children ? <div className="mt-3 max-w-2xl text-lg text-ink/75">{children}</div> : null}
    </div>
  );
}

export function Crumbs({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav aria-label="Brauðmolar" className="mx-auto max-w-7xl px-4 pb-6 pt-6 text-sm text-muted sm:px-6 lg:px-8">
      {items.map((c, i) => (
        <span key={c.href}>
          {i > 0 ? <span className="mx-2">/</span> : null}
          {i === items.length - 1 ? <span className="font-medium text-ink" aria-current="page">{c.label}</span> : <Link href={c.href} className="hover:text-burgundy">{c.label}</Link>}
        </span>
      ))}
    </nav>
  );
}
