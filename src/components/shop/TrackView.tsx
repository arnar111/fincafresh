"use client";
import { useEffect } from "react";
import { track } from "./track";

export function TrackView({ name = "product_viewed", productId, props = {} }: { name?: string; productId?: string; props?: Record<string, unknown> }) {
  useEffect(() => {
    track(name, props, productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, productId]);
  return null;
}
