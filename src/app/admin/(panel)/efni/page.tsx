import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PageHeader, Card, Explainer } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/forms";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { FaqEditor } from "./FaqEditor";
import { saveContent } from "./actions";

export const metadata = { title: "Efni síðunnar" };

function Section({ id, title, description, children, where }: { id: string; title: string; description?: string; where?: string; children: ReactNode }) {
  return (
    <Card title={title} description={description} actions={where ? <a href={where} target="_blank" className="text-sm font-semibold text-burgundy hover:underline">Skoða á síðunni ↗</a> : undefined}>
      <form action={saveContent} className="space-y-4" id={id}>
        <input type="hidden" name="section" value={id} />
        {children}
        <div className="flex justify-end"><SubmitButton variant="primary">Vista</SubmitButton></div>
      </form>
    </Card>
  );
}

export default async function ContentPage() {
  await requireAdmin();
  const s = await getSettings(["store.announcement", "content.hero", "content.story", "content.b2b", "content.about", "content.faq", "store.name", "store.email", "store.phone", "store.address", "store.facebook", "store.instagram"]);
  return (
    <>
      <PageHeader title="Efni síðunnar" description="Breyttu textunum á síðunni. Allt vistast strax og sést um leið." />
      <Explainer>
        <p>Hver kassi hér stjórnar einum hluta af síðunni. Breyttu textanum og smelltu á <strong>Vista</strong>. Smelltu á „Skoða á síðunni“ til að sjá útkomuna.</p>
        <p>Auð lína í löngum texta býr til nýja málsgrein.</p>
      </Explainer>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section id="announcement" title="Borði efst á síðunni" description="Græna línan efst á öllum síðum. Hafðu hana stutta." where="/">
          <Field label="Texti"><Input name="announcement" defaultValue={s["store.announcement"]} placeholder="T.d. 5–10% afsláttur í áskrift" /></Field>
        </Section>

        <Section id="hero" title="Forsíða: aðalfyrirsögn" description="Það fyrsta sem fólk sér á forsíðunni." where="/">
          <Field label="Litli textinn fyrir ofan"><Input name="eyebrow" defaultValue={s["content.hero"].eyebrow} /></Field>
          <Field label="Fyrirsögn"><Input name="title" defaultValue={s["content.hero"].title} required /></Field>
          <Field label="Texti undir fyrirsögn"><Textarea name="subtitle" defaultValue={s["content.hero"].subtitle} rows={3} /></Field>
        </Section>

        <Section id="story" title="Sagan okkar" description="Birtist á forsíðunni og á Um okkur." where="/um-okkur">
          <Field label="Fyrirsögn"><Input name="title" defaultValue={s["content.story"].title} /></Field>
          <Field label="Texti"><Textarea name="body" defaultValue={s["content.story"].body} rows={6} /></Field>
        </Section>

        <Section id="b2b" title="Fyrirtækjaþjónusta" description="Kynning á fyrirtækjakassanum." where="/fyrirtaekjathjonusta">
          <Field label="Fyrirsögn"><Input name="title" defaultValue={s["content.b2b"].title} /></Field>
          <Field label="Texti"><Textarea name="body" defaultValue={s["content.b2b"].body} rows={4} /></Field>
        </Section>

        <Section id="about" title="Um okkur" description="Lengri texti á síðunni Um okkur." where="/um-okkur">
          <Field label="Texti"><Textarea name="about" defaultValue={s["content.about"]} rows={8} /></Field>
        </Section>

        <Section id="store" title="Upplýsingar um verslunina" description="Birtast í síðufæti og í tölvupóstum.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nafn"><Input name="name" defaultValue={s["store.name"]} /></Field>
            <Field label="Netfang"><Input name="email" type="email" defaultValue={s["store.email"]} /></Field>
            <Field label="Sími"><Input name="phone" defaultValue={s["store.phone"]} /></Field>
            <Field label="Heimilisfang"><Input name="address" defaultValue={s["store.address"]} /></Field>
            <Field label="Facebook slóð" hint="Valfrjálst. Ef autt birtist enginn hlekkur."><Input name="facebook" defaultValue={s["store.facebook"]} placeholder="https://facebook.com/…" /></Field>
            <Field label="Instagram slóð" hint="Valfrjálst."><Input name="instagram" defaultValue={s["store.instagram"]} placeholder="https://instagram.com/…" /></Field>
          </div>
        </Section>
      </div>
      <div className="mt-5">
        <Card title="Spurt og svarað" description="Spurningar og svör á síðunni Spurt og svarað. Raðaðu með örvunum." actions={<a href="/spurt-og-svarad" target="_blank" className="text-sm font-semibold text-burgundy hover:underline">Skoða á síðunni ↗</a>}>
          <FaqEditor initial={s["content.faq"]} />
        </Card>
      </div>
    </>
  );
}
