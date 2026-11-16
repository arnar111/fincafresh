// Ávaxtateikningar í sama flata stíl og sítrónan í brand-bókinni:
// flatur grunnlitur, ljósari "gljái" og grænt laufblað (#248A36) með ljósri æð.
import type { ReactNode } from "react";
import { LemonMark } from "./Logo";

const LEAF = "#248A36";
const VEIN = "#E0E5E0";

function Leaf({ d, vein }: { d: string; vein?: string }) {
  return (
    <g>
      <path fill={LEAF} d={d} />
      {vein ? <path fill="none" stroke={VEIN} strokeWidth="1.2" strokeLinecap="round" d={vein} /> : null}
    </g>
  );
}

const ART: Record<string, ReactNode> = {
  mango: (
    <>
      <path fill="#F6A623" d="M28 30c14-12 40-10 52 6 10 14 6 38-10 50-15 11-38 9-48-6C12 66 14 42 28 30z" />
      <path fill="#E8553E" d="M28 30c10-8 24-10 34-6-6 10-22 22-38 26-6 1-6-14 4-20z" opacity=".9" />
      <path fill="#FBD06A" d="M64 46c6 6 8 16 4 24-2 3-6 2-6-2 0-7-1-13-2-18 0-4 2-6 4-4z" opacity=".8" />
      <path fill="#7A4A1A" d="M44 26c-1-5 0-9 2-12l3 1c-2 3-2 7-1 11z" />
      <Leaf d="M48 16c8-10 22-12 32-6-6 9-20 13-32 6z" vein="M50 15c9-3 18-4 27-4" />
    </>
  ),
  "mango-green": (
    <>
      <path fill="#8CBF3F" d="M28 30c14-12 40-10 52 6 10 14 6 38-10 50-15 11-38 9-48-6C12 66 14 42 28 30z" />
      <path fill="#C7D94F" d="M58 40c10 6 14 20 8 32-2 4-7 3-7-1 1-9-1-18-4-26-1-4 1-6 3-5z" opacity=".85" />
      <path fill="#6E9E2E" d="M24 58c4 14 16 24 30 24-10 4-26 0-32-12-2-5 0-12 2-12z" opacity=".8" />
      <path fill="#7A4A1A" d="M44 26c-1-5 0-9 2-12l3 1c-2 3-2 7-1 11z" />
      <Leaf d="M48 16c8-10 22-12 32-6-6 9-20 13-32 6z" vein="M50 15c9-3 18-4 27-4" />
    </>
  ),
  mandarin: (
    <>
      <circle cx="50" cy="57" r="31" fill="#F28A1E" />
      <ellipse cx="38" cy="45" rx="9" ry="13" fill="#F8B04D" transform="rotate(-25 38 45)" opacity=".85" />
      <g fill="#D9701A" opacity=".55">
        <circle cx="62" cy="64" r="1.3" /><circle cx="56" cy="74" r="1.3" /><circle cx="68" cy="55" r="1.3" /><circle cx="44" cy="72" r="1.3" />
      </g>
      <circle cx="50" cy="28" r="3" fill="#5E7A2A" />
      <Leaf d="M51 27c4-12 16-17 26-14-3 10-14 16-26 14z" vein="M53 26c7-4 13-8 21-11" />
    </>
  ),
  orange: (
    <>
      <circle cx="50" cy="56" r="33" fill="#F26A23" />
      <ellipse cx="36" cy="43" rx="10" ry="14" fill="#F79A5E" transform="rotate(-25 36 43)" opacity=".8" />
      <g fill="#C9551A" opacity=".5">
        <circle cx="64" cy="66" r="1.4" /><circle cx="56" cy="78" r="1.4" /><circle cx="72" cy="54" r="1.4" /><circle cx="46" cy="74" r="1.4" /><circle cx="66" cy="44" r="1.4" />
      </g>
      <circle cx="50" cy="24" r="3" fill="#5E7A2A" />
      <Leaf d="M51 23c-6-12-18-14-27-9 5 9 16 13 27 9z" vein="M49 22c-7-3-14-6-22-7" />
    </>
  ),
  lime: (
    <>
      <path fill="#6DAA2C" d="M20 54c0-20 14-32 30-32s30 12 30 32-14 30-30 30-30-10-30-30z" />
      <path fill="#9ACB57" d="M30 44c3-9 11-14 18-14-5 5-8 12-9 20-1 4-10 2-9-6z" opacity=".85" />
      <path fill="#4E8A1E" d="M80 54c2 2 4 2 6 0-1-2-4-3-6-2z" />
      <Leaf d="M48 22c-2-10 6-18 16-18 0 10-7 17-16 18z" vein="M50 20c3-6 6-10 11-13" />
    </>
  ),
  pomegranate: (
    <>
      <path fill="#C8283A" d="M50 26c20 0 34 14 34 32S70 90 50 90 16 76 16 58s14-32 34-32z" />
      <path fill="#A61E2E" d="M42 18h16l-2 6 6-4-2 9H40l-2-9 6 4z" />
      <path fill="#E2566A" d="M30 46c4-9 12-13 20-13-6 5-10 12-12 20-1 4-10 1-8-7z" opacity=".85" />
      <path fill="#8E1826" d="M70 70c-4 8-12 14-22 15 10 2 22-4 26-14 1-3-3-4-4-1z" opacity=".6" />
    </>
  ),
  avocado: (
    <>
      <path fill="#2F5A22" d="M50 10c12 0 18 14 22 30 4 14 12 20 12 32 0 12-14 20-34 20S16 84 16 72c0-12 8-18 12-32 4-16 10-30 22-30z" />
      <path fill="#D6E68A" d="M50 18c9 0 13 12 16 25 3 12 10 17 10 28 0 9-11 15-26 15S24 80 24 71c0-11 7-16 10-28 3-13 7-25 16-25z" />
      <path fill="#F0F2B8" d="M30 66c2-6 4-10 6-16-1 9 0 15 4 22-4 1-11-1-10-6z" opacity=".7" />
      <circle cx="50" cy="64" r="13" fill="#8A5A2B" />
      <ellipse cx="46" cy="60" rx="4" ry="5" fill="#B07A43" />
    </>
  ),
  kiwi: (
    <>
      <circle cx="50" cy="52" r="36" fill="#8B6B3E" />
      <circle cx="50" cy="52" r="31" fill="#7CB342" />
      <circle cx="50" cy="52" r="31" fill="none" stroke="#A5D46A" strokeWidth="3" opacity=".6" />
      <ellipse cx="50" cy="52" rx="9" ry="11" fill="#F3F7D8" />
      <g fill="#2B1B1E">
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return <ellipse key={i} cx={50 + Math.cos(a) * 15} cy={52 + Math.sin(a) * 17} rx="1.3" ry="2.4" transform={`rotate(${(a * 180) / Math.PI + 90} ${50 + Math.cos(a) * 15} ${52 + Math.sin(a) * 17})`} />;
        })}
      </g>
    </>
  ),
  apple: (
    <>
      <path fill="#D9342B" d="M50 32c6-6 18-8 26-2 10 8 10 26 2 42-6 12-14 18-22 16-4-1-6-2-6-2s-2 1-6 2c-8 2-16-4-22-16-8-16-8-34 2-42 8-6 20-4 26 2z" />
      <path fill="#F06A55" d="M30 44c2-6 7-9 13-9-4 4-6 10-7 16-1 4-8 1-6-7z" opacity=".9" />
      <path fill="#7A4A1A" d="M49 33c0-8-2-14-6-18l3-2c4 5 6 12 6 20z" />
      <Leaf d="M53 26c4-9 14-12 22-9-3 8-13 12-22 9z" vein="M55 25c6-3 11-5 17-6" />
    </>
  ),
  pear: (
    <>
      <path fill="#C8D44A" d="M50 22c8 0 11 10 12 18 1 8 16 14 16 32 0 14-12 20-28 20S22 86 22 72c0-18 15-24 16-32 1-8 4-18 12-18z" />
      <path fill="#E3EC88" d="M32 66c2-8 6-12 10-16-2 8-2 16 2 24-5 1-13-1-12-8z" opacity=".85" />
      <path fill="#7A4A1A" d="M49 23c0-6-1-10-4-13l3-1c3 3 4 8 4 14z" />
      <Leaf d="M52 18c5-8 15-9 21-5-4 7-13 9-21 5z" vein="M54 17c5-2 10-3 16-3" />
    </>
  ),
  fig: (
    <>
      <path fill="#6D3B5E" d="M50 20c4 0 6 6 10 14 6 10 20 18 20 34 0 14-14 24-30 24S20 82 20 68c0-16 14-24 20-34 4-8 6-14 10-14z" />
      <path fill="#8F5A80" d="M32 64c2-8 6-14 11-20-1 10 0 18 3 26-5 2-14 0-14-6z" opacity=".85" />
      <path fill="#4F7A2A" d="M46 20c0-5 2-9 4-10 2 1 4 5 4 10z" />
    </>
  ),
  persimmon: (
    <>
      <path fill="#F27B1F" d="M14 56c0-16 16-28 36-28s36 12 36 28-16 30-36 30-36-14-36-30z" />
      <path fill="#F8A659" d="M26 50c4-8 12-12 20-12-6 5-10 11-12 18-2 4-10 2-8-6z" opacity=".85" />
      <path fill="#3E6B2A" d="M50 22l6 10 12-2-8 8 10 6-14 0-6 8-6-8H30l10-6-8-8 12 2z" />
      <circle cx="50" cy="34" r="3" fill="#5E3A1A" />
    </>
  ),
  peach: (
    <>
      <path fill="#F7A15A" d="M50 26c18-6 34 6 34 26 0 22-16 36-34 36S16 74 16 52c0-20 16-32 34-26z" />
      <path fill="#E8553E" d="M58 30c16 2 26 16 22 34-3 12-14 20-24 22 10-10 14-26 2-56z" opacity=".75" />
      <path fill="none" stroke="#D9703A" strokeWidth="2" strokeLinecap="round" d="M50 28c-6 16-6 36 2 58" opacity=".6" />
      <path fill="#FBC889" d="M26 48c2-8 8-12 14-12-4 4-6 10-7 16-1 4-8 2-7-4z" opacity=".9" />
      <Leaf d="M50 26c-4-10-14-14-22-11 3 9 13 13 22 11z" vein="M48 25c-6-3-11-6-17-8" />
    </>
  ),
  apricot: (
    <>
      <path fill="#F59B2B" d="M50 28c16-4 30 6 30 24 0 20-14 32-30 32S20 72 20 52c0-18 14-28 30-24z" />
      <path fill="#E8693A" d="M60 32c12 4 18 16 14 30-2 9-10 16-18 18 8-10 12-24 4-48z" opacity=".7" />
      <path fill="none" stroke="#D97A1A" strokeWidth="2" strokeLinecap="round" d="M50 30c-5 14-5 32 2 52" opacity=".55" />
      <path fill="#FBC46B" d="M28 48c2-7 7-11 13-11-4 4-6 9-7 15-1 4-7 2-6-4z" opacity=".9" />
    </>
  ),
  cherimoya: (
    <>
      <path fill="#9BBF5A" d="M50 18c18 0 30 14 30 32 0 22-14 40-30 40S20 72 20 50c0-18 12-32 30-32z" />
      <g fill="none" stroke="#6E9433" strokeWidth="1.6" opacity=".8">
        <path d="M30 36c8 4 12 4 20 0s12-4 20 0" /><path d="M24 50c8 4 18 4 26 0s18-4 26 0" /><path d="M24 64c8 4 18 4 26 0s18-4 26 0" /><path d="M30 78c6 3 14 3 20 0s14-3 20 0" />
        <path d="M40 22c-4 20-4 46 2 66" /><path d="M60 22c4 20 4 46-2 66" /><path d="M50 18v72" />
      </g>
      <path fill="#7A4A1A" d="M48 18c0-5 1-8 3-10l3 1c-2 2-3 5-3 9z" />
    </>
  ),
  papaya: (
    <>
      <path fill="#8CBF3F" d="M50 8c16 0 24 18 24 42S64 92 50 92 26 74 26 50 34 8 50 8z" />
      <path fill="#F58A3A" d="M50 14c12 0 18 16 18 36S60 86 50 86 32 70 32 50s6-36 18-36z" />
      <path fill="#F8B26A" d="M38 46c1-12 4-22 9-26-2 8-3 18-3 28 0 4-6 4-6-2z" opacity=".8" />
      <g fill="#2B1B1E">
        {[30, 38, 46, 54, 62, 70].map((y, i) => (
          <g key={y}>
            <circle cx={47 - (i % 2)} cy={y + 2} r="2.4" />
            <circle cx={53 + (i % 2)} cy={y} r="2.4" />
          </g>
        ))}
      </g>
    </>
  ),
  grapes: (
    <>
      <g fill="#7B3F7A">
        {[[38, 34], [50, 34], [62, 34], [44, 46], [56, 46], [32, 46], [68, 46], [38, 58], [50, 58], [62, 58], [44, 70], [56, 70], [50, 82]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="7.5" />
        ))}
      </g>
      <g fill="#A065A0" opacity=".9">
        {[[36, 32], [48, 32], [42, 44], [36, 56], [48, 56], [42, 68]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" />
        ))}
      </g>
      <path fill="#7A4A1A" d="M49 27c0-7 2-12 6-16l3 2c-3 3-5 8-5 14z" />
      <Leaf d="M55 16c6-8 18-9 25-4-5 8-16 10-25 4z" vein="M57 15c6-2 12-3 19-3" />
    </>
  ),
  melon: (
    <>
      <ellipse cx="50" cy="54" rx="36" ry="32" fill="#E9C46A" />
      <g fill="none" stroke="#C9A040" strokeWidth="1.3" opacity=".8">
        <path d="M22 40c16 8 40 8 56 0" /><path d="M16 56c20 8 48 8 68 0" /><path d="M22 72c16 6 40 6 56 0" />
        <path d="M34 24c-6 18-6 42 2 60" /><path d="M66 24c6 18 6 42-2 60" /><path d="M50 22v64" />
      </g>
      <path fill="#F4DC99" d="M28 46c3-8 9-14 18-16-5 5-9 11-10 18-1 4-9 3-8-2z" opacity=".85" />
    </>
  ),
  banana: (
    <>
      <path fill="#F9C214" d="M22 30c4 26 22 46 50 50 6 1 10-2 12-6-24-4-44-20-52-46-2-4-10-3-10 2z" />
      <path fill="#F0D142" d="M28 34c6 20 20 34 40 40-22-2-38-18-42-38 0-2 2-3 2-2z" opacity=".9" />
      <path fill="#5E3A1A" d="M18 26l6-2 2 6-6 2z" />
      <path fill="#5E3A1A" d="M82 74l4 2-2 4-4-1z" />
    </>
  ),
  strawberry: (
    <>
      <path fill="#E0313B" d="M50 30c18 0 30 8 30 20 0 18-16 38-30 40C36 88 20 68 20 50c0-12 12-20 30-20z" />
      <g fill="#F9C214">
        {[[36, 46], [50, 44], [64, 46], [42, 58], [58, 58], [50, 70], [36, 62], [64, 62], [44, 78], [56, 78]].map(([x, y]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="1.2" ry="2" />
        ))}
      </g>
      <path fill={LEAF} d="M50 34l-10-12 4 10-14-4 12 8-10 4 18-2 0 0 18 2-10-4 12-8-14 4 4-10z" />
    </>
  ),
  grapefruit: (
    <>
      <circle cx="50" cy="54" r="34" fill="#F7915E" />
      <circle cx="50" cy="54" r="34" fill="#F06A6A" opacity=".25" />
      <ellipse cx="37" cy="42" rx="10" ry="14" fill="#FBB98F" transform="rotate(-25 37 42)" opacity=".8" />
      <Leaf d="M51 21c4-11 16-15 25-12-3 9-14 15-25 12z" vein="M53 20c7-4 12-7 20-9" />
    </>
  ),
  other: (
    <>
      <circle cx="50" cy="56" r="30" fill="#F9C214" />
      <ellipse cx="38" cy="46" rx="8" ry="12" fill="#F0D142" transform="rotate(-25 38 46)" />
      <Leaf d="M51 27c4-12 16-17 26-14-3 10-14 16-26 14z" vein="M53 26c7-4 13-8 21-11" />
    </>
  ),
};

export const FRUIT_ART_KEYS = ["lemon", ...Object.keys(ART)];

export const FRUIT_ART_LABELS: Record<string, string> = {
  lemon: "Sítróna",
  mango: "Mangó (rautt/gult)",
  "mango-green": "Mangó (grænt)",
  mandarin: "Mandarína",
  orange: "Appelsína",
  lime: "Límóna",
  pomegranate: "Granatepli",
  avocado: "Avókadó",
  kiwi: "Kíví",
  apple: "Epli",
  pear: "Pera",
  fig: "Fíkja",
  persimmon: "Kakí (persimmon)",
  peach: "Ferskja",
  apricot: "Apríkósa",
  cherimoya: "Chirimoya",
  papaya: "Papaja",
  grapes: "Vínber",
  melon: "Melóna",
  banana: "Banani",
  strawberry: "Jarðarber",
  grapefruit: "Greipaldin",
  other: "Annað",
};

export function FruitArt({ kind, className, title }: { kind: string; className?: string; title?: string }) {
  if (kind === "lemon") return <LemonMark className={className} title={title ?? "Sítróna"} />;
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={title ?? FRUIT_ART_LABELS[kind] ?? "Ávöxtur"}>
      {ART[kind] ?? ART.other}
    </svg>
  );
}
