"use client";
import { useActionState } from "react";
import { sendInquiry, type FormState } from "@/app/actions/forms";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { buttonClass } from "@/components/ui/Button";

export function InquiryForm({ type }: { type: "B2B" | "CONTACT" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendInquiry, null);
  if (state?.ok) return <p className="rounded-2xl bg-leaf/10 p-5 text-[16px] font-medium text-leaf">{state.message}</p>;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="type" value={type} />
      <Field label="Nafn"><Input name="name" autoComplete="name" required /></Field>
      {type === "B2B" ? <Field label="Fyrirtæki"><Input name="company" autoComplete="organization" /></Field> : null}
      <Field label="Netfang"><Input name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Símanúmer"><Input name="phone" type="tel" autoComplete="tel" /></Field>
      <Field label={type === "B2B" ? "Hvað eruð þið mörg og hvað eruð þið að leita að?" : "Skilaboð"} className="sm:col-span-2"><Textarea name="message" rows={5} required /></Field>
      {state && !state.ok ? <p className="text-sm font-medium text-danger sm:col-span-2" role="alert">{state.message}</p> : null}
      <div className="sm:col-span-2"><button disabled={pending} className={buttonClass("primary", "lg")}>{pending ? "Sendi…" : "Senda fyrirspurn"}</button></div>
    </form>
  );
}
