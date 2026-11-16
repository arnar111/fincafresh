"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";

/**
 * Myndastjórnun: hlaða upp, raða og eyða. Fyrsta myndin er aðalmyndin.
 * Gildið er sent með forminu sem JSON listi í földum reit (name).
 */
export function ImageManager({ name, initial, multiple = true, label = "Myndir", onChange }: { name: string; initial: string[]; multiple?: boolean; label?: string; onChange?: (images: string[]) => void }) {
  const [images, setImages] = useState<string[]>(initial);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    onChange?.(images);
  }, [images]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("file", f);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { urls?: string[]; error?: string };
      if (!res.ok || !json.urls) throw new Error(json.error || "Tókst ekki að hlaða upp myndinni.");
      setImages((prev) => (multiple ? [...prev, ...json.urls!] : [json.urls![0]]));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((prev) => {
      const next = [...prev];
      const j = i + d;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      <input type="hidden" name={name} value={multiple ? JSON.stringify(images) : images[0] ?? ""} />
      <div className="mb-1.5 text-sm font-semibold text-ink">{label}</div>
      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div key={src + i} className={cn("group relative h-28 w-28 overflow-hidden rounded-xl border bg-cream", i === 0 && multiple ? "border-burgundy ring-2 ring-burgundy/20" : "border-line")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            {i === 0 && multiple ? <span className="absolute left-1 top-1 rounded-full bg-burgundy px-2 py-0.5 text-[10px] font-bold text-cream">Aðalmynd</span> : null}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-burgundy-900/70 p-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
              {multiple ? (
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Færa framar" className="rounded p-1 text-cream hover:bg-white/20 disabled:opacity-30"><Icon name="arrowLeft" className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Færa aftar" className="rounded p-1 text-cream hover:bg-white/20 disabled:opacity-30"><Icon name="arrow" className="h-4 w-4" /></button>
                </span>
              ) : <span />}
              <button type="button" onClick={() => setImages((prev) => prev.filter((_, k) => k !== i))} aria-label="Fjarlægja mynd" className="rounded p-1 text-cream hover:bg-white/20"><Icon name="trash" className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {(multiple || images.length === 0) && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="grid h-28 w-28 place-items-center rounded-xl border-2 border-dashed border-line bg-cream-50 text-center text-xs font-semibold text-burgundy hover:border-burgundy hover:bg-cream"
          >
            {busy ? (
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-burgundy border-r-transparent" aria-label="Hleð upp" />
            ) : (
              <span className="flex flex-col items-center gap-1"><Icon name="upload" className="h-6 w-6" />{multiple ? "Bæta við mynd" : "Velja mynd"}</span>
            )}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple={multiple} className="hidden" onChange={(e) => upload(e.target.files)} />
      {error ? <p className="mt-2 text-sm font-semibold text-danger">{error}</p> : null}
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer">Eða líma inn slóð á mynd</summary>
        <div className="mt-2 flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… eða /images/…" className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm" />
          <button
            type="button"
            onClick={() => {
              if (!url.trim()) return;
              setImages((prev) => (multiple ? [...prev, url.trim()] : [url.trim()]));
              setUrl("");
            }}
            className="rounded-lg bg-burgundy px-3 text-sm font-semibold text-cream"
          >
            Bæta við
          </button>
        </div>
      </details>
      <p className="mt-1 text-xs text-muted">{multiple ? "Fyrsta myndin birtist á vörukortum. Notaðu örvarnar til að raða. " : ""}JPG, PNG eða WEBP, hámark 8 MB.</p>
    </div>
  );
}
