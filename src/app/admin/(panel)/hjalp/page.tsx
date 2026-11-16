import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Hjálp" };

function Topic({ id, icon, title, children }: { id: string; icon: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-line bg-white p-6">
      <h2 className="mb-3 flex items-center gap-3 font-display text-xl text-burgundy">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-cream"><Icon name={icon} className="h-5 w-5" /></span>
        {title}
      </h2>
      <div className="space-y-3 text-[15.5px] leading-relaxed text-ink/90 [&_a]:font-semibold [&_a]:text-burgundy [&_a]:underline">{children}</div>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-burgundy font-display text-cream">{n}</span>
      <div><div className="font-semibold text-ink">{title}</div><div className="text-[15px] text-ink/85">{children}</div></div>
    </li>
  );
}

const TOC = [
  ["dagurinn", "Daglega rútínan"],
  ["sendingar", "Ein sending frá A til Ö"],
  ["verd", "Breyta verði eða texta"],
  ["ny-vara", "Bæta við vöru"],
  ["avextir", "Ávextir og Delúx"],
  ["greining", "Að lesa greininguna"],
  ["tengingar", "Hvað gera tengingarnar?"],
  ["vandi", "Ef eitthvað fer úrskeiðis"],
];

export default async function HelpPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Hjálp" description="Leiðbeiningar á mannamáli. Þú getur ekki skemmt neitt með því að prófa, og allt sem er hættulegt spyr fyrst." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="h-fit rounded-2xl border border-line bg-white p-3 lg:sticky lg:top-6" aria-label="Efnisyfirlit">
          {TOC.map(([id, label]) => <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-2 text-sm font-semibold text-burgundy hover:bg-cream">{label}</a>)}
        </nav>
        <div className="space-y-5">
          <Topic id="dagurinn" icon="sun" title="Daglega rútínan (5 mínútur)">
            <ol className="space-y-4">
              <Step n={1} title="Opnaðu Yfirlit">Þar sérðu nýjar pantanir, hvað þarf að gera í dag og hvernig salan gengur.</Step>
              <Step n={2} title="Kíktu á Pantanir">Nýjar pantanir eru með appelsínugulu merki. Opnaðu pöntun til að sjá hvað á að fara í kassann og hvert.</Step>
              <Step n={3} title="Svaraðu fyrirspurnum">Ef appelsínugult merki er við <Link href="/admin/fyrirspurnir">Fyrirspurnir</Link> hefur einhver sent skilaboð, t.d. fyrirtæki sem vill fá tilboð.</Step>
            </ol>
          </Topic>

          <Topic id="sendingar" icon="truck" title="Ein sending frá A til Ö">
            <p>Hver sending frá Spáni fer í gegnum sömu skref. Allt er gert undir <Link href="/admin/sendingar">Sendingar</Link>:</p>
            <ol className="space-y-4">
              <Step n={1} title="Skráðu sendinguna og veldu ávextina">Settu dagsetningu og síðasta pöntunardag. Veldu hvaða ávextir fara í kassann og hakaðu við þá sem eru <strong>aðeins í Delúx</strong>. Þetta birtist strax á forsíðunni undir „Hvað er í næstu sendingu?“.</Step>
              <Step n={2} title="Síðasti pöntunardagur rennur upp">Eftir það eru engar breytingar á áskriftum fyrir þessa sendingu.</Step>
              <Step n={3} title="Búðu til áskriftarpantanir">Einn smellur býr til pöntun fyrir hvern áskrifanda sem á að fá kassa í þessari sendingu. Þeir sem slepptu eða eru í hléi fá ekki kassa. Óhætt er að smella aftur, engin pöntun verður tvítekin.</Step>
              <Step n={4} title="Pakkaðu eftir pökkunarlistanum">Pökkunarlistinn segir hversu marga Classic, Grande og Delúx kassa þarf, og innkaupalistinn hjálpar við að panta rétt magn frá bændunum.</Step>
              <Step n={5} title="Sendu af stað">Pikkoló pantanir eru sendar til Pikkoló með einum smelli (eða sjálfkrafa). Fyrir heimsendingar sækir þú sendingarlistann og sendir Samskip.</Step>
              <Step n={6} title="Merktu sendar">Merktu pantanirnar sem sendar. Þá vita viðskiptavinir að kassinn er á leiðinni.</Step>
            </ol>
          </Topic>

          <Topic id="verd" icon="tag" title="Breyta verði eða texta">
            <p><strong>Verð á kassa eða vöru:</strong> Farðu í <Link href="/admin/vorur">Vörur</Link>, smelltu á vöruna, breyttu verðinu og smelltu á <em>Vista breytingar</em>. Ef þú setur „Fyrra verð“ birtist það yfirstrikað (tilboð).</p>
            <p><strong>Áskriftarafsláttur:</strong> Er stilltur á hverjum kassa (t.d. 15% á Delúx). Í vöruforminu sérðu strax hvað áskrifendur greiða.</p>
            <p><strong>Textar á forsíðu, Um okkur, Spurt og svarað:</strong> Undir <Link href="/admin/efni">Efni síðunnar</Link>.</p>
            <p><strong>Sendingarverð:</strong> Undir <Link href="/admin/stillingar#sending">Stillingar</Link>.</p>
          </Topic>

          <Topic id="ny-vara" icon="plus" title="Bæta við vöru">
            <ol className="space-y-4">
              <Step n={1} title="Smelltu á Ný vara">Undir <Link href="/admin/vorur">Vörur</Link>.</Step>
              <Step n={2} title="Veldu tegund">„Ávaxtakassi“ ef hægt á að vera að kaupa í áskrift, annars „Vara í netverslun“.</Step>
              <Step n={3} title="Nafn, lýsing, verð og mynd">Dragðu inn mynd eða smelltu á „Bæta við mynd“. Fyrsta myndin er aðalmyndin.</Step>
              <Step n={4} title="Vista">Varan birtist strax í versluninni ef hakað er við „Sýnileg“.</Step>
            </ol>
            <p>Uppseld vara? Smelltu á <em>Fela</em> í vörulistanum. Hún hverfur úr búðinni en gögnin haldast.</p>
          </Topic>

          <Topic id="avextir" icon="leaf" title="Ávextir og Delúx">
            <p>Á forsíðunni getur fólk smellt á hvern ávöxt og lesið um bragð, geymslu og uppruna. Textarnir eru undir <Link href="/admin/avextir">Ávextir</Link>, og forskoðunin sýnir nákvæmlega hvernig þetta lítur út.</p>
            <p>Ávextir sem eru <strong>aðeins í Delúx</strong> fá gylltan, glóandi hring og hnapp sem leiðir beint að Delúx kassanum. Þú velur þá undir <Link href="/admin/sendingar">Sendingar</Link>.</p>
            <p>Textarnir voru settir inn sem <strong>drög</strong>. Lestu þá yfir og hakaðu við „Ég hef yfirfarið textann“.</p>
          </Topic>

          <Topic id="greining" icon="chart" title="Að lesa greininguna">
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Kaupferlið:</strong> Hversu margir skoða vöru, setja í körfu, byrja að greiða og klára. Stórt fall milli tveggja stiga segir hvar má bæta.</li>
              <li><strong>Áskriftarglugginn:</strong> Þegar einhver velur stakan kassa er honum boðin áskrift í staðinn. Hér sérðu hversu margir þiggja.</li>
              <li><strong>Keyptu líka:</strong> Hvaða vörur eru oft keyptar saman. „Festa sem meðmæli“ lætur vöruna alltaf birtast á vörusíðunni og í körfunni.</li>
              <li><strong>Fáðu fastakúnna í áskrift:</strong> Fólk sem kaupir oft staka kassa. Einn smellur sendir þeim persónulegt tilboð.</li>
            </ul>
            <p>Sjá <Link href="/admin/greining">Greining</Link>.</p>
          </Topic>

          <Topic id="tengingar" icon="plug" title="Hvað gera tengingarnar?">
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>WooCommerce:</strong> Gamla vefverslunin. Héðan sækir þú vörur, viðskiptavini og eldri pantanir svo sagan fylgi með.</li>
              <li><strong>Pikkoló:</strong> Kældu afhendingarstöðvarnar. Viðskiptavinir velja stöð í körfunni og pantanir eru sendar þangað héðan.</li>
              <li><strong>Repeat:</strong> Endurteknar greiðslur fyrir áskriftir. Beðið er eftir API-skjölun frá Repeat.</li>
              <li><strong>Samskip:</strong> Heimsendingar. Sótt hefur verið um aðgang; á meðan er notaður sendingarlisti.</li>
              <li><strong>PostHog:</strong> Skráir hvernig fólk notar síðuna. Gögnin birtast undir Greining.</li>
              <li><strong>Tölvupóstur:</strong> Pöntunarstaðfestingar og tilboð.</li>
            </ul>
            <p>Allt er stillt undir <Link href="/admin/tengingar">Tengingar</Link>.</p>
          </Topic>

          <Topic id="vandi" icon="help" title="Ef eitthvað fer úrskeiðis">
            <ul className="list-disc space-y-2 pl-5">
              <li>Rauð skilaboð neðst í horninu segja hvað fór úrskeiðis. Lestu þau og reyndu aftur.</li>
              <li>Undir <Link href="/admin/tengingar">Tengingar</Link> neðst er listi yfir síðustu atburði. Þar sést t.d. ef Pikkoló hafnaði pöntun og af hverju.</li>
              <li>Tölvupóstar sem fóru ekki eru undir <Link href="/admin/fyrirspurnir?flipi=postur">Fyrirspurnir → Útsendur póstur</Link>.</li>
              <li>Ef ekkert hjálpar: hafðu samband við þann sem setti síðuna upp og segðu hvað þú varst að gera og hvaða skilaboð birtust (skjáskot hjálpar).</li>
            </ul>
          </Topic>
        </div>
      </div>
    </>
  );
}
