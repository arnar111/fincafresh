import type { Metadata } from "next";
import Image from "next/image";
import { getBoxes, getNextDelivery } from "@/lib/catalog";
import { getSetting } from "@/lib/settings";
import { liteFruit, liteProduct, findDelux } from "@/lib/lite";
import { dateWithDayAcc } from "@/lib/format";
import { Section, Eyebrow, H2 } from "@/components/shop/sections/Section";
import { SubscriptionPitch } from "@/components/shop/sections/SubscriptionPitch";
import { BoxChooser } from "@/components/shop/BoxChooser";
import { FruitShowcase } from "@/components/shop/FruitShowcase";
import { Faq } from "@/components/shop/Faq";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Áskrift", description: "Ávaxtakassi í áskrift með afslætti. Enginn binditími, sleppa eða gera hlé hvenær sem er." };

export default async function SubscriptionPage() {
  const [raw, next, faq] = await Promise.all([getBoxes(), getNextDelivery(), getSetting("content.faq")]);
  const boxes = raw.map(liteProduct);
  const maxPct = Math.max(0, ...boxes.map((b) => b.subDiscountPct));
  const fruits = next?.fruits.map((f) => liteFruit(f.fruit, f.deluxeOnly)) ?? [];
  return (
    <>
      <section className="relative overflow-hidden bg-burgundy text-cream">
        <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-pink/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-lemon px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-burgundy-900">Allt að {maxPct}% afsláttur</span>
            <h1 className="mt-5 font-display text-5xl leading-[1.03] sm:text-6xl">Ferskir ávextir, sjálfkrafa. Ódýrara.</h1>
            <p className="mt-5 max-w-xl text-xl text-cream/85">Veldu kassa og hversu oft hann á að koma. Við sjáum um rest. Enginn binditími og þú getur sleppt sendingu eða gert hlé hvenær sem er.</p>
            <ul className="mt-7 grid gap-2 text-[16px] sm:grid-cols-2">
              {["Afsláttur af hverri sendingu", "Enginn binditími", "Sleppa eða gera hlé með einum smelli", "Breyta um kassa hvenær sem er"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Icon name="check" className="h-5 w-5 text-lemon" /> {t}</li>
              ))}
            </ul>
            <a href="#velja" className="mt-8 inline-flex items-center gap-2 rounded-full bg-orange px-7 py-3.5 font-semibold text-burgundy-900 shadow-[0_8px_20px_-10px_rgb(242_106_35/.8)] hover:bg-orange-600">
              Velja kassa <Icon name="arrow" className="h-5 w-5" />
            </a>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.2rem] shadow-pop ring-8 ring-white/5">
              <Image src="/images/brand-aprikosur.webp" alt="Apríkósur í kassa" fill priority sizes="(min-width:1024px) 40vw, 90vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-5 -left-3 rounded-2xl bg-cream-50 px-5 py-4 text-burgundy shadow-pop sm:-left-8">
              <div className="text-xs font-bold uppercase tracking-[.14em] text-leaf">Í áskrift</div>
              <div className="font-display text-2xl">-{maxPct}% á Delúx</div>
            </div>
          </div>
        </div>
      </section>

      <Section id="velja" className="scroll-mt-24">
        <div className="mb-8 text-center">
          <Eyebrow>Skref 1</Eyebrow>
          <H2>Veldu kassann þinn</H2>
        </div>
        <BoxChooser boxes={boxes} />
      </Section>

      <SubscriptionPitch boxes={boxes} title="Reiknaðu út hvað þú sparar" />

      {fruits.length ? (
        <Section tone="light">
          <Eyebrow>Í næstu sendingu</Eyebrow>
          <H2>Svona lítur kassinn út núna</H2>
          {next ? <p className="mb-8 mt-2 text-muted">Sendingin kemur {dateWithDayAcc(next.date)}.</p> : null}
          <FruitShowcase fruits={fruits} delux={findDelux(boxes)} />
        </Section>
      ) : null}

      <Section>
        <Eyebrow>Spurt og svarað</Eyebrow>
        <H2>Algengar spurningar um áskrift</H2>
        <div className="mt-8 max-w-3xl"><Faq items={faq} /></div>
      </Section>
    </>
  );
}
