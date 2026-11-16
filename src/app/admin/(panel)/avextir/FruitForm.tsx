"use client";
import { useState } from "react";
import { FruitArt, FRUIT_ART_KEYS, FRUIT_ART_LABELS } from "@/components/brand/FruitArt";
import { FruitModal } from "@/components/shop/FruitShowcase";
import type { LiteFruit } from "@/components/shop/types";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/admin/forms";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { ImageManager } from "../vorur/ImageManager";
import { saveFruit } from "./actions";

export type FruitFormValue = Omit<LiteFruit, "deluxeOnly" | "id"> & { id?: string; reviewed: boolean; active: boolean };

const TEXT_FIELDS: { key: keyof FruitFormValue; label: string; hint: string; rows: number }[] = [
  { key: "description", label: "Lýsing", hint: "Ein til tvær setningar um ávöxtinn. Birtist efst.", rows: 3 },
  { key: "taste", label: "Bragð", hint: "Hvernig bragðast hann?", rows: 2 },
  { key: "ripeness", label: "Hvernig veit ég að ávöxturinn er tilbúinn?", hint: "Hjálpar fólki að borða hann á réttum tíma.", rows: 2 },
  { key: "storage", label: "Geymsla", hint: "Kælir eða borð, og hversu lengi.", rows: 2 },
  { key: "goodToKnow", label: "Gott að vita", hint: "Skemmtileg staðreynd eða gott ráð.", rows: 2 },
];

export function FruitForm({ fruit }: { fruit: FruitFormValue }) {
  const [v, setV] = useState<FruitFormValue>(fruit);
  const [asDelux, setAsDelux] = useState(false);
  const [open, setOpen] = useState(false);
  const set = <K extends keyof FruitFormValue>(k: K, val: FruitFormValue[K]) => setV((p) => ({ ...p, [k]: val }));
  const lite: LiteFruit = { ...v, id: v.id ?? "nyr", deluxeOnly: asDelux };

  return (
    <form action={saveFruit} className="grid gap-5 lg:grid-cols-[1fr_400px]">
      {v.id ? <input type="hidden" name="id" value={v.id} /> : null}
      <input type="hidden" name="illustration" value={v.illustration} />
      <div className="space-y-5">
        <section className="space-y-4 rounded-2xl border border-line bg-white p-5">
          <h2 className="font-display text-lg text-burgundy">Grunnupplýsingar</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nafn"><Input name="name" value={v.name} onChange={(e) => set("name", e.target.value)} required placeholder="T.d. Mango Kent" /></Field>
            <Field label="Afbrigði" hint="Valfrjálst, t.d. Kent"><Input name="variety" value={v.variety} onChange={(e) => set("variety", e.target.value)} /></Field>
            <Field label="Upprunaland"><Input name="origin" value={v.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Spánn" /></Field>
            <Field label="Hérað" hint="Valfrjálst, t.d. Valencia"><Input name="region" value={v.region} onChange={(e) => set("region", e.target.value)} /></Field>
            <Field label="Bóndi / býli" hint="Valfrjálst. Fólki finnst gaman að vita hver ræktar."><Input name="farmer" value={v.farmer} onChange={(e) => set("farmer", e.target.value)} /></Field>
            <Field label="Árstíð" hint="T.d. Haust og vetur"><Input name="season" value={v.season} onChange={(e) => set("season", e.target.value)} /></Field>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-line bg-white p-5">
          <h2 className="font-display text-lg text-burgundy">Textar sem viðskiptavinir lesa</h2>
          {TEXT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              <Textarea name={f.key} rows={f.rows} value={String(v[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value as never)} />
            </Field>
          ))}
        </section>

        <section className="space-y-4 rounded-2xl border border-line bg-white p-5">
          <h2 className="font-display text-lg text-burgundy">Útlit</h2>
          <div>
            <div className="mb-2 text-sm font-semibold text-ink">Teikning</div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {FRUIT_ART_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("illustration", k)}
                  title={FRUIT_ART_LABELS[k]}
                  aria-pressed={v.illustration === k}
                  className={cn("flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-[10px] font-semibold text-muted transition", v.illustration === k ? "border-burgundy bg-cream-50 text-burgundy" : "border-transparent hover:border-line")}
                >
                  <FruitArt kind={k} className="h-10 w-10" title="" />
                  <span className="line-clamp-1">{FRUIT_ART_LABELS[k]}</span>
                </button>
              ))}
            </div>
          </div>
          <Field label="Bakgrunnslitur" hint="Liturinn á hringnum á bak við ávöxtinn.">
            <div className="flex items-center gap-3">
              <input type="color" name="color" value={v.color} onChange={(e) => set("color", e.target.value)} className="h-11 w-16 cursor-pointer rounded-lg border border-line bg-white" />
              <span className="font-mono text-sm text-muted">{v.color}</span>
            </div>
          </Field>
          <ImageManagerBridge value={v.imageUrl} onChange={(url) => set("imageUrl", url)} />
        </section>
      </div>

      <div className="space-y-5">
        <div className="lg:sticky lg:top-6 space-y-4">
          <section className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
              <h2 className="font-display text-lg text-burgundy">Svona lítur þetta út</h2>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                <input type="checkbox" checked={asDelux} onChange={(e) => setAsDelux(e.target.checked)} className="accent-[#6A2833]" /> Sem Delúx
              </label>
            </div>
            <Preview f={lite} />
            <div className="border-t border-line/70 p-3">
              <button type="button" onClick={() => setOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-burgundy/70 px-4 py-2 text-sm font-semibold text-burgundy hover:bg-burgundy hover:text-cream">
                <Icon name="eye" className="h-4 w-4" /> Opna eins og viðskiptavinur sér það
              </button>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" name="reviewed" checked={v.reviewed} onChange={(e) => set("reviewed", e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#6A2833]" />
              <span><span className="block font-semibold">Ég hef yfirfarið textann</span><span className="block text-xs text-muted">Textarnir voru settir inn sem drög. Hakaðu við þegar þú hefur lesið þá yfir.</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" name="active" checked={v.active} onChange={(e) => set("active", e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#6A2833]" />
              <span><span className="block font-semibold">Virkur</span><span className="block text-xs text-muted">Óvirkir ávextir birtast ekki á síðunni þótt þeir séu í sendingu.</span></span>
            </label>
            <Field label="Vefslóð (slug)" hint="Myndast sjálfkrafa ef autt."><Input name="slug" value={v.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
            <SubmitButton variant="primary" size="lg" className="w-full" pendingText="Vista…"><Icon name="check" className="h-5 w-5" /> {v.id ? "Vista breytingar" : "Búa til ávöxt"}</SubmitButton>
          </section>
        </div>
      </div>
      {open ? <FruitModal fruits={[lite]} index={0} onIndex={() => undefined} onClose={() => setOpen(false)} delux={null} /> : null}
    </form>
  );
}

