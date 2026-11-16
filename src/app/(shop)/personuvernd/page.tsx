import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { PageIntro } from "@/components/shop/sections/PageIntro";

export const metadata: Metadata = { title: "Persónuverndarstefna" };

// ATH: Drög sem lýsa því hvernig þessi vefur vinnur með gögn. Fincafresh þarf að yfirfara.
export default async function PrivacyPage() {
  const s = await getSettings(["store.email", "store.address"]);
  return (
    <>
      <PageIntro title="Persónuverndarstefna" crumbs={[{ href: "/", label: "Forsíða" }, { href: "/personuvernd", label: "Persónuvernd" }]} />
      <div className="prose-ff mx-auto max-w-3xl px-4 pb-10 text-[16.5px] text-ink/85 sm:px-6">
        <p className="rounded-2xl bg-lemon-100 px-4 py-3 text-sm text-burgundy-900">Drög að persónuverndarstefnu. Á eftir að yfirfara.</p>
        <h2>Hvaða upplýsingum söfnum við?</h2>
        <ul>
          <li>Nafni, netfangi, símanúmeri og (valfrjálst) kennitölu þegar þú pantar.</li>
          <li>Heimilisfangi ef þú velur heimsendingu, eða valinni Pikkoló stöð.</li>
          <li>Pöntunarsögu og upplýsingum um áskrift.</li>
          <li>Nafnlausum upplýsingum um notkun vefsins. Ef þú samþykkir tölfræðivafrakökur notum við einnig PostHog til að skilja hvernig vefurinn er notaður.</li>
        </ul>
        <h2>Til hvers?</h2>
        <p>Til að afgreiða og afhenda pantanir, stjórna áskrift, svara fyrirspurnum og bæta vefinn. Fréttabréf sendum við aðeins ef þú hefur beðið um það.</p>
        <h2>Hverjum deilum við upplýsingum með?</h2>
        <p>Aðeins þeim sem þurfa þær til að veita þjónustuna: afhendingaraðilum (Pikkoló og Samskip), greiðsluþjónustu, tölvupóstþjónustu og PostHog (aðeins með samþykki).</p>
        <h2>Vafrakökur</h2>
        <p>Nauðsynlegar vafrakökur (t.d. fyrir körfu og innskráningu) eru alltaf virkar. Tölfræðivafrakökur eru aðeins notaðar ef þú samþykkir þær.</p>
        <h2>Réttindi þín</h2>
        <p>Þú átt rétt á að fá aðgang að upplýsingum um þig, láta leiðrétta þær eða eyða þeim, samkvæmt lögum nr. 90/2018 um persónuvernd og vinnslu persónuupplýsinga. Hafðu samband á {s["store.email"]}. Þú getur einnig leitað til Persónuverndar.</p>
        <h2>Ábyrgðaraðili</h2>
        <p>Fincafresh, {s["store.address"]}.</p>
      </div>
    </>
  );
}
