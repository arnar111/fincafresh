"use client";
import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/admin/forms";
import { Icon } from "@/components/ui/Icon";
import { saveCode } from "./actions";

export type CodeValue = {
  id?: string;
  code: string;
  description: string;
  type: string;
  value: number;
  appliesTo: string;
  minSubtotal: number;
  usageLimit: number | null;
  expiresAt: string;
  active: boolean;
};

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "FF-" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function CodeForm({ value }: { value: CodeValue }) {
  const [code, setCode] = useState(value.code);
  const [type, setType] = useState(value.type);
  const [amount, setAmount] = useState(String(value.value || ""));
  const [applies, setApplies] = useState(value.appliesTo);
  const summary =
    amount && Number(amount) > 0
      ? `${type === "PERCENT" ? `${amount}% afsláttur` : `${Number(amount).toLocaleString("de-DE")} kr. afsláttur`} af ${applies === "SUBSCRIPTION" ? "áskriftum" : applies === "SINGLE" ? "stökum kaupum" : "öllu í körfunni"}`
      : "";
  return (
    <form action={saveCode} className="space-y-4">
      {value.id ? <input type="hidden" name="id" value={value.id} /> : null}
      <Field label="Kóði" hint="Það sem viðskiptavinurinn slær inn í körfunni. Hástafir.">
        <div className="flex gap-2">
          <Input name="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="T.d. HAUST15" />
          <button type="button" onClick={() => setCode(randomCode())} className="whitespace-nowrap rounded-xl border border-line px-3 text-sm font-semibold text-burgundy hover:bg-cream">Búa til</button>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tegund">
          <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="PERCENT">Prósenta (%)</option>
            <option value="FIXED">Föst upphæð (kr.)</option>
          </Select>
        </Field>
        <Field label={type === "PERCENT" ? "Prósenta" : "Upphæð (kr.)"}>
          <Input name="value" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} required />
        </Field>
      </div>
      <Field label="Gildir um">
        <Select name="appliesTo" value={applies} onChange={(e) => setApplies(e.target.value)}>
          <option value="ALL">Allt í körfunni</option>
          <option value="SUBSCRIPTION">Aðeins áskriftir (gott til að fá fólk í áskrift)</option>
          <option value="SINGLE">Aðeins stök kaup</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lágmarksupphæð" hint="0 = engin"><Input name="minSubtotal" inputMode="numeric" defaultValue={value.minSubtotal} /></Field>
        <Field label="Hámarksfjöldi notkunar" hint="Autt = ótakmarkað"><Input name="usageLimit" inputMode="numeric" defaultValue={value.usageLimit ?? ""} /></Field>
      </div>
      <Field label="Rennur út" hint="Autt = rennur aldrei út"><Input name="expiresAt" type="date" defaultValue={value.expiresAt} /></Field>
      <Field label="Lýsing (aðeins fyrir þig)"><Textarea name="description" rows={2} defaultValue={value.description} placeholder="T.d. Instagram leikur í nóvember" /></Field>
      {value.id ? (
        <label className="flex items-center gap-2 text-[15px] font-semibold"><input type="checkbox" name="active" defaultChecked={value.active} className="h-5 w-5 accent-[#6A2833]" /> Virkur</label>
      ) : null}
      {summary ? <p className="rounded-xl bg-pink-100/70 px-3 py-2 text-sm text-burgundy-900"><Icon name="gift" className="mr-1 inline h-4 w-4" />{code || "Kóðinn"} gefur {summary}.</p> : null}
      <SubmitButton variant="primary" className="w-full">{value.id ? "Vista kóða" : "Búa til kóða"}</SubmitButton>
    </form>
  );
}
