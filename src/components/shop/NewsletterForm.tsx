"use client";
import { useActionState } from "react";
import { subscribeNewsletter, type FormState } from "@/app/actions/forms";

export function NewsletterForm({ source = "footer", dark = true }: { source?: string; dark?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeNewsletter, null);
  if (state?.ok) return <p className={dark ? "rounded-2xl bg-white/10 px-4 py-3 text-cream" : "rounded-2xl bg-leaf/10 px-4 py-3 text-leaf"}>{state.message}</p>;
  return (
    <form action={action} className="w-full">
      <input type="hidden" name="source" value={source} />
      <div className="flex rounded-full bg-white p-1.5 shadow-sm">
        <label htmlFor={`nl-${source}`} className="sr-only">Netfang</label>
        <input id={`nl-${source}`} name="email" type="email" required placeholder="Netfangið þitt" className="min-w-0 flex-1 rounded-full bg-transparent px-4 text-[15px] text-ink placeholder:text-muted focus:outline-none" />
        <button disabled={pending} className="rounded-full bg-orange px-4 py-2.5 text-sm font-semibold text-burgundy-900 hover:bg-orange-600 disabled:opacity-60">
          {pending ? "Augnablik…" : "Skrá mig"}
        </button>
      </div>
      {state && !state.ok ? <p className="mt-2 text-sm text-pink">{state.message}</p> : null}
    </form>
  );
}
