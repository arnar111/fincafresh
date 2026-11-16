import "server-only";
import { createMagicToken } from "./auth";
import { sendEmail, emailLayout } from "./integrations/email";

/**
 * Sendir innskráningartengil (gildir í 30 mín.) á netfang viðskiptavinar.
 * Þetta er eina leiðin fyrir óinnskráðan notanda að komast inn á aðgang sem þegar er til
 * án lykilorðs: hann sannar þannig að hann eigi netfangið.
 */
export async function sendLoginLink(customer: { id: string; email: string }, intro = "Smelltu á hnappinn til að skrá þig inn á Mínar síður hjá Fincafresh.") {
  const token = await createMagicToken(customer.id);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const link = `${site}/minar-sidur/tengill?t=${encodeURIComponent(token)}`;
  await sendEmail(
    customer.email,
    "Innskráning á Mínar síður",
    emailLayout(
      "Skráðu þig inn",
      `<p>${intro} Tengillinn gildir í 30 mínútur.</p><p><a href="${link}" style="display:inline-block;background:#F26A23;color:#3A151C;padding:12px 22px;border-radius:999px;font-weight:bold;text-decoration:none">Skrá mig inn</a></p><p style="font-size:13px;color:#6E5C58">Ef þú baðst ekki um þetta máttu hunsa póstinn.</p>`
    )
  );
}
