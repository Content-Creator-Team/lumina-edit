import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { BrandKit } from "@/lib/api-types";

export const BRAND_FONTS = [
  "Sora",
  "Manrope",
  "Bebas Neue",
  "Montserrat",
  "Playfair Display",
  "Space Grotesk",
  "Anton",
  "DM Serif Display",
] as const;

export const CAPTION_PRESETS = [
  { id: "clean", label: "Clean", description: "Brand font, white text, soft shadow" },
  { id: "bold-box", label: "Bold box", description: "Text on a solid brand-colour box" },
  { id: "highlight", label: "Highlight", description: "White text, accent underline" },
] as const;

export const brandKitsQuery = () =>
  queryOptions({ queryKey: ["brand-kits"], queryFn: () => api.listBrandKits() });

/** Loads a Google font on demand so previews render in the kit's real font. */
export function ensureFontLoaded(family?: string | null) {
  if (!family || typeof document === "undefined") return;
  const id = `font-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@600;800&display=swap`;
  document.head.appendChild(link);
}

/** The default kit is applied automatically to captions and thumbnails. */
export function useDefaultBrandKit(): BrandKit | null {
  const q = useQuery(brandKitsQuery());
  const kits = q.data ?? [];
  const kit = kits.find((k) => k.is_default) ?? kits[0] ?? null;
  if (kit) ensureFontLoaded(kit.font_family);
  return kit;
}
