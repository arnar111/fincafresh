"use client";
import { useFormStatus } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";

type V = "primary" | "dark" | "outline" | "ghost" | "green" | "pink" | "danger" | "light";

/** Hnappur sem sýnir "Augnablik…" á meðan form er sent */
export function SubmitButton({ children, variant = "dark", size = "md", className, pendingText = "Augnablik…", confirm, name, value }: { children: ReactNode; variant?: V; size?: "sm" | "md" | "lg"; className?: string; pendingText?: string; confirm?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={buttonClass(variant, size, className)}
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * Skilaboð eftir aðgerð. Aðgerðir í stjórnborði beina aftur á síðuna með ?ok=... eða ?villa=...
 * og þessi hluti sýnir skilaboðin í nokkrar sekúndur.
 */
export function Flash() {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const ok = sp.get("ok");
  const err = sp.get("villa");
  const [show, setShow] = useState(true);
  useEffect(() => {
    setShow(true);
    if (!ok && !err) return;
    const t = setTimeout(() => {
      setShow(false);
      const next = new URLSearchParams(sp.toString());
      next.delete("ok");
      next.delete("villa");
      router.replace(next.size ? `${path}?${next}` : path, { scroll: false });
    }, err ? 9000 : 4500);
    return () => clearTimeout(t);
  }, [ok, err]); // eslint-disable-line react-hooks/exhaustive-deps
  if ((!ok && !err) || !show) return null;
  return (
    <div role="status" className={cn("fixed bottom-5 right-5 z-[90] flex max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-[15px] shadow-pop animate-pop-in", err ? "bg-danger text-white" : "bg-green text-cream")}>
      <Icon name={err ? "info" : "check"} className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{err ?? ok}</span>
      <button onClick={() => setShow(false)} aria-label="Loka" className="ml-2 opacity-80 hover:opacity-100"><Icon name="x" className="h-4 w-4" /></button>
    </div>
  );
}

export function CopyButton({ value, label = "Afrita" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-burgundy hover:bg-cream"
    >
      <Icon name={done ? "check" : "copy"} className="h-3.5 w-3.5" /> {done ? "Afritað" : label}
    </button>
  );
}
