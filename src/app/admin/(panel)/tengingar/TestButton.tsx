"use client";
import { useActionState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import type { TestState } from "./actions";

/** Hnappur sem keyrir prófun/innflutning og sýnir niðurstöðuna beint fyrir neðan */
export function TestButton({
  action,
  label,
  pendingLabel = "Augnablik…",
  variant = "outline",
  children,
  confirm,
}: {
  action: (prev: TestState, fd: FormData) => Promise<TestState>;
  label: string;
  pendingLabel?: string;
  variant?: "outline" | "dark" | "primary" | "green";
  children?: ReactNode;
  confirm?: string;
}) {
  const [state, run, pending] = useActionState(action, null);
  return (
    <form action={run} className="space-y-2" onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      <div className="flex flex-wrap items-end gap-2">
        {children}
        <button type="submit" disabled={pending} className={buttonClass(variant, "sm")}>
          {pending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> {pendingLabel}</> : label}
        </button>
      </div>
      {state ? (
        <div role="status" className={cn("rounded-xl px-3 py-2 text-sm", state.ok ? "bg-leaf/10 text-green-900" : "bg-danger/10 text-danger")}>
          <div className="flex items-start gap-2 font-semibold"><Icon name={state.ok ? "check" : "info"} className="mt-0.5 h-4 w-4 shrink-0" />{state.message}</div>
          {state.lines?.length ? <ul className="ml-6 mt-1 list-disc space-y-0.5 font-normal">{state.lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}
        </div>
      ) : null}
    </form>
  );
}
