"use client";
import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/admin/forms";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { ImageManager } from "./ImageManager";
import { saveProduct } from "./actions";

export type ProductFormValue = {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  type: string;
  tier: string | null;
  tagline: string;
  shortDescription: string;
  description: string;
  features: string[];
  images: string[];
  price: number;
  compareAtPrice: number | null;
  subscriptionDiscountPct: number | null;
  weightLabel: string;
  suitsFor: string;
  storageType: string;
  trackStock: boolean;
  stock: number | null;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  syncToWoo: boolean;
  categoryId: string | null;
  wooId: number | null;
};

function krDisplay(n: number) {
  return `${Math.round(n).toLocaleString("de-DE")} kr.`;
}

function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="font-display text-lg text-burgundy">{title}</h2>
      {hint ? <p className="mb-4 mt-0.5 text-sm text-muted">{hint}</p> : <div className="mb-4" />}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Toggle({ name, defaultChecked, label, hint }: { name: string; defaultChecked: boolean; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-cream-50 p-3 hover:bg-cream">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-5 w-5 accent-[#6A2833]" />
      <span>
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function ProductForm({
  product,
  categories,
  defaultSubPct,
  wooConfigured,
}: {
  product: ProductFormValue;
  categories: { id: string; name: string }[];
  defaultSubPct: number;
  wooConfigured: boolean;
}) {
  const [type, setType] = useState(product.type);
  const [price, setPrice] = useState(String(product.price || ""));
  const [subPct, setSubPct] = useState(product.subscriptionDiscountPct === null ? "" : String(product.subscriptionDiscountPct));
  const [features, setFeatures] = useState<string[]>(product.features.length ? product.features : [""]);
  const [trackStock, setTrackStock] = useState(product.trackStock);

  const priceNum = Number(price.replace(/\./g, "")) || 0;
  const pct = subPct === "" ? defaultSubPct : Number(subPct) || 0;
  const subPrice = Math.round((priceNum * (100 - pct)) / 100);

  return (
    <form action={saveProduct} className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
      {product.id ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="features" value={JSON.stringify(features.filter((f) => f.trim()))} />

      <div className="space-y-5">
        <Section title="Grunnupplýsingar">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { v: "BOX", t: "Ávaxtakassi", d: "Hægt að kaupa stakan eða í áskrift" },
              { v: "ITEM", t: "Vara í netverslun", d: "T.d. granóla, hunang, þurrkaðir ávextir" },
            ].map((o) => (
              <label key={o.v} className={cn("cursor-pointer rounded-xl border-2 p-3 transition", type === o.v ? "border-burgundy bg-cream-50" : "border-line hover:border-burgundy/40")}>
                <input type="radio" name="type" value={o.v} checked={type === o.v} onChange={() => setType(o.v)} className="sr-only" />
                <span className="flex items-center gap-2 font-semibold text-ink"><Icon name={o.v === "BOX" ? "box" : "tag"} className="h-5 w-5 text-burgundy" />{o.t}</span>
                <span className="mt-0.5 block text-xs text-muted">{o.d}</span>
              </label>
            ))}
          </div>
          <Field label="Nafn vöru"><Input name="name" defaultValue={product.name} required placeholder="T.d. Finca Classic" /></Field>
          <Field label="Stutt lýsing" hint="Birtist á vörukortum og efst á vörusíðunni. Ein til tvær setningar.">
            <Textarea name="shortDescription" defaultValue={product.shortDescription} rows={2} />
          </Field>
          <Field label="Nánari lýsing" hint="Birtist á vörusíðunni. Auð lína býr til nýja málsgrein.">
            <Textarea name="description" defaultValue={product.description} rows={6} />
          </Field>
          {type === "BOX" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Stærð / þyngd" hint='T.d. "2,5 kg"'><Input name="weightLabel" defaultValue={product.weightLabel} /></Field>
              <Field label="Hentar fyrir" hint='T.d. "1–2" eða "3+"'><Input name="suitsFor" defaultValue={product.suitsFor} /></Field>
              <Field label="Gerð kassa" hint="Delúx fær gullmerktu aukaávextina">
                <Select name="tier" defaultValue={product.tier ?? ""}>
                  <option value="">Engin sérstök</option>
                  <option value="CLASSIC">Classic</option>
                  <option value="GRANDE">Grande</option>
                  <option value="DELUX">Delúx</option>
                </Select>
              </Field>
            </div>
          ) : null}
          <Field label="Undirfyrirsögn" hint='Lítill texti fyrir ofan nafnið, t.d. "2,5 kg · hentar 1–2"'><Input name="tagline" defaultValue={product.tagline} /></Field>
        </Section>

        <Section title="Kostir" hint="Stuttir punktar með hakmerki sem birtast á vörukortinu. Hafðu þá 2 til 4.">
          {features.map((f, i) => (
            <div key={i} className="flex gap-2">
              <Input value={f} onChange={(e) => setFeatures((prev) => prev.map((x, k) => (k === i ? e.target.value : x)))} placeholder="T.d. Handvalið hjá bóndanum" />
              <button type="button" onClick={() => setFeatures((prev) => prev.filter((_, k) => k !== i))} aria-label="Fjarlægja" className="rounded-xl border border-line px-3 text-muted hover:bg-cream hover:text-danger"><Icon name="trash" className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setFeatures((p) => [...p, ""])} className="inline-flex items-center gap-1 text-sm font-semibold text-burgundy hover:underline"><Icon name="plus" className="h-4 w-4" /> Bæta við kosti</button>
        </Section>

        <Section title="Myndir">
          <ImageManager name="images" initial={product.images} />
        </Section>
      </div>

      <div className="space-y-5">
        <Section title="Verð">
          <Field label="Verð (kr.)" hint="Verð fyrir stakan kassa / vöru, með vsk.">
            <Input name="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} required />
          </Field>
          <Field label="Fyrra verð (valfrjálst)" hint="Ef útfyllt sést það yfirstrikað við hlið verðsins (tilboð).">
            <Input name="compareAtPrice" inputMode="numeric" defaultValue={product.compareAtPrice ?? ""} />
          </Field>
          {type === "BOX" ? (
            <div className="rounded-xl bg-pink-100/60 p-3">
              <Field label="Áskriftarafsláttur (%)" hint={`Skildu eftir autt til að nota sjálfgefinn afslátt (${defaultSubPct}%).`}>
                <Input name="subscriptionDiscountPct" inputMode="numeric" value={subPct} onChange={(e) => setSubPct(e.target.value.replace(/\D/g, ""))} placeholder={String(defaultSubPct)} />
              </Field>
              {priceNum > 0 ? (
                <p className="mt-2 text-sm text-burgundy-900">
                  Áskrifendur greiða <strong>{krDisplay(subPrice)}</strong> og spara <strong>{krDisplay(priceNum - subPrice)}</strong> á hverjum kassa.
                </p>
              ) : null}
            </div>
          ) : null}
        </Section>

        <Section title="Birting">
          <Toggle name="active" defaultChecked={product.active} label="Sýnileg í versluninni" hint="Taktu hakið úr til að fela vöruna án þess að eyða henni." />
          <Toggle name="featured" defaultChecked={product.featured} label="Vinsæl vara" hint="Birtist á forsíðunni undir „Vinsælar vörur“." />
          <Field label="Flokkur">
            <Select name="categoryId" defaultValue={product.categoryId ?? ""}>
              <option value="">Enginn flokkur</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Röðun" hint="Lægri tala birtist fyrr.">
            <Input name="sortOrder" inputMode="numeric" defaultValue={product.sortOrder} />
          </Field>
        </Section>

        <Section title="Birgðir og afhending">
          <label className="flex items-center gap-3 text-[15px] font-semibold">
            <input type="checkbox" name="trackStock" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} className="h-5 w-5 accent-[#6A2833]" />
            Fylgjast með birgðum
          </label>
          {trackStock ? <Field label="Fjöldi á lager"><Input name="stock" inputMode="numeric" defaultValue={product.stock ?? 0} /></Field> : null}
          <Field label="Geymsla í Pikkoló" hint="Segir Pikkoló hvort varan þurfi kælingu.">
            <Select name="storageType" defaultValue={product.storageType}>
              <option value="Refrigerated">Kæld (ávextir)</option>
              <option value="Ambient">Við stofuhita (þurrvara)</option>
              <option value="Frozen">Frosin</option>
            </Select>
          </Field>
        </Section>

        <Section title="Tæknilegt">
          <Field label="Vefslóð (slug)" hint="Myndast sjálfkrafa úr nafninu ef autt."><Input name="slug" defaultValue={product.slug} placeholder="t.d. finca-classic" /></Field>
          <Field label="Vörunúmer (SKU)" hint="Notað til að para saman við WooCommerce og Pikkoló."><Input name="sku" defaultValue={product.sku} /></Field>
          <Toggle
            name="syncToWoo"
            defaultChecked={product.syncToWoo}
            label="Halda samstilltu við WooCommerce"
            hint={wooConfigured ? "Verð, birgðir og sýnileiki eru send til WooCommerce í hvert sinn sem þú vistar." : "WooCommerce er ekki tengt ennþá (sjá Tengingar)."}
          />
          {product.wooId ? <p className="text-xs text-muted">Tengt WooCommerce vöru nr. {product.wooId}.</p> : null}
        </Section>

        <div className="sticky bottom-4 z-10 rounded-2xl border border-line bg-white/95 p-3 shadow-pop backdrop-blur">
          <SubmitButton variant="primary" size="lg" className="w-full" pendingText="Vista…">
            <Icon name="check" className="h-5 w-5" /> {product.id ? "Vista breytingar" : "Búa til vöru"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
