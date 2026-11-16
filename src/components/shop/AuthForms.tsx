"use client";
import { useActionState, useState } from "react";
import { login, register, requestMagicLink, type AccountState } from "@/app/actions/account";
import { buttonClass } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";

export function AuthForms({ defaultEmail }: { defaultEmail: string }) {
  const [tab, setTab] = useState<"login" | "link" | "register">(defaultEmail ? "link" : "login");
  const [loginState, loginAction, loginPending] = useActionState<AccountState, FormData>(login, null);
  const [linkState, linkAction, linkPending] = useActionState<AccountState, FormData>(requestMagicLink, null);
  const [regState, regAction, regPending] = useActionState<AccountState, FormData>(register, null);
  const tabs: [typeof tab, string][] = [["login", "Lykilorð"], ["link", "Tengill í pósti"], ["register", "Nýr aðgangur"]];
  return (
    <div className="mt-8 rounded-3xl border border-line bg-cream-50 p-6 shadow-soft">
      <div className="mb-6 grid grid-cols-3 gap-1 rounded-full bg-white p-1" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn("rounded-full px-2 py-2 text-sm font-semibold transition", tab === id ? "bg-burgundy text-cream" : "text-ink hover:text-burgundy")}>
            {label}
          </button>
        ))}
      </div>
      {tab === "login" ? (
        <form action={loginAction} className="space-y-4">
          <Field label="Netfang"><Input name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required /></Field>
          <Field label="Lykilorð"><Input name="password" type="password" autoComplete="current-password" required /></Field>
          {loginState && !loginState.ok ? <p className="text-sm font-medium text-danger" role="alert">{loginState.message}</p> : null}
          <button disabled={loginPending} className={buttonClass("dark", "lg", "w-full")}>{loginPending ? "Augnablik…" : "Skrá inn"}</button>
          <button type="button" onClick={() => setTab("link")} className="w-full text-sm text-muted underline">Gleymt lykilorð? Fáðu tengil í tölvupósti</button>
        </form>
      ) : null}
      {tab === "link" ? (
        linkState?.ok ? (
          <p className="rounded-2xl bg-leaf/10 p-4 text-[15px] text-leaf">{linkState.message}</p>
        ) : (
          <form action={linkAction} className="space-y-4">
            <p className="text-[15px] text-muted">Þú færð tengil í tölvupósti sem skráir þig inn með einum smelli. Ekkert lykilorð þarf.</p>
            <Field label="Netfang"><Input name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required /></Field>
            {linkState && !linkState.ok ? <p className="text-sm font-medium text-danger" role="alert">{linkState.message}</p> : null}
            <button disabled={linkPending} className={buttonClass("dark", "lg", "w-full")}>{linkPending ? "Sendi…" : "Senda mér tengil"}</button>
          </form>
        )
      ) : null}
      {tab === "register" ? (
        regState?.ok ? (
          <p className="rounded-2xl bg-leaf/10 p-4 text-[15px] text-leaf">{regState.message}</p>
        ) : (
        <form action={regAction} className="space-y-4">
          <Field label="Nafn"><Input name="name" autoComplete="name" required /></Field>
          <Field label="Netfang"><Input name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required /></Field>
          <Field label="Lykilorð" hint="A.m.k. 8 stafir"><Input name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
          {regState && !regState.ok ? <p className="text-sm font-medium text-danger" role="alert">{regState.message}</p> : null}
          <button disabled={regPending} className={buttonClass("dark", "lg", "w-full")}>{regPending ? "Augnablik…" : "Búa til aðgang"}</button>
        </form>
        )
      ) : null}
    </div>
  );
}
