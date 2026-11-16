import "server-only";
import { redirect } from "next/navigation";

/** Beinir aftur á síðu með skilaboðum sem <Flash/> sýnir */
export function done(path: string, message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}ok=${encodeURIComponent(message)}`);
}
export function fail(path: string, message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}villa=${encodeURIComponent(message)}`);
}

export function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
export function int(fd: FormData, key: string, fallback = 0) {
  const v = String(fd.get(key) ?? "").replace(/\./g, "").replace(/\s/g, "").replace(",", ".");
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : fallback;
}
export function intOrNull(fd: FormData, key: string) {
  const raw = String(fd.get(key) ?? "").trim();
  if (!raw) return null;
  return int(fd, key);
}
export function bool(fd: FormData, key: string) {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}
export function dateOrNull(fd: FormData, key: string) {
  const v = str(fd, key);
  if (!v) return null;
  const d = new Date(v + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** CSV með semíkommu (opnast rétt í íslensku Excel) og BOM fyrir íslenska stafi */
export function toCsv(rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}
export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
