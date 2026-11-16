import "server-only";
import { getSetting } from "../settings";

/**
 * Repeat (repeat.is): áskriftar- og endurteknar greiðslur.
 *
 * ATH: Repeat birtir ekki opinbera API-skjölun á vefnum sínum (athugað 16.11.2026).
 * Þess vegna eru engin API-köll útfærð hér á ágiskun. Þegar skjölun berst frá Repeat
 * er hún útfærð í þessari skrá og stjórnborðið byrjar sjálfkrafa að nota hana.
 * Þangað til: áskriftir eru stjórnaðar hér í kerfinu og Repeat-auðkenni skráð handvirkt
 * eða flutt inn með CSV (Stjórnborð → Áskriftir → Flytja inn).
 */
export async function repeatConfig() {
  const apiKey = await getSetting("repeat.apiKey");
  const apiUrl = await getSetting("repeat.apiUrl");
  return { apiKey, apiUrl, configured: false as const, waitingForDocs: true };
}
