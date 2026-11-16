"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { done, fail, int, str, bool } from "@/lib/admin";
import { envOverride, getSetting, setSetting, SECRET_KEYS, type SettingKey } from "@/lib/settings";
import { logActivity } from "@/lib/activity";
import { wooFetch } from "@/lib/integrations/woocommerce";
import { importCategories, importCustomers, importEverything, importOrders, importProducts, type SyncResult } from "@/lib/integrations/woo-sync";
import { getAvailableStations } from "@/lib/integrations/pikkolo";
import { hogql, posthogConfig } from "@/lib/integrations/posthog";
import { sendEmail, emailLayout } from "@/lib/integrations/email";
import { dateWithDay } from "@/lib/format";
import { SECTIONS } from "./fields";

export type TestState = { ok: boolean; message: string; lines?: string[] } | null;

const SECTION_NAMES: Record<string, string> = { woo: "WooCommerce", pikkolo: "Pikkoló", repeat: "Repeat", samskip: "Samskip", posthog: "PostHog", smtp: "Tölvupóstur", payment: "Greiðslugátt" };

export async function saveIntegration(fd: FormData) {
  await requireAdmin();
  const section = str(fd, "section");
  const defs = SECTIONS[section];
  if (!defs) fail("/admin/tengingar", "Óþekkt tenging.");
  let changed = 0;
  for (const d of defs) {
    if (envOverride(d.key)) continue; // stillt í .env, ekki hægt að breyta hér
    if (d.kind === "secret") {
      const v = str(fd, d.key);
      if (!v) continue; // autt = halda núverandi lykli
      await setSetting(d.key, v as never);
    } else if (d.kind === "checkbox") {
      await setSetting(d.key, bool(fd, d.key) as never);
    } else if (d.kind === "number") {
      await setSetting(d.key, int(fd, d.key, 0) as never);
    } else if (d.kind === "select") {
      const v = str(fd, d.key);
      if (!d.options?.some((o) => o.value === v)) continue;
      await setSetting(d.key, v as never);
    } else {
      await setSetting(d.key, str(fd, d.key).replace(/\/+$/, "") as never);
    }
    changed++;
  }
  await logActivity("integration", `Stillingar fyrir ${SECTION_NAMES[section]} uppfærðar`, "info");
  revalidatePath("/admin/tengingar");
  revalidatePath("/", "layout");
  done(`/admin/tengingar#${section}`, changed ? `${SECTION_NAMES[section]}: stillingar vistaðar.` : "Ekkert breyttist.");
}

export async function clearSecret(fd: FormData) {
  await requireAdmin();
  const key = str(fd, "key") as SettingKey;
  if (!SECRET_KEYS.includes(key)) fail("/admin/tengingar", "Ekki hægt að hreinsa þennan reit.");
  await setSetting(key, "" as never);
  await logActivity("integration", `Lykill fjarlægður: ${key}`, "warning");
  revalidatePath("/admin/tengingar");
  done(`/admin/tengingar#${key.split(".")[0]}`, "Lykillinn var fjarlægður.");
}

// ── Prófanir (skila niðurstöðu beint í gluggann) ──────────────
function errMsg(e: unknown) {
  const m = (e as Error)?.message ?? String(e);
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|getaddrinfo/i.test(m)) return "Náði ekki sambandi. Athugaðu slóðina og að vefurinn sé aðgengilegur.";
  if (/401|403/.test(m)) return `Aðgangi hafnað. Athugaðu lyklana. (${m.slice(0, 160)})`;
  return m.slice(0, 300);
}

