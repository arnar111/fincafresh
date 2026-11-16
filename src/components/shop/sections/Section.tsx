import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export function Section({ id, className, children, tone = "cream" }: { id?: string; className?: string; children: ReactNode; tone?: "cream" | "light" | "green" | "pink" | "burgundy" }) {
  const bg = { cream: "bg-cream", light: "bg-cream-50", green: "bg-green text-cream", pink: "bg-pink-100", burgundy: "bg-burgundy text-cream" }[tone];
  return (
    <section id={id} className={cn(bg, "py-16 sm:py-20", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-2 text-xs font-bold uppercase tracking-[.16em] text-leaf", className)}>{children}</div>;
}

export function H2({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("font-display text-[2rem] leading-[1.08] text-burgundy sm:text-[2.6rem]", className)}>{children}</h2>;
}
