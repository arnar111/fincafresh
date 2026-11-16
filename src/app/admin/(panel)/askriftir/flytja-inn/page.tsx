import Link from "next/link";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { PageHeader, Card, Explainer } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const [boxes, freqs] = await Promise.all([db.product.findMany({ where: { type: "BOX" }, orderBy: { sortOrder: "asc" } }), getSetting("subscription.frequencies")]);
  return (
    <>
      <PageHeader
        back={{ href: "/admin/askriftir", label: "Áskriftir" }}
        title="Flytja inn áskrifendur"
        description="Settu inn lista af áskrifendum úr öðru kerfi (t.d. Repeat eða Excel) í einu lagi."
        actions={<a href="/api/admin/export/askriftir-snidmat" className={buttonClass("light", "sm")}><Icon name="download" className="h-4 w-4" /> Sækja sniðmát</a>}
      />
      <Explainer title="Svona gerir þú þetta">
        <p>1) Smelltu á <strong>Sækja sniðmát</strong> og opnaðu skrána í Excel. 2) Fylltu út eina línu fyrir hvern áskrifanda. 3) Vistaðu sem &quot;CSV (semíkommuaðskilið)&quot;. 4) Veldu skrána hér fyrir neðan, skoðaðu forskoðunina og smelltu á &quot;Flytja inn&quot;.</p>
        <p>Ef viðskiptavinur er þegar með sömu áskrift er hún <strong>uppfærð</strong> en ekki tvöfölduð. Það er því óhætt að flytja sama listann inn aftur.</p>
      </Explainer>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
        <Card title="Skrá"><ImportForm /></Card>
        <Card title="Dálkar">
          <ol className="list-decimal space-y-2 pl-5 text-[15px]">
            <li><strong>Netfang</strong> (skylda)</li>
            <li><strong>Nafn</strong></li>
            <li><strong>Sími</strong></li>
            <li><strong>Kassi</strong>: {boxes.map((b) => <code key={b.id} className="mx-0.5 whitespace-nowrap rounded bg-cream px-1 text-xs">{b.slug}</code>)} eða nafn kassans</li>
            <li><strong>Tíðni</strong>: {freqs.map((f) => `${f.every} = ${f.label.toLowerCase()}`).join(", ")}</li>
            <li><strong>Staða</strong>: virk, í hléi eða sagt upp (autt = virk)</li>
            <li><strong>Repeat</strong> (valfrjálst): auðkenni áskriftar í Repeat</li>
          </ol>
          <p className="mt-4 text-sm text-muted">Nýir áskrifendur fá fyrstu pöntunina þegar þú býrð til áskriftarpantanir undir <Link href="/admin/sendingar" className="underline">Sendingar</Link>.</p>
        </Card>
      </div>
    </>
  );
}
