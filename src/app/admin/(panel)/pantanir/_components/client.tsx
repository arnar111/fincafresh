"use client";
import { useRef, type ComponentProps } from "react";
import { Select } from "@/components/ui/Field";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";

/** "Velja allt" hak sem hakar við öll hök með sama nafni í forminu */
export function SelectAll({ name = "ids", label = "Velja allar" }: { name?: string; label?: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="h-4 w-4 accent-burgundy"
      onChange={(e) => {
        const form = e.currentTarget.form;
        form?.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name="${name}"]`).forEach((c) => (c.checked = e.currentTarget.checked));
      }}
    />
  );
}

/** Fellilisti sem sendir formið sjálfkrafa þegar valið breytist (fyrir síur) */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  const ref = useRef<HTMLSelectElement>(null);
  return <Select ref={ref} {...props} onChange={() => ref.current?.form?.requestSubmit()} />;
}

/** Prenta-hnappur */
export function PrintButton({ label = "Prenta" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-burgundy px-5 py-2.5 text-[15px] font-semibold text-cream hover:bg-burgundy-700">
      {label}
    </button>
  );
}


/** Hnappur með eigin aðgerð (formAction) innan stærra forms, t.d. fyrir fjöldaaðgerðir */
export function ActionButton({
  formAction,
  children,
  variant = "dark",
  size = "sm",
  confirm,
  className,
}: {
  formAction: (fd: FormData) => void | Promise<void>;
  children: ReactNode;
  variant?: "primary" | "dark" | "outline" | "ghost" | "green" | "pink" | "danger" | "light";
  size?: "sm" | "md" | "lg";
  confirm?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={buttonClass(variant, size, className)}
    >
      {pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
}
