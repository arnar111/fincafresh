import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { PageIntro } from "@/components/shop/sections/PageIntro";

export const metadata: Metadata = { title: "Skilmálar" };

// ATH: Drög. Fincafresh þarf að yfirfara (og helst lögfræðingur) áður en síðan fer í loftið.
export default async function TermsPage() {
  const s = await getSettings(["store.email", "store.phone", "store.address"]);
  return (
    <>
      <PageIntro title="Skilmálar" crumbs={[{ href: "/", label: "Forsíða" }, { href: "/skilmalar", label: "Skilmálar" }]} />
      <div className="prose-ff mx-auto max-w-3xl px-4 pb-10 text-[16.5px] text-ink/85 sm:px-6">
        <p className="rounded-2xl bg-lemon-100 px-4 py-3 text-sm text-burgundy-900">Drög að skilmálum. Á eftir að yfirfara.</p>
        <h2>Almennt</h2>
        <p>Skilmálar þessir gilda um kaup á vörum og áskriftum á vef Fincafresh. Með því að ganga frá pöntun samþykkir kaupandi skilmálana.</p>
        <h2>Verð og greiðsla</h2>
        <p>Öll verð eru í íslenskum krónum með virðisaukaskatti. Fincafresh áskilur sér rétt til að breyta verði án fyrirvara, en verð í staðfestri pöntun breytist ekki.</p>
        <h2>Áskrift</h2>
        <ul>
          <li>Áskrifendur fá afslátt af hverjum kassa eins og hann er auglýstur á vefnum hverju sinni.</li>
          <li>Enginn binditími er á áskrift. Hægt er að sleppa sendingu, gera hlé, breyta eða segja upp á Mínum síðum.</li>
          <li>Breytingar þurfa að berast fyrir lokadag pöntunar fyrir viðkomandi sendingu til að gilda um hana.</li>
        </ul>
        <h2>Afhending</h2>
        <p>Vörur eru afhentar með þeirri sendingu sem tilgreind er við pöntun, í Pikkoló stöð eða með heimsendingu eftir því sem kaupandi velur. Innihald kassa fer eftir því hvað er í árstíð hverju sinni.</p>
        <h2>Réttur til að falla frá samningi</h2>
        <p>Samkvæmt lögum um neytendasamninga nr. 16/2016 gildir réttur til að falla frá samningi ekki um vörur sem geta skemmst eða úrelst fljótt, svo sem ferska ávexti. Ef eitthvað er að vöru við afhendingu biðjum við þig að hafa samband sem fyrst og við finnum lausn.</p>
        <h2>Hafa samband</h2>
        <p>Fincafresh, {s["store.address"]} · {s["store.email"]} · {s["store.phone"]}</p>
      </div>
    </>
  );
}
