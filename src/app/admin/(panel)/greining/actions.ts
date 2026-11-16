"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { done, fail, int, str } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { kr, dateLong } from "@/lib/format";
import { sendEmail, emailLayout } from "@/lib/integrations/email";
import { repeatSingleBuyers } from "./data";

export async function pinRecommendation(fd: FormData) {
  await requireAdmin();
  const productId = str(fd, "from");
  const rec = str(fd, "to");
  const count = await db.recommendationPin.count({ where: { productId } });
  await db.recommendationPin.upsert({
    where: { productId_recommendedProductId: { productId, recommendedProductId: rec } },
    create: { productId, recommendedProductId: rec, sortOrder: count },
    update: {},
  });
  revalidatePath("/admin/greining");
  revalidatePath("/", "layout");
  done("/admin/greining#keyptu-lika", "Meðmælin voru fest. Þau birtast nú fyrst á vörusíðunni og í körfunni.");
}

function code() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "ASKRIFT-" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function sendOffer(customerId: string, pct: number) {
  const buyers = await repeatSingleBuyers();
  const b = buyers.find((x) => x.customerId === customerId);
  if (!b) throw new Error("Viðskiptavinurinn er ekki lengur á listanum (kannski kominn í áskrift).");
  const expires = new Date(Date.now() + 30 * 86400000);
  const c = await db.discountCode.create({
    data: { code: code(), description: `Áskriftartilboð: ${b.email}`, type: "PERCENT", value: pct, appliesTo: "SUBSCRIPTION", usageLimit: 1, expiresAt: expires },
  });
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  await sendEmail(
    b.email,
    "Persónulegt tilboð: prófaðu áskrift að ávaxtakassanum",
    emailLayout(
      "Takk fyrir að versla hjá okkur!",
      `<p>Hæ ${b.name.split(" ")[0]},</p>
       <p>Við tókum eftir að þú hefur keypt ávaxtakassa hjá okkur ${b.orders} sinnum. Takk fyrir það!</p>
       <p>Vissir þú að áskrifendur fá afslátt af hverjum kassa? Ef þú hefðir verið í áskrift hefðir þú sparað um <strong>${kr(b.wouldSave)}</strong>.</p>
       <p>Til að þakka fyrir þig færðu <strong>${pct}% aukaafslátt</strong> af fyrsta áskriftarkassanum með kóðanum:</p>
       <p style="font-size:22px;font-weight:bold;letter-spacing:.06em;color:#6A2833;background:#F5EBD9;padding:12px 16px;border-radius:12px;display:inline-block">${c.code}</p>
       <p>Kóðinn gildir til ${dateLong(expires)}. Það er enginn binditími og þú getur sleppt sendingu eða gert hlé hvenær sem er.</p>
       ${site ? `<p><a href="${site}/askrift" style="color:#6A2833;font-weight:bold">Skoða áskrift →</a></p>` : ""}`
    )
  );
  await logActivity("customer", `Áskriftartilboð (${pct}%) sent til ${b.name} (${c.code})`, "success", { customerId });
  return c.code;
}

export async function sendSubscriptionOffer(fd: FormData) {
  await requireAdmin();
  const pct = Math.min(50, Math.max(1, int(fd, "pct", 10)));
  try {
    const c = await sendOffer(str(fd, "customerId"), pct);
    revalidatePath("/admin/greining");
    done("/admin/greining#tillogur", `Tilboð sent með kóðanum ${c}.`);
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    fail("/admin/greining#tillogur", (e as Error).message);
  }
}

export async function sendOfferToAll(fd: FormData) {
  await requireAdmin();
  const pct = Math.min(50, Math.max(1, int(fd, "pct", 10)));
  const buyers = (await repeatSingleBuyers()).filter((b) => !b.offerSentAt);
  let sent = 0;
  for (const b of buyers) {
    try {
      await sendOffer(b.customerId, pct);
      sent++;
    } catch {
      /* höldum áfram með næsta */
    }
  }
  revalidatePath("/admin/greining");
  done("/admin/greining#tillogur", sent ? `Tilboð sent til ${sent} viðskiptavina.` : "Allir á listanum hafa þegar fengið tilboð.");
}
