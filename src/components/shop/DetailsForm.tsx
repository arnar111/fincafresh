"use client";
import { useActionState } from "react";
import { updateDetails, type AccountState } from "@/app/actions/account";
import { Field, Input } from "@/components/ui/Field";
import { buttonClass } from "@/components/ui/Button";

export function DetailsForm({ c }: { c: { name: string; phone: string; street: string; postalCode: string; city: string; marketingOptIn: boolean } }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateDetails, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nafn"><Input name="name" defaultValue={c.name} required /></Field>
      <Field label="Símanúmer"><Input name="phone" defaultValue={c.phone} /></Field>
      <Field label="Heimilisfang" className="sm:col-span-2"><Input name="street" defaultValue={c.street} /></Field>
      <Field label="Póstnúmer"><Input name="postalCode" defaultValue={c.postalCode} /></Field>
      <Field label="Staður"><Input name="city" defaultValue={c.city} /></Field>
      <label className="flex items-center gap-2 text-[15px] sm:col-span-2"><input type="checkbox" name="marketing" defaultChecked={c.marketingOptIn} className="h-5 w-5 accent-[#6A2833]" /> Senda mér fréttir af næstu sendingum</label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={buttonClass("dark", "md")}>{pending ? "Vista…" : "Vista"}</button>
        {state ? <span className={state.ok ? "text-sm font-medium text-leaf" : "text-sm font-medium text-danger"}>{state.message}</span> : null}
      </div>
    </form>
  );
}
