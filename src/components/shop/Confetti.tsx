"use client";
import { useEffect, useState } from "react";
import { FruitArt } from "@/components/brand/FruitArt";

const KINDS = ["lemon", "mandarin", "kiwi", "mango", "apple", "lemon", "peach"];

/** Lítil ávaxtasprengja: notuð þegar fólk velur áskrift eða klárar pöntun */
export function FruitBurst({ fire, count = 22 }: { fire: number; count?: number }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; d: number; r: number; s: number; k: string; delay: number }[]>([]);
  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const p = Array.from({ length: count }, (_, i) => ({
      id: fire * 100 + i,
      x: Math.random() * 100,
      d: 1.6 + Math.random() * 1.4,
      r: (Math.random() - 0.5) * 720,
      s: 22 + Math.random() * 26,
      k: KINDS[i % KINDS.length],
      delay: Math.random() * 0.35,
    }));
    setPieces(p);
    const t = setTimeout(() => setPieces([]), 3400);
    return () => clearTimeout(t);
  }, [fire, count]);
  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[150] overflow-hidden" aria-hidden>
      <style>{`@keyframes ff-fall{0%{transform:translateY(-12vh) rotate(0)}100%{transform:translateY(110vh) rotate(var(--r))}}`}</style>
      {pieces.map((p) => (
        <div key={p.id} style={{ left: `${p.x}%`, width: p.s, height: p.s, animation: `ff-fall ${p.d}s cubic-bezier(.3,.6,.4,1) ${p.delay}s forwards`, ["--r" as string]: `${p.r}deg`, position: "absolute", top: 0 }}>
          <FruitArt kind={p.k} className="h-full w-full drop-shadow" />
        </div>
      ))}
    </div>
  );
}

/** Tala sem telur upp (t.d. sparnaður) */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 700);
      setN(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(n)}</>;
}
