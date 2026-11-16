import type { Metadata } from "next";
import Image from "next/image";
import { getSetting } from "@/lib/settings";
import { PageIntro } from "@/components/shop/sections/PageIntro";
import { InquiryForm } from "@/components/shop/InquiryForm";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Fyrirtækjaþjónusta", description: "Ferskir ávextir á vinnustaðinn. Fáðu tilboð." };

export default async function B2BPage() {
  const b2b = await getSetting("content.b2b");
  return (
    <>
      <PageIntro eyebrow="Fyrirtækjaþjónusta" title={b2b.title} crumbs={[{ href: "/", label: "Forsíða" }, { href: "/fyrirtaekjathjonusta", label: "Fyrirtækjaþjónusta" }]}>
        {b2b.body}
      </PageIntro>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[2rem] shadow-soft">
            <Image src="/images/fyrirtaeki.webp" alt="Fincafresh kassar fyrir vinnustaði" fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
          </div>
          <ul className="mt-6 space-y-3 text-[16px]">
            {["Árstíðabundnir ávextir beint frá bændum", "Lausn sem hentar stærð hópsins", "Reglulegar sendingar eða stakar"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Icon name="check" className="h-5 w-5 text-leaf" /> {t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-line bg-cream-50 p-6 sm:p-8">
          <h2 className="font-display text-3xl text-burgundy">Fáðu tilboð</h2>
          <p className="mb-6 mt-1 text-muted">Segðu okkur aðeins frá vinnustaðnum og við höfum samband.</p>
          <InquiryForm type="B2B" />
        </div>
      </div>
    </>
  );
}
