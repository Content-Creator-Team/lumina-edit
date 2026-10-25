import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useDefaultBrandKit } from "@/lib/brand-kit";
import { Check, Download, ImageIcon, Loader2, Pencil, RefreshCw, Sparkles, Star } from "lucide-react";
import { useMemo, useState } from "react";

import { ErrorState, LoadingState } from "@/components/app/query-states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, api } from "@/lib/api-client";
import type {
  GeneratedThumbnail,
  ThumbnailConcept,
  ThumbnailFormat,
  ThumbnailPosition,
} from "@/lib/api-types";
import { thumbnailsQuery, videoQuery, videoTitle } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/videos/$id/thumbnails")({
  head: () => ({
    meta: [
      { title: "Thumbnail Studio — REELZOY" },
      { name: "description", content: "Design, compare and pick thumbnails for your video." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThumbnailStudioPage,
});

const STYLES = [
  { id: "bold_creator", label: "Bold creator" },
  { id: "clean_editorial", label: "Clean editorial" },
  { id: "cinematic", label: "Cinematic" },
];
const FORMATS: Array<{ id: ThumbnailFormat; label: string; aspect: string }> = [
  { id: "youtube", label: "YouTube 16:9", aspect: "aspect-video" },
  { id: "vertical", label: "Vertical 9:16", aspect: "aspect-[9/16]" },
  { id: "square", label: "Square 1:1", aspect: "aspect-square" },
];
const POSITIONS: ThumbnailPosition[] = ["auto", "left", "right", "top", "bottom", "center"];

const styleLabel = (s?: string | null) => STYLES.find((x) => x.id === s)?.label ?? (s ? s.replace(/_/g, " ") : "Other");

function formatOf(t: GeneratedThumbnail): ThumbnailFormat {
  if (t.format === "vertical" || t.format === "square" || t.format === "youtube") return t.format;
  if (t.width && t.height) return t.width > t.height ? "youtube" : t.width < t.height ? "vertical" : "square";
  return "youtube";
}

function ThumbnailStudioPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const videoQ = useQuery(videoQuery(id));
  const thumbsQ = useQuery(thumbnailsQuery(id));
  const kit = useDefaultBrandKit();
  const [format, setFormat] = useState<ThumbnailFormat>("youtube");
  const [editing, setEditing] = useState<GeneratedThumbnail | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: thumbnailsQuery(id).queryKey });

  const regen = useMutation({
    mutationFn: () => api.regenerateThumbnails(id, 4),
    onSuccess: () => void refresh(),
  });
  const design = useMutation({
    mutationFn: (body: { concepts?: ThumbnailConcept[]; from_thumbnail_id?: string }) =>
      api.designThumbnails(id, { ...body, format }),
    onSuccess: () => {
      setEditing(null);
      void refresh();
    },
  });
  const select = useMutation({
    mutationFn: (thumbId: string) => api.selectThumbnail(id, thumbId),
    onSuccess: (list) => queryClient.setQueryData(thumbnailsQuery(id).queryKey, list),
  });

  const all = thumbsQ.data ?? [];
  const designed = all.filter((t) => t.variant === "designed" && formatOf(t) === format);
  const frames = all.filter((t) => t.variant !== "designed");
  const groups = useMemo(() => {
    const map = new Map<string, GeneratedThumbnail[]>();
    designed.forEach((t) => {
      const k = t.style ?? "other";
      map.set(k, [...(map.get(k) ?? []), t]);
    });
    return [...map.entries()];
  }, [designed]);
  const aspect = FORMATS.find((f) => f.id === format)!.aspect;

  if (videoQ.isPending) return <LoadingState label="Loading video…" />;
  if (videoQ.isError) return <ErrorState error={videoQ.error} onRetry={() => void videoQ.refetch()} />;

  const mutationError = design.error ?? select.error ?? regen.error;

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/videos/$id" params={{ id }} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← Back to video
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Thumbnail Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">{videoTitle(videoQ.data)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/editor/$videoId" params={{ videoId: id }}>Open editor</Link>
          </Button>
          <Button size="sm" disabled={design.isPending} onClick={() => design.mutate({})}>
            {design.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Sparkles className="mr-1.5 size-3.5" />}
            Design thumbnails
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Thumbnail format">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={format === f.id}
            onClick={() => setFormat(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              format === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {mutationError && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {mutationError instanceof ApiError ? mutationError.detail : String(mutationError)}
        </p>
      )}

      {thumbsQ.isPending && (
        <div className="mt-10 flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      )}
      {thumbsQ.isError && <ErrorState error={thumbsQ.error} onRetry={() => void thumbsQ.refetch()} />}

      {thumbsQ.data && (
        <section aria-labelledby="designed-heading" className="mt-6">
          <h2 id="designed-heading" className="text-sm font-medium text-foreground">Designed thumbnails</h2>
          {groups.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-border p-8 text-center">
              <ImageIcon className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No designed {FORMATS.find((f) => f.id === format)!.label} thumbnails yet.
              </p>
              <Button className="mt-3" size="sm" disabled={design.isPending} onClick={() => design.mutate({})}>
                Design from the plan's concepts
              </Button>
            </div>
          ) : (
            groups.map(([style, items]) => (
              <div key={style} className="mt-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{styleLabel(style)}</p>
                <div className={cn("mt-2 grid gap-4", format === "vertical" ? "grid-cols-2 sm:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3")}>
                  {items.map((t) => (
                    <figure
                      key={t.id}
                      className={cn("overflow-hidden rounded-lg border bg-muted/20", t.selected ? "border-primary ring-2 ring-primary/40" : "border-border")}
                    >
                      <div className="relative">
                        <img
                          src={t.url}
                          alt={t.headline ?? t.label ?? "Thumbnail"}
                          loading="lazy"
                          className={cn("w-full bg-black object-contain", !(t.width && t.height) && aspect)}
                          style={t.width && t.height ? { aspectRatio: `${t.width} / ${t.height}` } : undefined}
                        />
                        {t.selected && (
                          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                            <Star className="size-3" aria-hidden="true" /> Selected
                          </span>
                        )}
                      </div>
                      <figcaption className="space-y-2 px-3 py-2">
                        <p className="truncate text-xs text-foreground">{t.headline ?? t.label ?? "Untitled"}</p>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant={t.selected ? "secondary" : "outline"} className="h-7 px-2 text-xs" disabled={t.selected || select.isPending} onClick={() => select.mutate(t.id)}>
                            <Check className="size-3" /> {t.selected ? "Selected" : "Use"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(t)}>
                            <Pencil className="size-3" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={design.isPending} onClick={() => design.mutate({ from_thumbnail_id: t.id })}>
                            <RefreshCw className="size-3" /> Regenerate
                          </Button>
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                            <a href={t.url} download target="_blank" rel="noreferrer" aria-label="Download thumbnail">
                              <Download className="size-3" />
                            </a>
                          </Button>
                        </div>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {thumbsQ.data && (
        <section aria-labelledby="frames-heading" className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="frames-heading" className="text-sm font-medium text-foreground">Source frames</h2>
            <Button size="sm" variant="outline" disabled={regen.isPending} onClick={() => regen.mutate()}>
              {regen.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 size-3.5" />}
              Extract new frames
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {kit ? (
              <>Brand kit “{kit.name}” preview shown. <Link to="/brand" className="underline">Edit kit</Link></>
            ) : (
              <>No brand kit yet. <Link to="/brand" className="underline">Create one</Link> to add your logo, font and colours.</>
            )}
          </p>
          {frames.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No frames extracted yet.</p>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {frames.map((thumb) => (
                <figure key={thumb.id} className="overflow-hidden rounded-lg border border-border bg-muted/20">
                  <div className="relative">
                    <img src={thumb.url} alt={thumb.label ?? "Thumbnail"} className="aspect-video w-full object-cover" />
                    {kit && (
                      <div className="absolute inset-0" style={{ boxShadow: `inset 0 -80px 60px -40px ${kit.secondary_color ?? "#000"}` }}>
                        <p
                          className="absolute bottom-3 left-3 max-w-[75%] text-lg leading-tight font-extrabold text-white uppercase [text-shadow:0_2px_6px_rgb(0_0_0/0.6)]"
                          style={{ fontFamily: `"${kit.font_family ?? "Sora"}", sans-serif` }}
                        >
                          {videoTitle(videoQ.data)}
                        </p>
                        <span className="absolute top-0 left-0 h-1.5 w-full" style={{ background: kit.primary_color ?? undefined }} />
                        {kit.logo_url && <img src={kit.logo_url} alt="" className="absolute top-3 right-3 size-9 object-contain" />}
                      </div>
                    )}
                  </div>
                  <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <span className="truncate">{thumb.label ?? thumb.variant}</span>
                    <span className="flex items-center gap-2">
                      {thumb.timestamp != null && <span className="tabular-nums">{thumb.timestamp.toFixed(1)}s</span>}
                      <button
                        type="button"
                        className="underline underline-offset-2 hover:text-foreground"
                        onClick={() =>
                          setEditing({ ...thumb, style: "bold_creator", headline: videoTitle(videoQ.data), variant: "frame" })
                        }
                      >
                        Design from this
                      </button>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      <EditThumbnailDialog
        thumb={editing}
        pending={design.isPending}
        onClose={() => setEditing(null)}
        onSubmit={(concept) => design.mutate({ concepts: [concept] })}
      />
    </div>
  );
}

function EditThumbnailDialog({
  thumb,
  pending,
  onClose,
  onSubmit,
}: {
  thumb: GeneratedThumbnail | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (concept: ThumbnailConcept) => void;
}) {
  return (
    <Dialog open={!!thumb} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {thumb && <EditForm key={thumb.id} thumb={thumb} pending={pending} onClose={onClose} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  thumb,
  pending,
  onClose,
  onSubmit,
}: {
  thumb: GeneratedThumbnail;
  pending: boolean;
  onClose: () => void;
  onSubmit: (concept: ThumbnailConcept) => void;
}) {
  const meta = (thumb.meta ?? {}) as { position?: ThumbnailPosition; accent?: string | null };
  const [headline, setHeadline] = useState(thumb.headline ?? thumb.label ?? "");
  const [style, setStyle] = useState(thumb.style ?? "bold_creator");
  const [position, setPosition] = useState<ThumbnailPosition>(meta.position ?? "auto");
  const [accent, setAccent] = useState(meta.accent ?? "");
  const accentValid = !accent || /^#[0-9a-fA-F]{6}$/.test(accent);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit thumbnail</DialogTitle>
        <DialogDescription>A new designed thumbnail is created; the original is kept.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <div>
          <Label htmlFor="thumb-headline" className="text-xs">Headline</Label>
          <Input id="thumb-headline" className="mt-1" value={headline} maxLength={80} onChange={(e) => setHeadline(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Text position</Label>
            <Select value={position} onValueChange={(v) => setPosition(v as ThumbnailPosition)}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="thumb-accent" className="text-xs">Accent colour</Label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              aria-label="Pick accent colour"
              value={accentValid && accent ? accent : "#7c3aed"}
              onChange={(e) => setAccent(e.target.value)}
              className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent"
            />
            <Input id="thumb-accent" value={accent} placeholder="#RRGGBB (optional)" onChange={(e) => setAccent(e.target.value)} />
          </div>
          {!accentValid && <p className="mt-1 text-xs text-destructive">Use a #RRGGBB colour.</p>}
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          disabled={pending || !headline.trim() || !accentValid}
          onClick={() =>
            onSubmit({
              style,
              headline: headline.trim(),
              position,
              accent: accent || null,
              frame_time: thumb.timestamp ?? null,
            })
          }
        >
          {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          Create thumbnail
        </Button>
      </DialogFooter>
    </>
  );
}
