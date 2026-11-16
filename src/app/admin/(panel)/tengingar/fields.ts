import type { SettingKey } from "@/lib/settings";

export type FieldDef = {
  key: SettingKey;
  label: string;
  kind: "text" | "secret" | "number" | "checkbox" | "select";
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export const SECTIONS: Record<string, FieldDef[]> = {
  woo: [
    { key: "woo.url", label: "Slóð á WooCommerce vefinn", kind: "text", placeholder: "https://fincafresh.is", hint: "Aðalslóð vefsins þar sem WooCommerce er uppsett." },
    { key: "woo.consumerKey", label: "Consumer key", kind: "secret", placeholder: "ck_…" },
    { key: "woo.consumerSecret", label: "Consumer secret", kind: "secret", placeholder: "cs_…" },
    { key: "woo.webhookSecret", label: "Leyniorð fyrir webhooks", kind: "secret", hint: "Sama leyniorð og þú setur í „Secret“ þegar þú býrð til webhook í WooCommerce." },
  ],
  pikkolo: [
    {
      key: "pikkolo.environment", label: "Umhverfi", kind: "select",
      options: [
        { value: "staging", label: "Prófun (staging): engar raunverulegar pantanir" },
        { value: "production", label: "Raunverulegt (production): pantanir fara í stöðvarnar" },
      ],
    },
    { key: "pikkolo.vendorId", label: "Vendor ID", kind: "text", hint: "Stendur efst á skjölunarsíðunni frá Pikkoló." },
    { key: "pikkolo.apiKey", label: "API lykill", kind: "secret", hint: "Stendur efst á skjölunarsíðunni frá Pikkoló. Haltu honum leyndum." },
    { key: "pikkolo.autoSubmit", label: "Senda pantanir sjálfkrafa til Pikkoló um leið og þær eru greiddar", kind: "checkbox", hint: "Ef ekki er hakað sendir þú pantanir handvirkt úr pöntunarlistanum." },
  ],
  repeat: [
    { key: "repeat.apiUrl", label: "API slóð (þegar hún berst)", kind: "text" },
    { key: "repeat.apiKey", label: "API lykill (þegar hann berst)", kind: "secret" },
  ],
  samskip: [
    { key: "samskip.apiUrl", label: "API slóð (þegar hún berst)", kind: "text" },
    { key: "samskip.apiKey", label: "API lykill (þegar hann berst)", kind: "secret" },
  ],
  posthog: [
    { key: "posthog.key", label: "Project API key", kind: "text", placeholder: "phc_…", hint: "Byrjar á phc_. Má sjást í vafra, þetta er ekki leynilykill." },
    {
      key: "posthog.host", label: "Svæði", kind: "select",
      options: [
        { value: "https://eu.i.posthog.com", label: "Evrópa (eu.posthog.com)" },
        { value: "https://us.i.posthog.com", label: "Bandaríkin (us.posthog.com)" },
      ],
    },
    { key: "posthog.projectId", label: "Project ID", kind: "text", placeholder: "T.d. 12345" },
    { key: "posthog.personalApiKey", label: "Personal API key", kind: "secret", placeholder: "phx_…", hint: "Þarf til að sýna PostHog gögn hér í stjórnborðinu." },
    { key: "posthog.sharedDashboardUrl", label: "Slóð á deilt mælaborð (valfrjálst)", kind: "text", placeholder: "https://eu.posthog.com/embedded/…", hint: "Birtist neðst á Greiningarsíðunni." },
  ],
  smtp: [
    { key: "smtp.host", label: "SMTP þjónn", kind: "text", placeholder: "T.d. smtp.office365.com" },
    { key: "smtp.port", label: "Port", kind: "number", placeholder: "587" },
    { key: "smtp.user", label: "Notandanafn", kind: "text" },
    { key: "smtp.pass", label: "Lykilorð", kind: "secret" },
    { key: "smtp.from", label: "Sendandi", kind: "text", placeholder: "Fincafresh <fincafresh@fincafresh.is>" },
  ],
  payment: [
    {
      key: "payment.mode", label: "Greiðsluhamur", kind: "select",
      options: [
        { value: "test", label: "Prófun: greiðslur eru samþykktar sjálfkrafa" },
        { value: "live", label: "Raunverulegar greiðslur" },
      ],
    },
  ],
};