function ImageManagerBridge({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  return (
    <div>
      <ImageManager name="imageUrl" initial={value ? [value] : []} multiple={false} label="Ljósmynd (valfrjálst)" onChange={(imgs) => onChange(imgs[0] ?? "")} />
      <p className="mt-1 text-xs text-muted">Ef engin ljósmynd er valin er teikningin notuð.</p>
    </div>
  );
}

function Preview({ f }: { f: LiteFruit }) {
  const rows: [string, string][] = [
    ["Bragð", f.taste],
    ["Hvernig veit ég að ávöxturinn er tilbúinn?", f.ripeness],
    ["Geymsla", f.storage],
    ["Gott að vita", f.goodToKnow],
  ];
  return (
    <div>
      <div className="px-5 pb-5 pt-6 text-center" style={{ background: f.deluxeOnly ? "linear-gradient(160deg,#3A151C 0%,#6A2833 100%)" : `color-mix(in oklab, ${f.color} 24%, #FCF8F1)` }}>
        <div className={cn("relative mx-auto w-fit", f.deluxeOnly && "gold-ring")}>
          <div className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-white/70">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {f.imageUrl ? <img src={f.imageUrl} alt="" className="h-full w-full object-cover" /> : <FruitArt kind={f.illustration} className="h-[72%] w-[72%]" />}
          </div>
        </div>
        <div className={cn("mt-3 font-display text-2xl", f.deluxeOnly ? "text-cream" : "text-burgundy")}>{f.name || "Nafn ávaxtar"}</div>
        <div className={cn("mt-1 flex flex-wrap justify-center gap-1 text-[11px] font-semibold", f.deluxeOnly ? "text-cream/90" : "text-burgundy-900")}>
          {[f.variety ? `Afbrigði: ${f.variety}` : "", [f.region, f.origin].filter(Boolean).join(", "), f.season, f.farmer].filter(Boolean).map((t) => (
            <span key={t} className={cn("rounded-full px-2 py-0.5", f.deluxeOnly ? "bg-white/10" : "bg-white/60")}>{t}</span>
          ))}
        </div>
        {f.description ? <p className={cn("mt-2 text-sm", f.deluxeOnly ? "text-cream/90" : "text-ink/85")}>{f.description}</p> : null}
      </div>
      <div className="space-y-2 bg-cream-50 p-4">
        {rows.filter(([, val]) => val).map(([label, val]) => (
          <div key={label} className="rounded-xl bg-white p-2.5">
            <div className="text-xs font-semibold text-burgundy">{label}</div>
            <div className="text-sm text-ink/85">{val}</div>
          </div>
        ))}
        {rows.every(([, val]) => !val) ? <p className="text-center text-sm text-muted">Fylltu út textana til vinstri.</p> : null}
      </div>
    </div>
  );
}
