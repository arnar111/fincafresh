import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { kr, dateLong } from "@/lib/format";
import { PageHeader, Card, Explainer, EmptyState, th, td, tableClass, tableWrap } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/forms";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";
import { CodeForm } from "./CodeForm";
import { deleteCode, toggleCode } from "./actions";

export const metadata = { title: "Afsláttarkóðar" };

const APPLIES: Record<string, string> = { ALL: "Allt", SUBSCRIPTION: "Áskriftir", SINGLE: "Stök kaup" };

export default async function CodesPage() {
  await requireAdmin();
  const codes = await db.discountCode.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
  const now = new Date();
  return (
    <>
      <PageHeader title="Afsláttarkóðar" description="Kóðar sem viðskiptavinir slá inn í körfunni til að fá afslátt." />
      <Explainer>
        <p>Búðu til kóða hér til hliðar. Viðskiptavinurinn slær hann inn í körfunni og afslátturinn reiknast sjálfkrafa.</p>
        <p><strong>Ábending:</strong> Kóði sem gildir <em>aðeins um áskriftir</em> er góð leið til að fá fólk til að prófa áskrift, t.d. „Fyrsti áskriftarkassinn 20% ódýrari“.</p>
      </Explainer>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <Card title="Allir kóðar" padded={false}>
          {codes.length === 0 ? (
            <EmptyState icon="gift" title="Engir kóðar ennþá">Búðu til fyrsta kóðann hér til hliðar.</EmptyState>
          ) : (
            <div className={tableWrap}>
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={th}>Kóði</th>
                    <th className={th}>Afsláttur</th>
                    <th className={th}>Notkun</th>
                    <th className={th}>Staða</th>
                    <th className={th}><span className="sr-only">Aðgerðir</span></th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => {
                    const expired = c.expiresAt && c.expiresAt < now;
                    const usedUp = c.usageLimit !== null && c.usedCount >= c.usageLimit;
                    return (
                      <tr key={c.id}>
                        <td className={td}>
                          <Link href={`/admin/afslattarkodar/${c.id}`} className="font-mono text-[15px] font-bold text-burgundy hover:underline">{c.code}</Link>
                          {c.description ? <span className="block max-w-xs truncate text-xs text-muted">{c.description}</span> : null}
                        </td>
                        <td className={td}>
                          {c.type === "PERCENT" ? `${c.value}%` : kr(c.value)}
                          <span className="block text-xs text-muted">{APPLIES[c.appliesTo]}{c.minSubtotal ? ` · yfir ${kr(c.minSubtotal)}` : ""}</span>
                        </td>
                        <td className={cn(td, "tabular-nums")}>
                          {c.usedCount}{c.usageLimit !== null ? ` / ${c.usageLimit}` : ""}
                          {c.expiresAt ? <span className="block text-xs text-muted">til {dateLong(c.expiresAt)}</span> : null}
                        </td>
                        <td className={td}>
                          {!c.active ? <Badge tone="muted">Óvirkur</Badge> : expired ? <Badge tone="orange">Útrunninn</Badge> : usedUp ? <Badge tone="orange">Fullnýttur</Badge> : <Badge tone="green">Virkur</Badge>}
                        </td>
                        <td className={cn(td, "whitespace-nowrap text-right")}>
                          <form action={toggleCode} className="inline">
                            <input type="hidden" name="id" value={c.id} />
                            <button className="rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:bg-cream hover:text-burgundy">{c.active ? "Slökkva" : "Kveikja"}</button>
                          </form>
                          <Link href={`/admin/afslattarkodar/${c.id}`} className="rounded-lg px-2 py-1 text-sm font-semibold text-burgundy hover:bg-cream">Breyta</Link>
                          <form action={deleteCode} className="inline">
                            <input type="hidden" name="id" value={c.id} />
                            <SubmitButton variant="ghost" size="sm" confirm={`Eyða kóðanum ${c.code}?`}><Icon name="trash" className="h-4 w-4" /><span className="sr-only">Eyða</span></SubmitButton>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Nýr kóði">
          <CodeForm value={{ code: "", description: "", type: "PERCENT", value: 10, appliesTo: "ALL", minSubtotal: 0, usageLimit: null, expiresAt: "", active: true }} />
        </Card>
      </div>
    </>
  );
}
