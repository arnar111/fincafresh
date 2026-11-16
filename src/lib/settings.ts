import { cache } from "react";
import { db } from "./db";
import { decrypt, encrypt } from "./crypto";

export type ShippingMethod = {
  id: "PIKKOLO" | "HOME" | "PICKUP";
  label: string;
  description: string;
  price: number;
  freeOver: number | null; // frí sending yfir þessari upphæð (null = aldrei)
  enabled: boolean;
};

export type Frequency = { every: number; label: string };
export type FaqItem = { q: string; a: string };

/** Sjálfgefin gildi. Allt hér er hægt að breyta í stjórnborðinu. */
export const DEFAULTS = {
  "store.name": "Fincafresh",
  "store.email": "fincafresh@fincafresh.is",
  "store.phone": "612 1126",
  "store.address": "Njarðarnes 12, 603 Akureyri",
  "store.facebook": "",
  "store.instagram": "",
  "store.announcement": "Afsláttur af hverjum kassa í áskrift · Beint frá völdum bændum á Spáni",

  "subscription.defaultDiscountPct": 5,
  "subscription.frequencies": [
    { every: 1, label: "Í hverri sendingu" },
    { every: 2, label: "Í annarri hverri sendingu" },
  ] as Frequency[],

  "upsell.enabled": true,
  "upsell.title": "Bíddu aðeins! Viltu spara?",
  "upsell.body": "Með áskrift kemur kassinn sjálfkrafa til þín, og alltaf á lægra verði.",

  "shipping.methods": [
    { id: "PIKKOLO", label: "Pikkoló stöð", description: "Sæktu kassann í kælda Pikkoló stöð þegar þér hentar.", price: 0, freeOver: null, enabled: true },
    { id: "HOME", label: "Heimsending", description: "Við sendum kassann heim að dyrum með Samskip.", price: 0, freeOver: null, enabled: true },
    { id: "PICKUP", label: "Sækja til okkar", description: "Sæktu í Njarðarnes 12, Akureyri.", price: 0, freeOver: null, enabled: false },
  ] as ShippingMethod[],
  "shipping.pricesConfirmed": false,

  "payment.mode": "test" as "test" | "live",

  "content.hero": {
    eyebrow: "Árstíðabundið · Beint frá bóndanum",
    title: "Ávextir eins og þeir eiga að bragðast.",
    subtitle: "Handvaldir, árstíðabundnir ávextir beint frá völdum bændum á Spáni, um 10 daga gamlir þegar þeir koma til þín.",
  },
  "content.story": {
    title: "Þetta byrjaði í heita pottinum á Dalvík",
    body: "Bessi og Borja urðu vinir árið 2019 þegar Borja flutti frá Madríd til að spila fótbolta með Dalvík/Reyni. Þurrar og skemmdar appelsínur í eldhúsinu hjá Bessa urðu svo kveikjan að Fincafresh.\n\nÍ dag verslum við beint við valda bændur á Spáni og bjóðum aðeins það sem er í árstíð, hágæða ávexti allan ársins hring.",
  },
  "content.b2b": {
    title: "Ferskir ávextir á vinnustaðinn",
    body: "Fyrirtækjakassinn kemur með ferskleikann í kaffistofuna. Hafðu samband og við finnum lausn sem hentar þínum hópi.",
  },
  "content.faq": [
    { q: "Hvernig virkar áskriftin?", a: "Þú velur kassa og hversu oft hann á að koma. Við sendum hann sjálfkrafa með hverri sendingu (eða annarri hverri) og þú færð áskriftarafslátt af hverjum kassa. Þú getur sleppt sendingu, gert hlé eða sagt upp hvenær sem er á Mínum síðum." },
    { q: "Er einhver binditími?", a: "Nei. Það er enginn binditími og þú getur sagt upp hvenær sem er." },
    { q: "Hvaðan koma ávextirnir?", a: "Við verslum beint við valda bændur á Spáni. Ávextirnir eru tíndir í árstíð og eru um 10 daga gamlir þegar þeir koma til þín." },
    { q: "Hvernig fæ ég kassann?", a: "Þú getur sótt kassann í Pikkoló stöð eða fengið hann sendan heim. Þú velur afhendingarmáta í greiðsluferlinu." },
    { q: "Hvað er í kassanum?", a: "Innihaldið breytist eftir því hvað er í árstíð hverju sinni. Á forsíðunni sérðu alltaf hvað er í næstu sendingu, og þú getur smellt á hvern ávöxt til að lesa meira um hann." },
  ] as FaqItem[],
  "content.about": "Fincafresh var stofnað af vinunum Bessa og Borja. Markmiðið er einfalt: að Íslendingar fái ávexti sem bragðast eins og þeir eiga að bragðast.\n\nVið verslum beint við valda bændur á Spáni, sleppum milliliðum og bjóðum aðeins það sem er í árstíð. Ávextirnir eru um 10 daga gamlir þegar þeir koma til þín.",

  // Tengingar (lyklar eru dulkóðaðir í gagnagrunni; .env gengur framar)
  "woo.url": "",
  "woo.consumerKey": "",
  "woo.consumerSecret": "",
  "woo.webhookSecret": "",
  "woo.lastSync": "",
  "pikkolo.environment": "staging" as "staging" | "production",
  "pikkolo.vendorId": "",
  "pikkolo.apiKey": "",
  "pikkolo.autoSubmit": false,
  "repeat.apiKey": "",
  "repeat.apiUrl": "",
  "samskip.apiKey": "",
  "samskip.apiUrl": "",
  "posthog.key": "",
  "posthog.host": "https://eu.i.posthog.com",
  "posthog.personalApiKey": "",
  "posthog.projectId": "",
  "posthog.sharedDashboardUrl": "",
  "smtp.host": "",
  "smtp.port": 587,
  "smtp.user": "",
  "smtp.pass": "",
  "smtp.from": "Fincafresh <fincafresh@fincafresh.is>",
};

