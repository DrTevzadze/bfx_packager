import type { BfxApi } from "@/types";

export function getBfxApi(): BfxApi | null {
  return window.bfx ?? null;
}
