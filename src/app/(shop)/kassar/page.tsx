import type { Metadata } from "next";
import { getBoxes, getNextDelivery } from "@/lib/catalog";
import { liteFruit, liteProduct, findDelux } from "@/lib/lite";
import { kr, dateWithDayAcc } from "@/lib/format";
import { PageIntro } from "@/components/shop/sections/PageIntro";
import { Section, Eyebrow, H2 } from "@/components/shop/sections/Section";
import { BoxChooser } from "@/components/shop/BoxChooser";
import { FruitShowcase } from "@/components/shop/FruitShowcase";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Ávaxtakassar", description: "Finca Classic, Grande og Delúx. Stakir kassar eða áskrift með afslætti." };

export default async function BoxesPage() {
  const [raw, next] = await Promise.all([getBoxes(), getNextDelivery()]);
  const boxes = raw.map(liteProduct);
  const delux = boxes.length ? findDelux(boxes) : null;
  const fruits = next?.fruits.map((f) => liteFruit(f.fruit, f.deluxeOnly)) ?? [];
  const yes = <Icon name="check" className="mx-auto h-5 w-5 text-leaf" />;
  const no = <span className="text-muted">–</span>;

  return (
    <>
      <PageIntro eyebrow="Kassarnir" title="Veldu kassa sem hentar þér" crumbs={[{ href: "/", label: "Forsíða" }, { href: "/kassar", label: "Kassar" }]}>
        Allir kassar innihalda handvalda, árstíðabundna ávexti beint frá bændum á Spáni. Í áskrift færðu afslátt af hverjum kassa.
      </PageIntro>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <BoxChooser boxes={boxes} />
      </div>

      <Section tone="light">
        <Eyebrow>Samanburður</Eyebrow>
        <H2>Hver er munurinn?</H2>
        <div className="mt-8 overflow-x-auto rounded-3xl border border-line bg-white">
          <table className="w-full min-w-[620px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-line">
                <th className="p-4 font-semibold text-muted" scope="col"><span className="sr-only">Eiginleiki</span></th>
                {boxes.map((b) => (
                  <th key={b.id} scope="col" className={`p-4 text-center font-display text-xl ${b.tier === "DELUX" ? "bg-lemon-100/60 text-burgundy" : "text-burgundy"}`}>
                    {b.tier === "DELUX" ? <Icon name="crown" className="mr-1 inline h-5 w-5 text-gold" /> : null}
                    {b.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr]:border-b [&_tr]:border-line/60 [&_td]:p-4 [&_td]:text-center [&_th]:p-4 [&_th]:font-medium">
              <tr><th scope="row">Stærð</th>{boxes.map((b) => <td key={b.id}>{b.weightLabel || "–"}</td>)}</tr>
              <tr><th scope="row">Hentar fyrir</th>{boxes.map((b) => <td key={b.id}>{b.suitsFor || "–"}</td>)}</tr>
              <tr><th scope="row">Árstíðabundið úrval</th>{boxes.map((b) => <td key={b.id}>{yes}</td>)}</tr>
              <tr><th scope="row">Aukaávextir sem fást aðeins í Delúx</th>{boxes.map((b) => <td key={b.id} className={b.tier === "DELUX" ? "bg-lemon-100/60" : ""}>{b.tier === "DELUX" ? yes : no}</td>)}</tr>
              <tr><th scope="row">Verð, stakur kassi</th>{boxes.map((b) => <td key={b.id}>{kr(b.price)}</td>)}</tr>
              <tr><th scope="row">Verð í áskrift</th>{boxes.map((b) => <td key={b.id} className="font-semibold text-leaf">{kr(b.subPrice)} <span className="text-xs font-bold">(-{b.subDiscountPct}%)</span></td>)}</tr>
            </tbody>
          </table>
        </div>
      </Section>

      {fruits.length ? (
        <Section>
          <Eyebrow>Í kassanum núna</Eyebrow>
          <H2>Í næstu sendingu</H2>
          {next ? <p className="mb-8 mt-2 text-muted">Sendingin kemur {dateWithDayAcc(next.date)}. Smelltu á ávöxt til að lesa um hann.</p> : null}
          <FruitShowcase fruits={fruits} delux={delux} />
        </Section>
      ) : null}
    </>
  );
}
