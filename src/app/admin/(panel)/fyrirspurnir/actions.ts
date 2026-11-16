"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { done, str } from "@/lib/admin";

export async function toggleInquiry(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const q = await db.inquiry.findUnique({ where: { id } });
  if (q) await db.inquiry.update({ where: { id }, data: { status: q.status === "NEW" ? "HANDLED" : "NEW" } });
  revalidatePath("/admin/fyrirspurnir");
  revalidatePath("/admin", "layout");
  done("/admin/fyrirspurnir", q?.status === "NEW" ? "Merkt sem afgreitt." : "Merkt sem óafgreitt.");
}

export async function deleteInquiry(fd: FormData) {
  await requireAdmin();
  await db.inquiry.deleteMany({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/fyrirspurnir");
  revalidatePath("/admin", "layout");
  done("/admin/fyrirspurnir", "Fyrirspurn eytt.");
}

export async function deleteSubscriber(fd: FormData) {
  await requireAdmin();
  await db.newsletterSubscriber.deleteMany({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/fyrirspurnir");
  done("/admin/fyrirspurnir?flipi=postlisti", "Netfang fjarlægt af póstlista.");
}
