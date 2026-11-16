"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { done, fail, str, bool } from "@/lib/admin";
import { logActivity } from "@/lib/activity";

export async function updateCustomer(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const path = `/admin/vidskiptavinir/${id}`;
  const email = str(fd, "email").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(path, "Sláðu inn gilt netfang.");
  const clash = await db.customer.findFirst({ where: { email, id: { not: id } } });
  if (clash) fail(path, "Annar viðskiptavinur er þegar með þetta netfang.");
  await db.customer.update({
    where: { id },
    data: {
      name: str(fd, "name"),
      email,
      phone: str(fd, "phone"),
      kennitala: str(fd, "kennitala"),
      street: str(fd, "street"),
      postalCode: str(fd, "postalCode"),
      city: str(fd, "city"),
      marketingOptIn: bool(fd, "marketingOptIn"),
    },
  });
  revalidatePath(path);
  revalidatePath("/admin/vidskiptavinir");
  done(path, "Upplýsingar viðskiptavinar vistaðar.");
}

export async function saveCustomerNotes(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  await db.customer.update({ where: { id }, data: { notes: str(fd, "notes") } });
  revalidatePath(`/admin/vidskiptavinir/${id}`);
  done(`/admin/vidskiptavinir/${id}`, "Minnispunktar vistaðir.");
}

export async function removeCustomerPassword(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const c = await db.customer.update({ where: { id }, data: { passwordHash: null } });
  await logActivity("customer", `Lykilorð fjarlægt af aðgangi ${c.email}`, "warning");
  revalidatePath(`/admin/vidskiptavinir/${id}`);
  done(`/admin/vidskiptavinir/${id}`, "Lykilorðið var fjarlægt. Viðskiptavinurinn getur búið til nýtt við næstu pöntun.");
}
