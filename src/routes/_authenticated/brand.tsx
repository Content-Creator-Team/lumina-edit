import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ImagePlus, Loader2, Palette, Plus, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/app/query-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import type { BrandKit, BrandKitCreate } from "@/lib/api-types";
import { BRAND_FONTS, CAPTION_PRESETS, brandKitsQuery, ensureFontLoaded } from "@/lib/brand-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/brand")({
  head: () => ({
    meta: [
      { title: "Brand kit — REELZOY" },
      { name: "description", content: "Store your fonts, colours and logo; applied to captions and thumbnails." },
      { property: "og:title", content: "Brand kit — REELZOY" },
      { property: "og:description", content: "Store your fonts, colours and logo; applied to captions and thumbnails." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BrandPage,
});

type Draft = Required<Pick<BrandKitCreate, "name">> & {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  caption_preset: string;
};

const EMPTY: Draft = {
  name: "My brand",
  primary_color: "#7c3aed",
  secondary_color: "#0f172a",
  accent_color: "#38bdf8",
  font_family: "Sora",
  caption_preset: "clean",
};

function toDraft(kit: BrandKit): Draft {
  return {
    name: kit.name,
    primary_color: kit.primary_color ?? EMPTY.primary_color,
    secondary_color: kit.secondary_color ?? EMPTY.secondary_color,
    accent_color: kit.accent_color ?? EMPTY.accent_color,
    font_family: kit.font_family ?? EMPTY.font_family,
    caption_preset: kit.caption_preset ?? EMPTY.caption_preset,
  };
}

function BrandPage() {
  const qc = useQueryClient();
  const kitsQ = useQuery(brandKitsQuery());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const kits = kitsQ.data ?? [];
  const selected = kits.find((k) => k.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && kits[0]) setSelectedId(kits[0].id);
  }, [kits, selectedId]);
  useEffect(() => {
    if (selected) setDraft(toDraft(selected));
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => ensureFontLoaded(draft.font_family), [draft.font_family]);

  const save = useMutation({
    mutationFn: async () => {
      const kit = selected
        ? await api.updateBrandKit(selected.id, draft)
        : await api.createBrandKit({ ...draft, is_default: kits.length === 0 });
      return logoFile ? api.uploadBrandLogo(kit.id, logoFile) : kit;
    },
    onSuccess: async (kit) => {
      setLogoFile(null);
      setSelectedId(kit.id);
      await qc.invalidateQueries({ queryKey: ["brand-kits"] });
    },
  });
  const makeDefault = useMutation({
    mutationFn: (id: string) => api.updateBrandKit(id, { is_default: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brand-kits"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteBrandKit(id),
    onSuccess: async () => {
      setSelectedId(null);
      setDraft(EMPTY);
      await qc.invalidateQueries({ queryKey: ["brand-kits"] });
    },
  });

  if (kitsQ.isPending) return <LoadingState label="Loading brand kits…" />;
  if (kitsQ.isError) return <ErrorState error={kitsQ.error} onRetry={() => void kitsQ.refetch()} />;

  const logoPreview = logoFile ? URL.createObjectURL(logoFile) : selected?.logo_url ?? null;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Brand kit</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl">Your look, on every video</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            The default kit is applied automatically to captions in the editor and to thumbnails in Thumbnail Studio.
          </p>
        </div>
        <Button variant="outline" onClick={() => { setSelectedId(null); setDraft(EMPTY); setLogoFile(null); }}>
          <Plus className="size-4" /> New kit
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr_360px]">
        <nav aria-label="Brand kits" className="space-y-2">
          {kits.length === 0 && (
            <EmptyState title="No brand kits yet" description="Fill in the form and save to create your first kit." />
          )}
          {kits.map((k) => (
            <button
              key={k.id}
              onClick={() => setSelectedId(k.id)}
              aria-current={k.id === selectedId ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border p-2.5 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                k.id === selectedId ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent",
              )}
            >
              <span className="flex -space-x-1" aria-hidden="true">
                {[k.primary_color, k.secondary_color, k.accent_color].map((c, i) => (
                  <span key={i} className="size-4 rounded-full border border-border" style={{ background: c ?? "transparent" }} />
                ))}
              </span>
              <span className="min-w-0 flex-1 truncate">{k.name}</span>
              {k.is_default && <span className="rounded bg-primary/15 px-1.5 text-[10px]">Default</span>}
            </button>
          ))}
        </nav>

        <form
          className="surface-card space-y-5 rounded-xl border border-border bg-card p-5"
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="kit-name">Kit name</Label>
            <Input id="kit-name" value={draft.name} onChange={(e) => set("name", e.target.value)} required />
          </div>

          <fieldset className="grid grid-cols-3 gap-3">
            <legend className="mb-1.5 text-sm font-medium">Colours</legend>
            {(
              [
                ["primary_color", "Primary"],
                ["secondary_color", "Background"],
                ["accent_color", "Accent"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                <input type="color" value={draft[key]} onChange={(e) => set(key, e.target.value)} className="size-8 cursor-pointer rounded border-0 bg-transparent" />
                <span>
                  {label}
                  <span className="block font-mono text-muted-foreground">{draft[key]}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Font</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BRAND_FONTS.map((f) => (
                <button
                  type="button"
                  key={f}
                  onMouseEnter={() => ensureFontLoaded(f)}
                  onFocus={() => ensureFontLoaded(f)}
                  onClick={() => set("font_family", f)}
                  aria-pressed={draft.font_family === f}
                  style={{ fontFamily: `"${f}", sans-serif` }}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    draft.font_family === f ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Caption style</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {CAPTION_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => set("caption_preset", p.id)}
                  aria-pressed={draft.caption_preset === p.id}
                  className={cn(
                    "rounded-lg border p-2 text-left text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    draft.caption_preset === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
                  )}
                >
                  <span className="font-medium">{p.label}</span>
                  <span className="mt-0.5 block text-muted-foreground">{p.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="mb-1.5 text-sm font-medium">Logo</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border p-3 text-sm hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="size-12 rounded object-contain" />
              ) : (
                <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
              )}
              <span>{logoFile ? logoFile.name : logoPreview ? "Replace logo" : "Upload PNG or SVG"}</span>
              <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="sr-only" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="bg-brand-gradient text-primary-foreground" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {selected ? "Save changes" : "Create kit"}
            </Button>
            {selected && !selected.is_default && (
              <Button type="button" variant="outline" onClick={() => makeDefault.mutate(selected.id)}>
                <Star className="size-4" /> Make default
              </Button>
            )}
            {selected && (
              <Button type="button" variant="ghost" className="ml-auto text-destructive" onClick={() => remove.mutate(selected.id)}>
                <Trash2 className="size-4" /> Delete
              </Button>
            )}
          </div>
          {(save.isError || remove.isError) && (
            <p role="alert" className="text-sm text-destructive">{String(save.error ?? remove.error)}</p>
          )}
        </form>

        <aside aria-label="Live preview" className="space-y-4">
          <p className="flex items-center gap-1.5 text-sm font-medium"><Palette className="size-4" /> Live preview</p>
          <BrandThumbnailPreview draft={draft} logo={logoPreview} />
          <div className="relative aspect-[9/16] max-h-80 overflow-hidden rounded-xl" style={{ background: draft.secondary_color }}>
            <div className="absolute inset-x-4 bottom-10 text-center">
              <CaptionSample draft={draft} text="This is how captions look" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function CaptionSample({ draft, text }: { draft: Pick<Draft, "font_family" | "primary_color" | "accent_color" | "caption_preset">; text: string }) {
  const font = { fontFamily: `"${draft.font_family}", sans-serif` };
  if (draft.caption_preset === "bold-box")
    return <span className="inline rounded px-2 py-1 text-lg font-extrabold text-white" style={{ ...font, background: draft.primary_color }}>{text}</span>;
  if (draft.caption_preset === "highlight")
    return <span className="text-lg font-extrabold text-white underline decoration-4 underline-offset-4" style={{ ...font, textDecorationColor: draft.accent_color }}>{text}</span>;
  return <span className="text-lg font-extrabold text-white [text-shadow:0_2px_8px_rgb(0_0_0/0.7)]" style={font}>{text}</span>;
}

function BrandThumbnailPreview({ draft, logo }: { draft: Draft; logo: string | null }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl" style={{ background: `linear-gradient(135deg, ${draft.secondary_color}, ${draft.primary_color})` }}>
      <p className="absolute bottom-4 left-4 max-w-[70%] text-2xl leading-tight font-extrabold text-white uppercase" style={{ fontFamily: `"${draft.font_family}", sans-serif` }}>
        Your title <span style={{ color: draft.accent_color }}>here</span>
      </p>
      {logo && <img src={logo} alt="" className="absolute top-3 right-3 size-10 object-contain" />}
    </div>
  );
}
