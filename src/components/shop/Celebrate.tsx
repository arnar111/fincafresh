"use client";
import { useEffect } from "react";
import { useShop } from "./ShopUI";

export function Celebrate() {
  const { celebrate } = useShop();
  useEffect(() => {
    const t = setTimeout(celebrate, 250);
    return () => clearTimeout(t);
  }, [celebrate]);
  return null;
}
