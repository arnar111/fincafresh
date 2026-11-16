"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

/** Aðgengilegur gluggi: lokast með Esc, smelli utan við og heldur fókus inni. */
export function Modal({
  open,
  onClose,
  children,
  className,
  labelledBy,
  side = "center",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  side?: "center" | "right" | "bottom";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector<HTMLElement>("[data-autofocus],button,a[href]")?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex animate-fade-in" role="presentation">
      <div className="absolute inset-0 bg-burgundy-900/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "relative z-10 bg-cream-50 shadow-pop",
          side === "center" && "m-auto w-[min(100%-2rem,560px)] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[1.75rem] animate-pop-in",
          side === "right" && "ml-auto h-full w-[min(100%,460px)] overflow-y-auto animate-slide-up sm:rounded-l-[1.75rem]",
          side === "bottom" && "mt-auto w-full max-h-[90dvh] overflow-y-auto rounded-t-[1.75rem] animate-slide-up",
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function CloseButton({ onClick, className, label = "Loka" }: { onClick: () => void; className?: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn("grid h-10 w-10 place-items-center rounded-full bg-white/90 text-burgundy shadow-sm hover:bg-white", className)}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );
}
