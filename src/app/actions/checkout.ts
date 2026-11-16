"use server";
import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readCart, summarize, clearCart } from "@/lib/cart";
import { placeOrder } from "@/lib/orders";
import { getCustomer, startCustomerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendLoginLink } from "@/lib/login-link";

export type CheckoutState = { error: string; fields?: Record<string, string> } | null;

const Schema = z
  .object({
    email: z.string().trim().email("Netfangið virðist ekki rétt"),
    name: z.string().trim().min(2, "Skrifaðu fullt nafn"),
    phone: z.string().trim().regex(/^\+?[\d\s-]{7,15}$/, "Símanúmerið virðist ekki rétt"),
    kennitala: z.string().trim().regex(/^(\d{6}-?\d{4})?$/, "Kennitalan virðist ekki rétt (10 tölustafir)").optional().default(""),
    deliveryMethod: z.enum(["PIKKOLO", "HOME", "PICKUP"], { message: "Veldu afhendingarmáta" }),
    street: z.string().trim().optional().default(""),
    postalCode: z.string().trim().optional().default(""),
    city: z.string().trim().optional().default(""),
    pikkoloStationId: z.string().optional().default(""),
    pikkoloStationName: z.string().optional().default(""),
    pikkoloDeliveryTimeId: z.string().optional().default(""),
    customerNote: z.string().max(1000).optional().default(""),
    password: z.string().optional().default(""),
    terms: z.literal("on", { message: "Þú þarft að samþykkja skilmálana" }),
    marketing: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryMethod === "PIKKOLO" && (!v.pikkoloStationId || !v.pikkoloDeliveryTimeId))
      ctx.addIssue({ code: "custom", path: ["pikkoloStationId"], message: "Veldu Pikkoló stöð" });
    if (v.deliveryMethod === "HOME") {
      if (!v.street) ctx.addIssue({ code: "custom", path: ["street"], message: "Heimilisfang vantar" });
      if (!/^\d{3}$/.test(v.postalCode)) ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Póstnúmer vantar" });
      if (!v.city) ctx.addIssue({ code: "custom", path: ["city"], message: "Staður vantar" });
    }
  });

export async function checkout(_: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const parsed = Schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { error: "Það vantar eða er rangt í nokkrum reitum.", fields };
  }
  const v = parsed.data;
  const cart = await readCart();
  const summary = await summarize(cart, v.deliveryMethod);
  if (!summary.lines.length) return { error: "Karfan er tóm." };
  if (!summary.shippingMethod) return { error: "Þessi afhendingarmáti er ekki í boði." };

  const loggedIn = await getCustomer();
  const existing = await db.customer.findUnique({ where: { email: v.email.toLowerCase() } });
  // Lykilorð er aðeins notað þegar NÝR aðgangur er stofnaður. Ef netfangið er þegar til
  // fær viðkomandi innskráningartengil í tölvupósti í staðinn (sannar að hann eigi netfangið).
  if (summary.hasSubscription && !loggedIn && !existing && v.password.length < 8) {
    return { error: "Búðu til lykilorð (a.m.k. 8 stafir) svo þú getir stjórnað áskriftinni.", fields: { password: "A.m.k. 8 stafir" } };
  }
  if (!existing && v.password && v.password.length < 8) {
    return { error: "Lykilorðið þarf að vera a.m.k. 8 stafir.", fields: { password: "A.m.k. 8 stafir" } };
  }

  let orderId = "";
  let sentLink = false;
  try {
    const sid = ((await cookies()).get("ff_sid")?.value ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 64);
    const { order, customer, isNewCustomer } = await placeOrder(summary, {
      email: v.email,
      name: v.name,
      phone: v.phone,
      kennitala: v.kennitala.replace("-", ""),
      street: v.street,
      postalCode: v.postalCode,
      city: v.city,
      deliveryMethod: v.deliveryMethod,
      pikkoloStationId: v.deliveryMethod === "PIKKOLO" ? v.pikkoloStationId : "",
      pikkoloStationName: v.deliveryMethod === "PIKKOLO" ? v.pikkoloStationName : "",
      pikkoloDeliveryTimeId: v.deliveryMethod === "PIKKOLO" ? v.pikkoloDeliveryTimeId : "",
      customerNote: v.customerNote,
      password: existing ? "" : v.password,
      marketingOptIn: v.marketing === "on",
      sessionId: sid,
      authenticatedCustomerId: loggedIn?.id ?? null,
    });
    orderId = order.id;
    await clearCart();
    (await cookies()).set("ff_last_order", order.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    // Öryggi: aðeins nýr aðgangur (sem kaupandinn stofnaði núna með lykilorði) er skráður inn.
    // Fyrirliggjandi aðgangur fær innskráningartengil í tölvupósti (t.d. til að stjórna áskrift).
    if (isNewCustomer && v.password) await startCustomerSession(customer.id);
    else if (!loggedIn || loggedIn.id !== customer.id) {
      if (summary.hasSubscription) {
        await sendLoginLink(customer, "Takk fyrir pöntunina! Smelltu á hnappinn til að skrá þig inn á Mínar síður og stjórna áskriftinni.");
        sentLink = true;
      }
    }
  } catch (e) {
    console.error("[checkout]", e);
    return { error: (e as Error).message || "Ekki tókst að ganga frá pöntuninni. Reyndu aftur eða hafðu samband." };
  }
  redirect(`/pontun/${orderId}${sentLink ? "?tengill=1" : ""}`);
}