export async function testWoo(_prev: TestState): Promise<TestState> {
  await requireAdmin();
  try {
    const { totalPages } = await wooFetch("/products", { query: { per_page: 1 } });
    return { ok: true, message: `Tengingin virkar. Það eru ${totalPages} vörur í WooCommerce.` };
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
}

function line(name: string, r: SyncResult) {
  return `${name}: ${r.created} nýjar, ${r.updated} uppfærðar${r.skipped ? `, ${r.skipped} sleppt` : ""}${r.errors.length ? `, ${r.errors.length} villur` : ""}`;
}

export async function importWoo(_prev: TestState, fd: FormData): Promise<TestState> {
  await requireAdmin();
  const what = str(fd, "what");
  const range = str(fd, "range");
  const after = range === "all" ? undefined : new Date(Date.now() - Number(range || 90) * 86400000).toISOString();
  try {
    let lines: string[] = [];
    let errors: string[] = [];
    if (what === "all") {
      const r = await importEverything(after);
      lines = [line("Flokkar", r.categories), line("Vörur", r.products), line("Viðskiptavinir", r.customers), line("Pantanir", r.orders)];
      errors = [...r.categories.errors, ...r.products.errors, ...r.customers.errors, ...r.orders.errors];
    } else {
      const r = what === "products" ? (await importCategories(), await importProducts()) : what === "customers" ? await importCustomers() : await importOrders(after);
      lines = [line(what === "products" ? "Vörur" : what === "customers" ? "Viðskiptavinir" : "Pantanir", r)];
      errors = r.errors;
      await setSetting("woo.lastSync", new Date().toISOString());
      await logActivity("integration", `WooCommerce innflutningur: ${lines[0]}`, errors.length ? "warning" : "success");
    }
    revalidatePath("/admin", "layout");
    revalidatePath("/", "layout");
    return { ok: errors.length === 0, message: errors.length ? "Innflutningi lokið, en sumt tókst ekki:" : "Innflutningi lokið!", lines: [...lines, ...errors.slice(0, 8)] };
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
}

export async function testPikkolo(_prev: TestState, fd: FormData): Promise<TestState> {
  await requireAdmin();
  const postalCode = str(fd, "postalCode") || "101";
  const city = str(fd, "city") || "Reykjavík";
  const res = await getAvailableStations({ postalCode, city, refrigerated: 1 });
  if (res.error) return { ok: false, message: res.error };
  if (!res.stations.length) return { ok: true, message: `Tenging virkar en engar stöðvar fundust fyrir ${postalCode}.` };
  const env = await getSetting("pikkolo.environment");
  return {
    ok: true,
    message: `Tenging virkar (${env === "production" ? "raunverulegt umhverfi" : "prófunarumhverfi"}). ${res.stations.length} stöðvar fundust fyrir ${postalCode} ${city}:`,
    lines: res.stations.slice(0, 8).map((s) => `${s.name}, ${s.address.street}, ${s.address.postalCode} ${s.address.city}${s.nextAvailableDeliveryTime ? ` · næsti afhendingartími ${dateWithDay(s.nextAvailableDeliveryTime.date)}` : ""}`),
  };
}

export async function testPostHog(_prev: TestState): Promise<TestState> {
  await requireAdmin();
  const cfg = await posthogConfig();
  if (!cfg.canCapture && !cfg.canQuery) return { ok: false, message: "Settu inn Project API key fyrst." };
  if (!cfg.canQuery) return { ok: true, message: "Síðan sendir atburði til PostHog. Til að sjá gögnin hér þarf líka Personal API key og Project ID." };
  try {
    const r = await hogql<[number]>("SELECT count() FROM events WHERE timestamp > now() - INTERVAL 1 DAY");
    return { ok: true, message: `Tengingin virkar. ${r.results[0]?.[0] ?? 0} atburðir skráðir síðasta sólarhring.` };
  } catch (e) {
    return { ok: false, message: errMsg(e) };
  }
}

export async function testSmtp(_prev: TestState): Promise<TestState> {
  const admin = await requireAdmin();
  const res = await sendEmail(admin.email, "Prufupóstur frá Fincafresh", emailLayout("Þetta virkar!", "<p>Ef þú sérð þennan póst er tölvupósturinn rétt tengdur.</p>"));
  if (res.sent) return { ok: true, message: `Prufupóstur sendur á ${admin.email}. Athugaðu innhólfið (og ruslpóst).` };
  if ("error" in res && res.error) return { ok: false, message: `Tókst ekki að senda: ${errMsg(res.error)}` };
  return { ok: false, message: "SMTP er ekki stillt, svo pósturinn var vistaður undir Fyrirspurnir → Útsendur póstur í staðinn." };
}
