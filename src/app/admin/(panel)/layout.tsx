import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { Flash } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Stjórnborð", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [newOrders, newInquiries, demo] = await Promise.all([
    db.order.count({ where: { status: "NEW" } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.setting.findUnique({ where: { key: "demo.seeded" } }),
  ]);
  return (
    <div className="admin-shell min-h-dvh bg-cream-100 lg:flex">
      <AdminNav adminName={admin.name || admin.email} badges={{ "/admin/pantanir": newOrders, "/admin/fyrirspurnir": newInquiries }} />
      <main className="min-w-0 flex-1">
        {demo?.value === "true" ? (
          <div className="border-b border-lemon/60 bg-lemon-100 px-4 py-2 text-center text-sm text-burgundy-900">
            Þú ert að skoða <strong>sýndargögn</strong> svo hægt sé að prófa allt. Þeim er eytt með einum smelli á{" "}
            <a href="/admin" className="font-semibold underline">Yfirliti</a>.
          </div>
        ) : null}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
      <Suspense>
        <Flash />
      </Suspense>
    </div>
  );
}
