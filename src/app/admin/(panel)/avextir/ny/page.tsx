import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { FruitForm } from "../FruitForm";

export const metadata = { title: "Nýr ávöxtur" };

export default async function NewFruitPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Nýr ávöxtur" description="Forskoðunin til hægri sýnir hvernig ávöxturinn lítur út á síðunni." back={{ href: "/admin/avextir", label: "Allir ávextir" }} />
      <FruitForm
        fruit={{ name: "", slug: "", variety: "", illustration: "other", color: "#F9C214", imageUrl: "", origin: "Spánn", region: "", farmer: "", season: "", description: "", taste: "", storage: "", ripeness: "", goodToKnow: "", reviewed: true, active: true }}
      />
    </>
  );
}
