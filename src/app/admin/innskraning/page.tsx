import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdmin, loginAdmin } from "@/lib/auth";
import { LemonLogo } from "@/components/brand/Logo";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Innskráning í stjórnborð", robots: { index: false } };

async function login(formData: FormData) {
  "use server";
  const user = await loginAdmin(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (!user) redirect("/admin/innskraning?villa=1");
  redirect("/admin");
}

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ villa?: string }> }) {
  if (await getAdmin()) redirect("/admin");
  const sp = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-burgundy px-4">
      <div className="w-full max-w-sm rounded-[1.75rem] bg-cream-50 p-8 shadow-pop">
        <LemonLogo className="mx-auto mb-4 h-24 w-auto" />
        <h1 className="mb-1 text-center font-display text-2xl text-burgundy">Stjórnborð</h1>
        <p className="mb-6 text-center text-sm text-muted">Skráðu þig inn til að stjórna versluninni.</p>
        {sp.villa ? <p className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">Rangt netfang eða lykilorð.</p> : null}
        <form action={login} className="space-y-4">
          <Field label="Netfang"><Input name="email" type="email" autoComplete="username" required autoFocus /></Field>
          <Field label="Lykilorð"><Input name="password" type="password" autoComplete="current-password" required /></Field>
          <SubmitButton variant="dark" className="w-full">Skrá inn</SubmitButton>
        </form>
      </div>
    </main>
  );
}
