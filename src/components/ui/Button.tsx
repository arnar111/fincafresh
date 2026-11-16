import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "dark" | "outline" | "ghost" | "green" | "pink" | "danger" | "light";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-orange text-burgundy-900 hover:bg-orange-600 shadow-[0_8px_20px_-10px_rgb(242_106_35/.8)]",
  dark: "bg-burgundy text-cream hover:bg-burgundy-700",
  green: "bg-green text-cream hover:bg-green-700",
  pink: "bg-pink text-burgundy-900 hover:brightness-95",
  outline: "border-[1.5px] border-burgundy/80 text-burgundy hover:bg-burgundy hover:text-cream",
  ghost: "text-burgundy hover:bg-burgundy/5",
  danger: "bg-danger text-white hover:brightness-110",
  light: "bg-cream-50 text-burgundy hover:bg-white border border-line",
};
const sizes: Record<Size, string> = {
  sm: "text-sm px-3.5 py-2",
  md: "text-[15px] px-5 py-3",
  lg: "text-base px-7 py-3.5",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
