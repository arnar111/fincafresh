import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";
import { PageIntro } from "@/components/shop/sections/PageIntro";
import { Faq } from "@/components/shop/Faq";

export const metadata: Metadata = { title: "Spurt og svarað" };

export default async function FaqPage() {
  const [faq, email, phone] = await Promise.all([getSetting("content.faq"), getSetting("store.email"), getSetting("store.phone")]);
  return (
    <>
      <PageIntro eyebrow="Hjálp" title="Spurt og svarað" crumbs={[{ href: "/", label: "Forsíða" }, { href: "/spurt-og-svarad", label: "Spurt og svarað" }]}>
        Finnurðu ekki svarið? Sendu okkur línu á <a href={`mailto:${email}`} className="underline">{email}</a> eða hringdu í {phone}.
      </PageIntro>
      <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6"><Faq items={faq} /></div>
    </>
  );
}
