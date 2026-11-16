"use client";
import { useActionState, useMemo, useState } from "react";
import { importSubscriptions, type ImportResult } from "../actions";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { inputClass } from "@/components/ui/Field";

function parse(text: string): string[][] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const first = clean.split("\n")[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (q) { if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cell.trim()); cell = ""; }
    else if (c === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter((r) => r.some(Boolean));
}

const HEAD = ["Netfang", "Nafn", "Sími", "Kassi", "Tíðni", "Staða", "Repeat"];

export function ImportForm() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [state, action, pending] = useActionState<ImportResult | null, FormData>(importSubscriptions, null);
  const rows = useMemo(() => {
    const r = parse(text);
    if (r.length && /netfang|email/i.test(r[0][0] ?? "")) r.shift();
    return r;
  }, [text]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-cream-50 px-6 py-8 text-center hover:border-burgundy">
          <Icon name="upload" className="h-8 w-8 text-burgundy" />
          <span className="font-semibold text-burgundy">{fileName || "Veldu CSV skrá"}</span>
          <span className="text-sm text-muted">Vistað úr Excel sem &quot;CSV (semíkommuaðskilið)&quot;</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFileName(f.name);
              setText(await f.text());
            }}
          />
        </label>
        <div>
          <label htmlFor="csv-text" className="mb-1.5 block text-sm font-semibold">…eða límdu inn texta</label>
          <textarea id="csv-text" value={text} onChange={(e) => setText(e.target.value)} rows={7} className={inputClass + " font-mono text-xs"} placeholder={"netfang;nafn;sími;kassi;tíðni;staða\njon@daemi.is;Jón Jónsson;6123456;finca-classic;1;virk"} />
        </div>
      </div>

      {rows.length ? (
        <div className="rounded-2xl border border-line bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-line/70 px-4 py-3">
            <span className="font-semibold">Forskoðun: {rows.length} {rows.length === 1 ? "lína" : "línur"}</span>
            <span className="text-sm text-muted">Fyrstu 15 línurnar sýndar</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr>{HEAD.map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 15).map((r, i) => {
                  const badEmail = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r[0] ?? "");
                  return (
                    <tr key={i} className="border-t border-line/60">
                      {HEAD.map((_, j) => (
                        <td key={j} className={`px-3 py-1.5 ${j === 0 && badEmail ? "font-semibold text-danger" : ""}`}>{r[j] ?? ""}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <form action={action}>
        <input type="hidden" name="csv" value={text} />
        <button type="submit" disabled={!rows.length || pending} className={buttonClass("primary", "lg")}>
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Icon name="upload" className="h-5 w-5" />}
          {pending ? "Flyt inn…" : `Flytja inn ${rows.length || ""} ${rows.length === 1 ? "línu" : "línur"}`}
        </button>
      </form>

      {state ? (
        <div role="status" className={`rounded-2xl border p-5 ${state.errors.length || !state.ok ? "border-orange/40 bg-orange/5" : "border-leaf/30 bg-leaf/5"}`}>
          {state.message ? <p className="font-semibold">{state.message}</p> : (
            <>
              <p className="font-display text-lg text-burgundy">Innflutningi lokið</p>
              <ul className="mt-2 space-y-1 text-[15px]">
                <li><strong>{state.created}</strong> nýjar áskriftir</li>
                <li><strong>{state.updated}</strong> áskriftir uppfærðar (voru þegar til)</li>
                <li><strong>{state.customersCreated}</strong> nýir viðskiptavinir</li>
                <li><strong>{state.errors.length}</strong> línur með villu (ekki fluttar inn)</li>
              </ul>
            </>
          )}
          {state.errors.length ? (
            <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto text-sm text-danger">
              {state.errors.map((e, i) => <li key={i}>Lína {e.line}: {e.message}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
