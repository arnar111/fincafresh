import { db } from "@/lib/db";
import { kr } from "@/lib/format";
import { getSetting } from "@/lib/settings";
import { DELIVERY_METHOD_LABELS } from "@/lib/orders";
import { PageHeader, Card, Explainer, HelpTip } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/forms";
import { Field, Input, Select } from "@/components/ui/Field";
import { createSubscription } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewSubscription({ searchParams }: { searchParams: Promise<{ vidskiptavinur?: string }> }) {
  const sp = await searchParams;
  const [boxes, freqs, def, customer] = await Promise.all([
    db.product.findMany({ where: { type: "BOX", active: true }, orderBy: { sortOrder: "asc" } }),
    getSetting("subscription.frequencies"),
    getSetting("subscription.defaultDiscountPct"),
    sp.vidskiptavinur ? db.customer.findUnique({ where: { id: sp.vidskiptavinur } }) : null,
  ]);

  return (
    <>
      <PageHeader back={{ href: "/admin/askriftir", label: "Áskriftir" }} title="Ný áskrift" description="Skráðu áskrift fyrir viðskiptavin, t.d. sem hringdi eða sendi tölvupóst." />
      <Explainer>
        <p>Ef netfangið er þegar til tengist áskriftin þeim viðskiptavini. Annars verður til nýr viðskiptavinur.</p>
        <p>Áskriftin fær fyrstu pöntunina þegar þú smellir á <strong>&quot;Búa til áskriftarpantanir&quot;</strong> undir Sendingar.</p>
        <p>Greiðslan sjálf fer í gegnum Repeat. Skráðu Repeat-auðkennið ef þú ert búin(n) að stofna áskriftina þar.</p>
      </Explainer>
      <form action={createSubscription} className="grid gap-6 lg:grid-cols-2">
        <Card title="Viðskiptavinur">
          <div className="space-y-4">
            <Field label="Netfang"><Input name="email" type="email" required defaultValue={customer?.email ?? ""} /></Field>
            <Field label="Nafn"><Input name="name" defaultValue={customer?.name ?? ""} /></Field>
            <Field label="Sími"><Input name="phone" defaultValue={customer?.phone ?? ""} /></Field>
          </div>
        </Card>
        <Card title="Áskrift">
          <div className="space-y-4">
            <Field label="Kassi">
              <Select name="productId" required>
                {boxes.map((b) => <option key={b.id} value={b.id}>{b.name} · {kr(b.price)} · {b.subscriptionDiscountPct ?? def}% afsláttur í áskrift</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Magn"><Input name="quantity" type="number" min={1} max={20} defaultValue={1} /></Field>
              <Field label="Tíðni">
                <Select name="everyNthDelivery" defaultValue="1">
                  {freqs.map((f) => <option key={f.every} value={f.every}>{f.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label={<span className="inline-flex items-center gap-1.5">Sérstakur afsláttur (%) <HelpTip>Skildu eftir autt til að nota afsláttinn sem fylgir kassanum.</HelpTip></span>}>
              <Input name="discountPct" type="number" min={0} max={90} />
            </Field>
            <Field label="Repeat-auðkenni (valfrjálst)"><Input name="repeatId" /></Field>
          </div>
        </Card>
        <Card title="Afhending" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Afhendingarmáti">
              <Select name="deliveryMethod" defaultValue="PIKKOLO">
                {Object.entries(DELIVERY_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Pikkoló stöð (nafn)" hint="Ef afhending er Pikkoló."><Input name="pikkoloStationName" /></Field>
            <Field label="Heimilisfang"><Input name="street" defaultValue={customer?.street ?? ""} /></Field>
            <Field label="Póstnúmer"><Input name="postalCode" defaultValue={customer?.postalCode ?? ""} /></Field>
            <Field label="Staður"><Input name="city" defaultValue={customer?.city ?? ""} /></Field>
          </div>
          <div className="mt-6"><SubmitButton variant="primary" size="lg">Stofna áskrift</SubmitButton></div>
        </Card>
      </form>
    </>
  );
}
