import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource/fira-sans/400.css";
import "@fontsource/fira-sans/500.css";
import "@fontsource/fira-sans/600.css";
import "@fontsource/fira-sans/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Fincafresh · Ávextir eins og þeir eiga að bragðast", template: "%s · Fincafresh" },
  description: "Handvaldir, árstíðabundnir ávextir beint frá völdum bændum á Spáni. Ávaxtakassar í áskrift eða stakir.",
  openGraph: { type: "website", locale: "is_IS", siteName: "Fincafresh", images: ["/images/brand-kassi.webp"] },
};

export const viewport: Viewport = { themeColor: "#F5EBD9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const kit = process.env.NEXT_PUBLIC_ADOBE_FONTS_KIT;
  return (
    <html lang="is">
      <head>
        {kit ? (
          <>
            <link rel="stylesheet" href={`https://use.typekit.net/${kit}.css`} />
            {/* Ef Adobe Fonts kit er til: brand-letrin Monarcha (fyrirsagnir) og Minion Pro */}
            <style>{`:root{--font-heading:"monarcha";}`}</style>
          </>
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
