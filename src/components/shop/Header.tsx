import Link from "next/link";
import { LemonLogo } from "@/components/brand/Logo";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { cartCount } from "@/lib/cart";
import { getSetting } from "@/lib/settings";
import { getCustomer } from "@/lib/auth";
import { MobileMenu } from "./MobileMenu";
import { SearchButton } from "./SearchButton";

export const NAV = [
  { href: "/kassar", label: "Kassar" },
  { href: "/askrift", label: "Áskrift" },
  { href: "/netverslun", label: "Netverslun" },
  { href: "/fyrirtaekjathjonusta", label: "Fyrirtækjaþjónusta" },
  { href: "/um-okkur", label: "Um okkur" },
  { href: "/spurt-og-svarad", label: "Spurt og svarað" },
];

export async function Header() {
  const [count, announcement, customer] = await Promise.all([cartCount(), getSetting("store.announcement"), getCustomer()]);
  return (
    <>
      {announcement ? (
        <div className="bg-green px-4 py-2 text-center text-[13px] font-medium text-cream sm:text-sm">
          <span className="inline-flex items-center gap-2"><Icon name="leaf" className="h-4 w-4 text-lemon" /> {announcement}</span>
        </div>
      ) : null}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-[88px] lg:px-8">
          <MobileMenu links={NAV} />
          <Link href="/" className="shrink-0" aria-label="Fincafresh forsíða">
            <LemonLogo className="h-[60px] w-auto lg:h-[74px]" />
          </Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Aðalvalmynd">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-[15px] font-medium text-ink/90 transition hover:bg-burgundy/5 hover:text-burgundy">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <SearchButton />
            <Link href="/minar-sidur" className="hidden h-11 w-11 place-items-center rounded-full text-burgundy hover:bg-burgundy/5 sm:grid" aria-label={customer ? "Mínar síður" : "Innskráning"}>
              <Icon name="user" />
            </Link>
            <Link href="/karfa" className="relative grid h-11 w-11 place-items-center rounded-full text-burgundy hover:bg-burgundy/5" aria-label={`Karfa, ${count} vörur`}>
              <Icon name="bag" />
              {count > 0 ? (
                <span className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-orange px-1 text-[11px] font-bold leading-5 text-burgundy-900">{count}</span>
              ) : null}
            </Link>
            <Link href="/askrift" className={buttonClass("primary", "md", "ml-2 hidden sm:inline-flex")}>Byrja í áskrift</Link>
          </div>
        </div>
      </header>
    </>
  );
}
