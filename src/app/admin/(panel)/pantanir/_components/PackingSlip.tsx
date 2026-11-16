import type { Order, OrderItem } from "@prisma/client";
import { Wordmark } from "@/components/brand/Logo";
import { kr, dateLong, dateWithDayAcc } from "@/lib/format";
import { DELIVERY_METHOD_LABELS } from "@/lib/orders";

/** Fylgiseðill sem fer ofan í kassann. Hannaður fyrir A4 prentun. */
export function PackingSlip({ order, items, store }: { order: Order; items: OrderItem[]; store: { phone: string; email: string; address: string } }) {
  return (
    <article className="packing-slip mx-auto max-w-[720px] bg-white p-10 text-ink print:p-0">
      <header className="flex items-start justify-between gap-6 border-b-2 border-burgundy pb-5">
        <div>
          <Wordmark className="h-8 w-auto text-burgundy" />
          <p className="mt-2 text-sm text-muted">Árstíðabundnir ávextir beint frá völdum bændum á Spáni</p>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl text-burgundy">Pöntun #{order.number}</div>
          <div className="text-sm text-muted">{dateLong(order.createdAt)}</div>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-6 text-[15px]">
        <div>
          <h2 className="mb-1 font-sans text-xs font-semibold uppercase tracking-wider text-muted">Viðtakandi</h2>
          <div className="font-semibold">{order.name}</div>
          {order.phone ? <div>{order.phone}</div> : null}
          <div>{order.email}</div>
        </div>
        <div>
          <h2 className="mb-1 font-sans text-xs font-semibold uppercase tracking-wider text-muted">Afhending</h2>
          <div className="font-semibold">{DELIVERY_METHOD_LABELS[order.deliveryMethod] ?? order.deliveryMethod}</div>
          {order.deliveryMethod === "PIKKOLO" ? <div>{order.pikkoloStationName || "Stöð ekki valin"}</div> : null}
          {order.deliveryMethod === "HOME" ? (
            <div>
              {order.street}
              <br />
              {order.postalCode} {order.city}
            </div>
          ) : null}
          {order.deliveryDate ? <div className="text-sm text-muted">Sending {dateWithDayAcc(order.deliveryDate)}</div> : null}
        </div>
      </section>

      <table className="mt-8 w-full border-collapse text-[15px]">
        <thead>
          <tr className="border-b border-ink/20 text-left text-xs uppercase tracking-wider text-muted">
            <th className="w-12 py-2"><span className="sr-only">Pakkað</span></th>
            <th className="py-2">Vara</th>
            <th className="w-16 py-2 text-center">Magn</th>
            <th className="w-28 py-2 text-right">Verð</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-ink/10">
              <td className="py-3"><span className="inline-block h-5 w-5 rounded border-2 border-ink/40" /></td>
              <td className="py-3 font-medium">{i.name}</td>
              <td className="py-3 text-center text-lg font-semibold">{i.quantity}</td>
              <td className="py-3 text-right">{kr(i.unitPrice * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {order.discount ? (
            <tr><td /><td className="pt-3 text-right" colSpan={2}>Afsláttur</td><td className="pt-3 text-right">−{kr(order.discount)}</td></tr>
          ) : null}
          {order.shipping ? (
            <tr><td /><td className="pt-1 text-right" colSpan={2}>Sending</td><td className="pt-1 text-right">{kr(order.shipping)}</td></tr>
          ) : null}
          <tr><td /><td className="pt-2 text-right font-semibold" colSpan={2}>Samtals</td><td className="pt-2 text-right font-semibold">{kr(order.total)}</td></tr>
        </tfoot>
      </table>

      {order.customerNote ? (
        <section className="mt-6 rounded-xl bg-cream-50 p-4 text-[15px]">
          <h2 className="mb-1 font-sans text-xs font-semibold uppercase tracking-wider text-muted">Athugasemd frá viðskiptavini</h2>
          {order.customerNote}
        </section>
      ) : null}

      <footer className="mt-10 border-t border-ink/15 pt-4 text-center text-sm text-muted">
        <p className="font-display text-lg text-burgundy">Takk fyrir að versla við okkur!</p>
        <p>
          {store.phone} · {store.email} · {store.address}
        </p>
      </footer>
    </article>
  );
}

/** Prentstíll: felur valmynd stjórnborðs og sýnir aðeins fylgiseðlana */
export const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 14mm; }
  body * { visibility: hidden !important; }
  #print-root, #print-root * { visibility: visible !important; }
  #print-root { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
  .packing-slip { break-after: page; box-shadow: none !important; }
  .packing-slip:last-child { break-after: auto; }
  body { background: #fff !important; }
}`;
