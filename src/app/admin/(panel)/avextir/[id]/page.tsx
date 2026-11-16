import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/forms";
import { Icon } from "@/components/ui/Icon";
import { FruitForm } from "../FruitForm";
import { deleteFruit } from "../actions";

export const metadata = { title: "Breyta ávexti" };

export default async function EditFruitPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const f = await db.fruit.findUnique({ where: { id }, include: { _count: { select: { deliveries: true } } } });
  if (!f) notFound();
  return (
    <>
      <PageHeader title={f.name} description="Breytingar sjást á síðunni um leið og þú vistar." back={{ href: "/admin/avextir", label: "Allir ávextir" }} />
      <FruitForm
        fruit={{ id: f.id, name: f.name, slug: f.slug, variety: f.variety, illustration: f.illustration || "other", color: f.color, imageUrl: f.imageUrl, origin: f.origin, region: f.region, farmer: f.farmer, season: f.season, description: f.description, taste: f.taste, storage: f.storage, ripeness: f.ripeness, goodToKnow: f.goodToKnow, reviewed: f.reviewed, active: f.active }}
      />
      <Card title="Eyða ávexti" className="mt-6" description={f._count.deliveries ? `Ávöxturinn er skráður í ${f._count.deliveries} sendingu(m) og verður tekinn úr þeim. Þú getur líka bara gert hann óvirkan.` : "Þú getur líka bara gert hann óvirkan."}>
        <form action={deleteFruit}>
          <input type="hidden" name="id" value={f.id} />
          <SubmitButton variant="danger" size="sm" confirm={`Eyða "${f.name}" fyrir fullt og allt?`}><Icon name="trash" className="h-4 w-4" /> Eyða ávexti</SubmitButton>
        </form>
      </Card>
    </>
  );
}
