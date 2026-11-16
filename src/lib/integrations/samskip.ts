import "server-only";
import { getSetting } from "../settings";

/**
 * Samskip: heimsendingar.
 * Staða: sótt hefur verið um API-aðgang (16.11.2026). Engin köll eru útfærð á ágiskun.
 * Þangað til: stjórnborðið býr til sendingarlista (CSV) fyrir heimsendingar og
 * hægt er að skrá rakningarnúmer á hverja pöntun.
 */
export async function samskipConfig() {
  const apiKey = await getSetting("samskip.apiKey");
  const apiUrl = await getSetting("samskip.apiUrl");
  return { apiKey, apiUrl, configured: false as const, waitingForAccess: true };
}
