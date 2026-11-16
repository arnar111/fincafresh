import Link from "next/link";
import { LemonMark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-cream px-4 text-center">
      <div>
        <LemonMark className="mx-auto h-28 w-auto animate-wiggle" title="" aria-hidden />
        <h1 className="mt-6 font-display text-5xl text-burgundy">Þessi síða er súr</h1>
        <p className="mt-3 text-lg text-muted">Við fundum ekki síðuna sem þú leitaðir að.</p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-orange px-6 py-3 font-semibold text-burgundy-900 hover:bg-orange-600">Fara á forsíðu</Link>
      </div>
    </main>
  );
}
