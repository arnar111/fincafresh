import "server-only";
import { getSetting } from "../settings";

/**
 * PostHog.
 * Heimildir: https://posthog.com/docs/api/capture og https://posthog.com/docs/api/query
 * - Atburðir frá vafra fara í gegnum posthog-js (sjá components/shop/Analytics.tsx).
 * - Atburðir frá netþjóni (t.d. "order_completed") eru sendir á /capture/.
 * - Stjórnborðið les gögn með HogQL fyrirspurnum (þarf "personal API key" og project ID).
 */

export async function posthogConfig() {
  const key = await getSetting("posthog.key");
  const host = (await getSetting("posthog.host")) || "https://eu.i.posthog.com";
  const personalApiKey = await getSetting("posthog.personalApiKey");
  const projectId = await getSetting("posthog.projectId");
  // Fyrirspurnir fara á "app" hýsilinn (eu.posthog.com), ekki móttökuhýsilinn (eu.i.posthog.com)
  const apiHost = host.replace("://eu.i.", "://eu.").replace("://us.i.", "://us.");
  return { key, host, apiHost, personalApiKey, projectId, canCapture: !!key, canQuery: !!(personalApiKey && projectId) };
}

export async function captureServer(event: string, distinctId: string, properties: Record<string, unknown> = {}) {
  const cfg = await posthogConfig();
  if (!cfg.canCapture) return;
  try {
    await fetch(`${cfg.host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: cfg.key, event, distinct_id: distinctId, properties: { ...properties, $lib: "fincafresh-server" } }),
    });
  } catch (e) {
    console.error("[posthog] capture mistókst", e);
  }
}

export async function hogql<T = unknown[]>(query: string): Promise<{ columns: string[]; results: T[] }> {
  const cfg = await posthogConfig();
  if (!cfg.canQuery) throw new Error("PostHog fyrirspurnir eru ekki tengdar (vantar personal API key og project ID).");
  const res = await fetch(`${cfg.apiHost}/api/projects/${cfg.projectId}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.personalApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PostHog svaraði ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { columns: string[]; results: T[] };
  return { columns: json.columns ?? [], results: json.results ?? [] };
}
