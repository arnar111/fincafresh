import Link from "next/link";
import { db } from "@/lib/db";
import { num } from "@/lib/format";
import { DEMO_LOGIN } from "@/lib/seed/demo";
import { countDemo } from "@/app/admin/(panel)/stillingar/demo";
import { loadDemo, removeDemo, resetDemo } from "@/app/admin/(panel)/demo-actions";
import { SubmitButton, CopyButton } from "./forms";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/components/ui/cn";

const WHAT = [
  ["users", "29 viðskiptavinir", "þar af einn sem getur skráð sig inn á Mínar síður"],
  ["box", "um 80 pantanir", "í öllum stöðum, Pikkoló og heimsending, sumar með afsláttarkóða"],
  ["repeat", "20 áskriftir", "virkar, í hléi, sleppa næstu sendingu og uppsagnir með ástæðu"],
  ["truck", "næsta sending", "pantanir tengdar henni svo pökkunarlisti og Pikkoló sjáist"],
  ["chart", "atburðir fyrir greiningu", "kaupferli, áskriftarglugginn og „keyptu líka“"],
  ["inbox", "fyrirspurnir og póstlisti", "tvær fyrirtækjafyrirspurnir, póstlisti og útsendur póstur"],
] as const;

/** Spjald til að setja inn, endurstilla eða eyða sýndargögnum. Notað á Yfirliti og í Stillingum. */
export async function DemoPanel({ from, compact = false }: { from: string; compact?: boolean }) {
  const c = await countDemo(db);
  const has = c.customers + c.orders + c.events + c.code + c.inquiries + c.newsletter > 0;

  if (!has) {
    return (
      <section className={cn("relative overflow-hidden rounded-2xl border-2 border-dashed border-orange/50 bg-gradient-to-br from-lemon-100/70 to-pink-100/60", compact ? "p-5" : "p-6 sm:p-7")}>
        <div className="flex flex-wrap items-start gap-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-orange-600 shadow-sm"><Icon name="sparkle" className="h-7 w-7" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl text-burgundy">Prófaðu allt með sýndargögnum</h2>
            <p className="mt-1 max-w-2xl text-[15px] text-ink/80">
              Einn smellur fyllir kerfið af tilbúnum gögnum svo þú getir prófað pantanir, áskriftir, sendingar, greiningu og Mínar síður. Allt er merkt og þú eyðir því aftur með einum smelli. Raunveruleg gögn eru aldrei snert.
            </p>
            {!compact ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {WHAT.map(([icon, title, text]) => (
                  <li key={title} className="flex gap-2.5 rounded-xl bg-white/70 p-3 text-sm">
                    <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" />
                    <span><strong className="block text-ink">{title}</strong><span className="text-muted">{text}</span></span>
                  </li>
                ))}
              </ul>
            ) : null}
            <form action={loadDemo} className="mt-5">
              <input type="hidden" name="from" value={from} />
              <SubmitButton variant="primary" size="lg" pendingText="Set inn sýndargögn…">
                <Icon name="sparkle" className="h-5 w-5" /> Setja inn sýndargögn
              </SubmitButton>
            </form>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-lemon/70 bg-lemon-100/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-xl text-burgundy"><Icon name="sparkle" className="h-5 w-5 text-orange-600" /> Sýndargögn eru inni</h2>
          <p className="mt-1 text-sm text-ink/80">
            {num(c.orders)} pantanir · {num(c.subs)} áskriftir · {num(c.customers)} viðskiptavinir · {num(c.inquiries)} fyrirspurnir · {num(c.events)} atburðir
          </p>
          <div className="mt-3 rounded-xl bg-white/80 px-3.5 py-2.5 text-sm">
            <div className="font-semibold text-burgundy">Prófaðu Mínar síður sem viðskiptavinur</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-ink/85">
              <span>Netfang: <code className="rounded bg-cream px-1.5 py-0.5">{DEMO_LOGIN.email}</code></span>
              <CopyButton value={DEMO_LOGIN.email} />
              <span>Lykilorð: <code className="rounded bg-cream px-1.5 py-0.5">{DEMO_LOGIN.password}</code></span>
              <CopyButton value={DEMO_LOGIN.password} />
              <Link href="/minar-sidur/innskraning" target="_blank" className="inline-flex items-center gap-1 font-semibold text-burgundy underline">
                Opna Mínar síður <Icon name="external" className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-1.5 text-xs text-muted">Afsláttarkóðinn <strong>PRUFA10</strong> virkar líka í körfunni. Greiðslur eru í prófunarham.</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={resetDemo}>
            <input type="hidden" name="from" value={from} />
            <SubmitButton variant="light" size="sm" pendingText="Endurstilli…" confirm="Eyða sýndargögnunum og setja þau inn aftur eins og ný? Breytingar sem þú gerðir á sýndargögnum hverfa.">
              <Icon name="refresh" className="h-4 w-4" /> Endurstilla
            </SubmitButton>
          </form>
          <form action={removeDemo}>
            <input type="hidden" name="from" value={from} />
            <SubmitButton variant="danger" size="sm" pendingText="Eyði…" confirm="Eyða öllum sýndargögnum? Raunveruleg gögn haldast.">
              <Icon name="trash" className="h-4 w-4" /> Eyða sýndargögnum
            </SubmitButton>
          </form>
        </div>
      </div>
    </section>
  );
}
