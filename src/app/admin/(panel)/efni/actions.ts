"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { done, fail, str } from "@/lib/admin";
import { setSetting, type FaqItem } from "@/lib/settings";
import { logActivity } from "@/lib/activity";

function finish(msg: string): never {
  revalidatePath("/admin/efni");
  revalidatePath("/", "layout");
  done("/admin/efni", msg);
}

export async function saveContent(fd: FormData) {
  await requireAdmin();
  const section = str(fd, "section");
  switch (section) {
    case "announcement":
      await setSetting("store.announcement", str(fd, "announcement"));
      break;
    case "hero":
      if (!str(fd, "title")) fail("/admin/efni", "Fyrirsögnin má ekki vera tóm.");
      await setSetting("content.hero", { eyebrow: str(fd, "eyebrow"), title: str(fd, "title"), subtitle: str(fd, "subtitle") });
      break;
    case "story":
      await setSetting("content.story", { title: str(fd, "title"), body: str(fd, "body") });
      break;
    case "b2b":
      await setSetting("content.b2b", { title: str(fd, "title"), body: str(fd, "body") });
      break;
    case "about":
      await setSetting("content.about", str(fd, "about"));
      break;
    case "faq": {
      let items: FaqItem[] = [];
      try {
        items = (JSON.parse(str(fd, "faq")) as FaqItem[]).map((i) => ({ q: String(i.q ?? "").trim(), a: String(i.a ?? "").trim() })).filter((i) => i.q && i.a);
      } catch {
        fail("/admin/efni", "Tókst ekki að lesa spurningarnar.");
      }
      await setSetting("content.faq", items);
      break;
    }
    case "store":
      await setSetting("store.name", str(fd, "name") || "Fincafresh");
      await setSetting("store.email", str(fd, "email"));
      await setSetting("store.phone", str(fd, "phone"));
      await setSetting("store.address", str(fd, "address"));
      await setSetting("store.facebook", str(fd, "facebook"));
      await setSetting("store.instagram", str(fd, "instagram"));
      break;
    default:
      fail("/admin/efni", "Óþekktur hluti.");
  }
  await logActivity("system", `Efni síðunnar uppfært (${section})`, "success");
  finish("Vistað. Breytingin sést strax á síðunni.");
}
