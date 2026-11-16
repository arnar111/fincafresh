import { Header } from "@/components/shop/Header";
import { Footer } from "@/components/shop/Footer";
import { Analytics } from "@/components/shop/Analytics";
import { getSetting, getSettings } from "@/lib/settings";
import { ShopUIProvider } from "@/components/shop/ShopUI";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [key, host, s] = await Promise.all([
    getSetting("posthog.key"),
    getSetting("posthog.host"),
    getSettings(["subscription.frequencies", "upsell.enabled", "upsell.title", "upsell.body"]),
  ]);
  return (
    <>
      <a href="#efni" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-burgundy focus:px-4 focus:py-2 focus:text-cream">
        Fara beint í efni
      </a>
      <ShopUIProvider
        frequencies={s["subscription.frequencies"]}
        upsell={{ enabled: s["upsell.enabled"], title: s["upsell.title"], body: s["upsell.body"] }}
      >
        <Header />
        <main id="efni">{children}</main>
        <Footer />
      </ShopUIProvider>
      <Analytics posthogKey={key} posthogHost={host} />
    </>
  );
}
