"use client";
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { LemonLogo } from "@/components/brand/Logo";
import { buttonClass } from "@/components/ui/Button";

export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-full text-burgundy hover:bg-burgundy/5 lg:hidden" aria-label="Opna valmynd">
        <Icon name="menu" className="h-6 w-6" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} side="right" className="flex flex-col bg-cream">
        <div className="flex items-center justify-between px-5 pt-5">
          <LemonLogo className="h-16 w-auto" />
          <button onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-white text-burgundy" aria-label="Loka valmynd"><Icon name="x" /></button>
        </div>
        <nav className="flex flex-col px-3 py-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 font-display text-2xl text-burgundy hover:bg-white/70">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 p-5">
          <Link href="/askrift" onClick={() => setOpen(false)} className={buttonClass("primary", "lg", "w-full")}>Byrja í áskrift</Link>
          <Link href="/minar-sidur" onClick={() => setOpen(false)} className={buttonClass("light", "lg", "w-full")}>Mínar síður</Link>
        </div>
      </Modal>
    </>
  );
}
