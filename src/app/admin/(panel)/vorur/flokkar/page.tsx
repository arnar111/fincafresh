import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Card, Explainer, EmptyState } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/forms";
import { Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { deleteCategory, saveCategory } from "../actions";

export const metadata = { title: "Flokkar" };

export default async function CategoriesPage() {
  await requireAdmin();
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageHeader title="Flokkar" description="Flokkar í netversluninni, t.d. Þurrkað eða Gjafavara." back={{ href: "/admin/vorur", label: "Vörur" }} />
      <Explainer>
        <p>Flokkar birtast sem hnappar í netversluninni svo viðskiptavinir finni vörurnar auðveldlega. Flokkar án vöru eru faldir sjálfkrafa.</p>
        <p>Röðun: lægri tala birtist fyrst.</p>
      </Explainer>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card title="Allir flokkar" padded={false}>
          {cats.length === 0 ? (
            <EmptyState icon="tag" title="Engir flokkar ennþá">Búðu til fyrsta flokkinn hér til hliðar.</EmptyState>
          ) : (
            <ul className="divide-y divide-line/70">
              {cats.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                  <form action={saveCategory} className="flex flex-1 flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <Input name="name" defaultValue={c.name} className="min-w-40 flex-1" aria-label="Nafn flokks" />
                    <Input name="sortOrder" defaultValue={c.sortOrder} inputMode="numeric" className="w-20" aria-label="Röðun" />
                    <span className="w-20 text-sm text-muted">{c._count.products} vörur</span>
                    <SubmitButton variant="light" size="sm">Vista</SubmitButton>
                  </form>
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton variant="ghost" size="sm" confirm={`Eyða flokknum "${c.name}"? Vörurnar í honum verða óflokkaðar (þeim er ekki eytt).`}>
                      <Icon name="trash" className="h-4 w-4" />
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Nýr flokkur">
          <form action={saveCategory} className="space-y-3">
            <Input name="name" placeholder="T.d. Jólagjafir" required />
            <SubmitButton variant="primary" className="w-full"><Icon name="plus" className="h-4 w-4" /> Búa til flokk</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
