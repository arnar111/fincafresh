import type { Metadata } from "next";
import Image from "next/image";
import { getSetting } from "@/lib/settings";
import { PageIntro } from "@/components/shop/sections/PageIntro";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Um okkur" };

export default async function AboutPage() {
  const [about, story] = await Promise.all([getSetting("content.about"), getSetting("content.story")]);
  return (
    <>
      <PageIntro eyebrow="Sagan okkar" title={story.title} crumbs={[{ href: "/", label: "Forsíða" }, { href: "/um-okkur", label: "Um okkur" }]} />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="relative aspect-[1.2] overflow-hidden rounded-[2rem] shadow-soft">
          <Image src="/images/sagan-okkar.webp" alt="Stofnendur Fincafresh hjá bónda á Spáni" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
        </div>
        <div className="prose-ff text-lg text-ink/85">
          {[...story.body.split("\n\n"), ...about.split("\n\n")].map((p, i) => <p key={i}>{p}</p>)}
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/kassar">Skoða kassana</ButtonLink>
            <ButtonLink href="/askrift" variant="outline">Áskrift</ButtonLink>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-6 grid max-w-7xl grid-cols-3 gap-3 px-4 sm:px-6 lg:px-8">
        {["/images/brand-mango.webp", "/images/brand-ferskjur.webp", "/images/brand-aprikosur.webp"].map((src) => (
          <div key={src} className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]"><Image src={src} alt="" fill sizes="33vw" className="object-cover" /></div>
        ))}
      </div>
    </>
  );
}
