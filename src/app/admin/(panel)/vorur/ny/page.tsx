import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { wooConfig } from "@/lib/integrations/woocommerce";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "Ný vara" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ tegund?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [categories, defPct, woo] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    getSetting("subscription.defaultDiscountPct"),
    wooConfig(),
  ]);
  return (
    <>
      <PageHeader title="Ný vara" description="Fylltu út það helsta. Þú getur alltaf breytt seinna." back={{ href: "/admin/vorur", label: "Allar vörur" }} />
      <ProductForm
        categories={categories}
        defaultSubPct={defPct}
        wooConfigured={woo.configured}
        product={{
          name: "", slug: "", sku: "", type: sp.tegund === "BOX" ? "BOX" : "ITEM", tier: null, tagline: "", shortDescription: "", description: "",
          features: [], images: [], price: 0, compareAtPrice: null, subscriptionDiscountPct: null, weightLabel: "", suitsFor: "",
          storageType: sp.tegund === "BOX" ? "Refrigerated" : "Ambient", trackStock: false, stock: null, active: true, featured: false,
          sortOrder: 0, syncToWoo: false, categoryId: null, wooId: null,
        }}
      />
    </>
  );
}
