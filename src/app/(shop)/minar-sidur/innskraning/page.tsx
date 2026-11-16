import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { AuthForms } from "@/components/shop/AuthForms";
import { LemonMark } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Innskráning", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ netfang?: string; utrunnid?: string }> }) {
  if (await getCustomer()) redirect("/minar-sidur");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <LemonMark className="mx-auto h-20 w-auto" title="" aria-hidden />
      <h1 className="mt-4 text-center font-display text-4xl text-burgundy">Mínar síður</h1>
      <p className="mt-2 text-center text-muted">Stjórnaðu áskriftinni og skoðaðu pantanir.</p>
      {sp.utrunnid ? <p className="mt-4 rounded-xl bg-orange/10 px-3 py-2 text-center text-sm font-medium text-orange-600">Tengillinn er útrunninn. Biddu um nýjan hér að neðan.</p> : null}
      <AuthForms defaultEmail={sp.netfang ?? ""} />
    </div>
  );
}
