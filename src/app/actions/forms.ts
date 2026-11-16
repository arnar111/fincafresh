"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export type FormState = { ok: boolean; message: string } | null;

export async function subscribeNewsletter(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { ok: false, message: "Netfangið virðist ekki rétt." };
  await db.newsletterSubscriber.upsert({ where: { email }, create: { email, source: String(fd.get("source") ?? "footer") }, update: {} });
  return { ok: true, message: "Takk! Þú ert komin(n) á póstlistann." };
}

export async function sendInquiry(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = z
    .object({
      type: z.enum(["B2B", "CONTACT"]),
      name: z.string().min(2, "Nafn vantar"),
      email: z.string().email("Netfangið virðist ekki rétt"),
      phone: z.string().optional().default(""),
      company: z.string().optional().default(""),
      message: z.string().min(5, "Skrifaðu nokkur orð um hvað þú ert að leita að"),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Eitthvað vantar." };
  await db.inquiry.create({ data: parsed.data });
  await logActivity("inquiry", `Ný fyrirspurn frá ${parsed.data.name}${parsed.data.company ? ` (${parsed.data.company})` : ""}`, "info");
  return { ok: true, message: "Takk fyrir! Við höfum samband fljótlega." };
}
