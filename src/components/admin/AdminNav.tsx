"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ADMIN_NAV } from "./nav";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { LemonMark } from "@/components/brand/Logo";

export function AdminNav({ adminName, badges }: { adminName: string; badges: Record<string, number> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const nav = (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="Stjórnborð">
      {ADMIN_NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          title={n.help}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
            isActive(n.href) ? "bg-cream text-burgundy shadow-sm" : "text-cream/85 hover:bg-white/10 hover:text-cream"
          )}
        >
          <Icon name={n.icon} className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1">{n.label}</span>
          {badges[n.href] ? (
            <span className={cn("min-w-6 rounded-full px-1.5 text-center text-xs font-bold", isActive(n.href) ? "bg-orange text-burgundy-900" : "bg-orange text-burgundy-900")}>
              {badges[n.href]}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-burgundy text-cream lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-5 pb-3 pt-6">
          <LemonMark className="h-9 w-9" />
          <span className="font-display text-xl leading-none">Stjórnborð</span>
        </Link>
        {nav}
        <div className="mt-auto border-t border-white/10 p-4 text-sm text-cream/80">
          <div className="mb-2 truncate">Innskráð(ur): {adminName}</div>
          <div className="flex gap-3">
            <Link href="/" target="_blank" className="inline-flex items-center gap-1 hover:text-cream"><Icon name="external" className="h-4 w-4" /> Skoða síðu</Link>
            <form action="/admin/utskraning" method="post"><button className="inline-flex items-center gap-1 hover:text-cream"><Icon name="logout" className="h-4 w-4" /> Út</button></form>
          </div>
        </div>
      </aside>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-burgundy px-4 py-3 text-cream lg:hidden">
        <Link href="/admin" className="flex items-center gap-2"><LemonMark className="h-8 w-8" /><span className="font-display text-lg">Stjórnborð</span></Link>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-white/10" aria-label="Opna valmynd"><Icon name="menu" /></button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-burgundy text-cream animate-fade-in">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="font-display text-lg">Valmynd</span>
              <button onClick={() => setOpen(false)} aria-label="Loka" className="rounded-lg p-2 hover:bg-white/10"><Icon name="x" /></button>
            </div>
            {nav}
          </div>
        </div>
      ) : null}
    </>
  );
}
