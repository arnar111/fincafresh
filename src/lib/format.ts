// Íslensk framsetning á verði og dagsetningum

const nf = new Intl.NumberFormat("is-IS", { maximumFractionDigits: 0 });

/** 5999 -> "5.999 kr." */
export function kr(amount: number): string {
  // Intl á sumum kerfum skilar bili í stað punkts; tryggjum íslenskan punkt
  const n = nf.format(Math.round(amount)).replace(/\s| |,/g, ".");
  return `${n} kr.`;
}

export function num(n: number): string {
  return nf.format(Math.round(n)).replace(/\s| |,/g, ".");
}

const MONTHS = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
const MONTHS_SHORT = ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."];
const DAYS = ["sunnudagur", "mánudagur", "þriðjudagur", "miðvikudagur", "fimmtudagur", "föstudagur", "laugardagur"];
// Þolfall: "fimmtudaginn 26. nóvember"
const DAYS_ACC = ["sunnudaginn", "mánudaginn", "þriðjudaginn", "miðvikudaginn", "fimmtudaginn", "föstudaginn", "laugardaginn"];

function d(input: Date | string): Date {
  return typeof input === "string" ? new Date(input) : input;
}

/** "26. nóvember 2026" */
export function dateLong(input: Date | string, withYear = true): string {
  const x = d(input);
  return `${x.getDate()}. ${MONTHS[x.getMonth()]}${withYear ? " " + x.getFullYear() : ""}`;
}

/** "26. nóv." */
export function dateShort(input: Date | string): string {
  const x = d(input);
  return `${x.getDate()}. ${MONTHS_SHORT[x.getMonth()]}`;
}

/** "fimmtudaginn 26. nóvember" */
export function dateWithDayAcc(input: Date | string): string {
  const x = d(input);
  return `${DAYS_ACC[x.getDay()]} ${x.getDate()}. ${MONTHS[x.getMonth()]}`;
}

/** "fimmtudagur 26. nóvember" */
export function dateWithDay(input: Date | string): string {
  const x = d(input);
  return `${DAYS[x.getDay()]} ${x.getDate()}. ${MONTHS[x.getMonth()]}`;
}

/** "16.11.2026 kl. 14:05" */
export function dateTime(input: Date | string): string {
  const x = d(input);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()} kl. ${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

export function dateInput(input: Date | string | null | undefined): string {
  if (!input) return "";
  const x = d(input);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

/** "fyrir 3 mín." o.s.frv. */
export function timeAgo(input: Date | string): string {
  const diff = (Date.now() - d(input).getTime()) / 1000;
  if (diff < 60) return "rétt í þessu";
  if (diff < 3600) return `fyrir ${Math.floor(diff / 60)} mín.`;
  if (diff < 86400) return `fyrir ${Math.floor(diff / 3600)} klst.`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "í gær";
  if (days < 30) return `fyrir ${days} dögum`;
  return dateLong(input);
}

/** "1 vara" / "3 vörur" */
export function plural(n: number, one: string, many: string): string {
  return `${num(n)} ${n % 10 === 1 && n % 100 !== 11 ? one : many}`;
}

export function slugify(s: string): string {
  const map: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ý: "y", ð: "d", þ: "th", æ: "ae", ö: "o" };
  return s
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseJsonList(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
