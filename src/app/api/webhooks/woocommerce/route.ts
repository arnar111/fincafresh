import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { verifyWooSignature, type WooCustomer, type WooProduct } from "@/lib/integrations/woocommerce";
import { upsertWooCustomer, upsertWooOrder, upsertWooProduct } from "@/lib/integrations/woo-sync";

/**
 * Móttaka fyrir WooCommerce webhooks.
 * Slóðin er sett inn í WooCommerce: Stillingar → Ítarlegt → Webhooks.
 * Heimild um hausa (X-WC-Webhook-Topic, X-WC-Webhook-Signature):
 * https://woocommerce.github.io/woocommerce-rest-api-docs/#webhooks
 */
export async function POST(req: Request) {
  const raw = await req.text();

  // Þegar webhook er búið til sendir WooCommerce "ping" með webhook_id=... (form-gögn). Svörum alltaf 200.
  if (/^webhook_id=\d+/.test(raw.trim())) {
    await logActivity("integration", "WooCommerce webhook tengt (ping móttekið)", "success");
    return NextResponse.json({ ok: true, ping: true });
  }

  const signature = req.headers.get("x-wc-webhook-signature");
  if (!(await verifyWooSignature(raw, signature))) {
    await logActivity("integration", "WooCommerce webhook hafnað: undirskrift stemmir ekki (athugaðu leyniorðið undir Tengingar)", "warning");
    return NextResponse.json({ error: "Ógild undirskrift" }, { status: 401 });
  }

  const topic = req.headers.get("x-wc-webhook-topic") ?? "";
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Ógilt JSON" }, { status: 400 });
  }

  try {
    if (topic.startsWith("order.")) {
      if (topic === "order.deleted") {
        const id = Number(body.id);
        if (id) await db.order.updateMany({ where: { wooId: id }, data: { status: "CANCELLED" } });
      } else {
        const res = await upsertWooOrder(body as never);
        await logActivity("integration", `WooCommerce: pöntun #${String(body.number ?? body.id)} ${res === "created" ? "móttekin" : "uppfærð"}`, "info");
      }
    } else if (topic.startsWith("product.")) {
      if (topic === "product.deleted") {
        const id = Number(body.id);
        if (id) await db.product.updateMany({ where: { wooId: id }, data: { active: false } });
      } else {
        await upsertWooProduct(body as unknown as WooProduct);
      }
      revalidatePath("/", "layout");
    } else if (topic.startsWith("customer.")) {
      if (topic !== "customer.deleted") await upsertWooCustomer(body as unknown as WooCustomer);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    await logActivity("integration", `WooCommerce webhook (${topic}) mistókst: ${(e as Error).message}`, "error");
    // 500 lætur WooCommerce reyna aftur síðar
    return NextResponse.json({ error: "Villa við vinnslu" }, { status: 500 });
  }
}