export type SettingKey = keyof typeof DEFAULTS;
export type SettingValue<K extends SettingKey> = (typeof DEFAULTS)[K];

/** Lyklar sem eru dulkóðaðir í gagnagrunni */
export const SECRET_KEYS: SettingKey[] = [
  "woo.consumerKey",
  "woo.consumerSecret",
  "woo.webhookSecret",
  "pikkolo.apiKey",
  "repeat.apiKey",
  "samskip.apiKey",
  "posthog.personalApiKey",
  "smtp.pass",
];

/** Umhverfisbreytur sem ganga framar gildum í gagnagrunni */
const ENV_OVERRIDES: Partial<Record<SettingKey, string>> = {
  "woo.url": "WOOCOMMERCE_URL",
  "woo.consumerKey": "WOOCOMMERCE_CONSUMER_KEY",
  "woo.consumerSecret": "WOOCOMMERCE_CONSUMER_SECRET",
  "woo.webhookSecret": "WOOCOMMERCE_WEBHOOK_SECRET",
  "pikkolo.environment": "PIKKOLO_ENVIRONMENT",
  "pikkolo.vendorId": "PIKKOLO_VENDOR_ID",
  "pikkolo.apiKey": "PIKKOLO_API_KEY",
  "posthog.key": "NEXT_PUBLIC_POSTHOG_KEY",
  "posthog.host": "NEXT_PUBLIC_POSTHOG_HOST",
  "posthog.personalApiKey": "POSTHOG_PERSONAL_API_KEY",
  "posthog.projectId": "POSTHOG_PROJECT_ID",
  "smtp.host": "SMTP_HOST",
  "smtp.port": "SMTP_PORT",
  "smtp.user": "SMTP_USER",
  "smtp.pass": "SMTP_PASS",
  "smtp.from": "SMTP_FROM",
};

export function envOverride(key: SettingKey): string | undefined {
  const envName = ENV_OVERRIDES[key];
  const v = envName ? process.env[envName] : undefined;
  return v && v.trim() !== "" ? v : undefined;
}

const loadAll = cache(async () => {
  const rows = await db.setting.findMany();
  const map = new Map<string, unknown>();
  for (const r of rows) {
    try {
      const raw = r.encrypted ? decrypt(r.value) : r.value;
      map.set(r.key, JSON.parse(raw));
    } catch (e) {
      console.error(`[settings] gat ekki lesið ${r.key}`, e);
    }
  }
  return map;
});

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const env = envOverride(key);
  const def = DEFAULTS[key];
  if (env !== undefined) {
    if (typeof def === "number") return Number(env) as SettingValue<K>;
    if (typeof def === "boolean") return (env === "true") as SettingValue<K>;
    return env as SettingValue<K>;
  }
  const map = await loadAll();
  return (map.has(key) ? map.get(key) : def) as SettingValue<K>;
}

export async function getSettings<K extends SettingKey>(keys: K[]): Promise<{ [P in K]: SettingValue<P> }> {
  const out = {} as { [P in K]: SettingValue<P> };
  for (const k of keys) out[k] = await getSetting(k);
  return out;
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingValue<K>) {
  const secret = SECRET_KEYS.includes(key);
  const raw = JSON.stringify(value);
  const stored = secret ? encrypt(raw) : raw;
  await db.setting.upsert({
    where: { key },
    create: { key, value: stored, encrypted: secret },
    update: { value: stored, encrypted: secret },
  });
}

/** Sýnir aðeins síðustu 4 stafi lykils í stjórnborði */
export function maskSecret(v: string): string {
  if (!v) return "";
  return v.length <= 6 ? "••••" : "••••••" + v.slice(-4);
}
