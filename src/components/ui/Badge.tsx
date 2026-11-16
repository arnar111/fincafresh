import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "green" | "pink" | "lemon" | "orange" | "burgundy" | "danger" | "gold" | "muted";
const tones: Record<Tone, string> = {
  neutral: "bg-sand text-burgundy-900",
  green: "bg-leaf/12 text-leaf",
  pink: "bg-pink-100 text-burgundy",
  lemon: "bg-lemon-100 text-burgundy-900",
  orange: "bg-orange/15 text-orange-600",
  burgundy: "bg-burgundy text-cream",
  danger: "bg-danger/10 text-danger",
  gold: "bg-lemon text-burgundy-900",
  muted: "bg-ink/5 text-muted",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}
