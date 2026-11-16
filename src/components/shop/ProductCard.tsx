import Image from "next/image";
import Link from "next/link";
import { kr } from "@/lib/format";
import type { LiteProduct } from "./types";
import { AddToCartIcon } from "./AddToCartButton";

export function ProductCard({ product }: { product: LiteProduct }) {
  return (
    <article className="group flex flex-col">
      <Link href={`/vorur/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-2xl bg-white">
        <Image src={product.image} alt={product.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
      </Link>
      <h3 className="mt-3 font-display text-lg leading-snug text-burgundy"><Link href={`/vorur/${product.slug}`}>{product.name}</Link></h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{product.shortDescription}</p>
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="font-semibold text-ink">{kr(product.price)}</span>
        <AddToCartIcon product={product} />
      </div>
    </article>
  );
}
