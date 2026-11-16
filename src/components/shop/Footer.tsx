import Link from "next/link";
import { LemonLogo } from "@/components/brand/Logo";
import { getSettings } from "@/lib/settings";
import { NewsletterForm } from "./NewsletterForm";

export async function Footer() {
  const s = await getSettings(["store.phone", "store.email", "store.address", "store.facebook", "store.instagram"]);
  const tel = s["store.phone"].replace(/\s/g, "");
  return (
    <footer className="mt-24 bg-green text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.2fr_.7fr_.8fr_1fr_1.4fr] lg:px-8">
        <div>
          <LemonLogo className="h-24 w-auto" textColor="#F5EBD9" />
          <p className="mt-4 max-w-xs text-[15px] text-cream/85">Árstíðabundnir ávextir, beint frá völdum bændum á Spáni.</p>
        </div>
        <FooterCol title="Verslun" links={[["/kassar", "Kassar"], ["/askrift", "Áskrift"], ["/netverslun", "Netverslun"], ["/fyrirtaekjathjonusta", "Fyrirtækjaþjónusta"]]} />
        <FooterCol title="Fincafresh" links={[["/um-okkur", "Um okkur"], ["/spurt-og-svarad", "Spurt og svarað"], ["/minar-sidur", "Áskriftin mín"]]} />
        <div>
          <h3 className="mb-3 font-sans text-xs font-bold uppercase tracking-[.14em] text-pink">Hafa samband</h3>
          <ul className="space-y-2 text-[15px] text-cream/90">
            <li><a href={`tel:${tel}`} className="hover:text-white">{s["store.phone"]}</a></li>
            <li><a href={`mailto:${s["store.email"]}`} className="hover:text-white">{s["store.email"]}</a></li>
            <li>{s["store.address"]}</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-display text-2xl text-cream">Haltu sambandinu fersku</h3>
          <p className="mb-4 text-[15px] text-cream/85">Fréttir af næstu sendingum og nýjum vörum.</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-[13px] text-cream/75 sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Fincafresh</span>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/skilmalar" className="hover:text-white">Skilmálar</Link>
            <Link href="/personuvernd" className="hover:text-white">Persónuverndarstefna</Link>
            {s["store.facebook"] ? <a href={s["store.facebook"]} className="hover:text-white" rel="noopener">Facebook</a> : null}
            {s["store.instagram"] ? <a href={s["store.instagram"]} className="hover:text-white" rel="noopener">Instagram</a> : null}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="mb-3 font-sans text-xs font-bold uppercase tracking-[.14em] text-pink">{title}</h3>
      <ul className="space-y-2 text-[15px]">
        {links.map(([href, label]) => (
          <li key={href}><Link href={href} className="text-cream/90 hover:text-white">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
