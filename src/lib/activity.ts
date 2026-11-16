import { db } from "./db";

export type ActivityLevel = "info" | "success" | "warning" | "error";

/** Skráir atburð í virknisögu stjórnborðsins. Má aldrei brjóta aðgerðina sem kallar á hann. */
export async function logActivity(kind: string, message: string, level: ActivityLevel = "info", meta: Record<string, unknown> = {}) {
  try {
    await db.activityLog.create({ data: { kind, message, level, meta: JSON.stringify(meta) } });
  } catch (e) {
    console.error("[activity] gat ekki skráð:", e);
  }
}
