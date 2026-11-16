"use client";
import { useState } from "react";
import Image from "next/image";
import { cn } from "@/components/ui/cn";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : ["/brand/lemon-mark.svg"];
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-sand shadow-soft">
        <Image src={list[i]} alt={alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
      </div>
      {list.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {list.map((src, n) => (
            <button key={src + n} onClick={() => setI(n)} aria-label={`Mynd ${n + 1}`} aria-pressed={i === n} className={cn("relative aspect-square overflow-hidden rounded-2xl bg-sand transition", i === n ? "ring-2 ring-burgundy ring-offset-2 ring-offset-cream" : "opacity-80 hover:opacity-100")}>
              <Image src={src} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
