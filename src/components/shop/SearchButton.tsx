"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";

export function SearchButton() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  return (
    <>
      <button onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-full text-burgundy hover:bg-burgundy/5" aria-label="Leita">
        <Icon name="search" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="p-5" labelledBy="leit-titill">
        <h2 id="leit-titill" className="mb-3 font-display text-2xl text-burgundy">Leita</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            router.push(`/leit?q=${encodeURIComponent(q)}`);
          }}
          className="flex gap-2"
        >
          <input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="T.d. mangó, granóla, Delúx…" className="w-full rounded-full border border-line bg-white px-4 py-3 text-base focus:border-burgundy focus:outline-none" />
          <button className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-burgundy text-cream" aria-label="Leita"><Icon name="search" /></button>
        </form>
      </Modal>
    </>
  );
}
