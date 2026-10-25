import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Music, RefreshCw, Search, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";

import { ErrorState, LoadingState } from "@/components/app/query-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ApiError, api, toArray } from "@/lib/api-client";
import type { MusicTrack } from "@/lib/api-types";
import { musicStylesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/music")({
  head: () => ({
    meta: [
      { title: "Music library — REELZOY" },
      { name: "description", content: "Browse licensed music and add your own tracks." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MusicPage,
});

const PROVIDER_LABELS: Record<string, string> = {
  local_library: "Local library",
  jamendo: "Jamendo",
  freesound: "Freesound",
  generated_fallback: "Generated fallback",
};

function MusicPage() {
  const qc = useQueryClient();
  const styles = useQuery(musicStylesQuery());
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const filters = { genre: genre.trim(), mood: mood.trim() };

  const tracks = useQuery({
    queryKey: ["music-tracks", filters],
    queryFn: async () =>
      toArray((await api.listMusicTracks(filters)) as MusicTrack[] | { items?: MusicTrack[] }),
  });
  const refresh = useMutation({
    mutationFn: () => api.listMusicTracks({ ...filters, refresh: true }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["music-tracks"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteMusicTrack(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["music-tracks"] }),
  });

  const providers = Object.entries(styles.data?.providers ?? {});
  const error = refresh.error ?? remove.error;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Music library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tracks the AI can pick for your edits. Only eligible, licensed tracks are used.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
            {refresh.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            Refresh catalogue
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <UploadCloud className="size-4" aria-hidden="true" /> Upload track
          </Button>
        </div>
      </div>

      {providers.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Sources:</span>
          {providers.map(([k, v]) => (
            <Badge key={k} variant={v ? "secondary" : "outline"} className={v ? "" : "opacity-60"}>
              {PROVIDER_LABELS[k] ?? k} · {v ? "on" : "off"}
            </Badge>
          ))}
          {styles.data?.require_commercial_license && (
            <Badge variant="outline">Commercial licences required</Badge>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-8"
            placeholder="Genre (e.g. electronic)"
            aria-label="Filter by genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          />
        </div>
        <Input
          placeholder="Mood (e.g. energetic)"
          aria-label="Filter by mood"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error instanceof ApiError ? error.detail : String(error)}
        </p>
      )}

      {tracks.isPending ? (
        <LoadingState label="Loading tracks…" />
      ) : tracks.isError ? (
        <ErrorState error={tracks.error} onRetry={() => void tracks.refetch()} />
      ) : tracks.data.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border p-10 text-center">
          <Music className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">
            No tracks match. Try other filters or refresh the catalogue.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {tracks.data.map((t) => (
            <li
              key={t.id ?? t.title}
              className="surface-card flex flex-wrap items-center gap-3 rounded-xl p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {t.title}
                  {t.artist ? <span className="text-muted-foreground"> — {t.artist}</span> : null}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {t.provider && <Badge variant="outline">{t.provider}</Badge>}
                  {t.genre && <Badge variant="outline">{t.genre}</Badge>}
                  {t.bpm ? <Badge variant="outline">{Math.round(t.bpm)} BPM</Badge> : null}
                  {t.license_name && (
                    <Badge variant="secondary">
                      {t.license_url ? (
                        <a href={t.license_url} target="_blank" rel="noreferrer">
                          {t.license_name}
                        </a>
                      ) : (
                        t.license_name
                      )}
                    </Badge>
                  )}
                  {t.commercial_use === false && <Badge variant="outline">Non-commercial</Badge>}
                  {t.eligible === false ? (
                    <Badge variant="destructive" title={t.ineligible_reason ?? undefined}>
                      Not eligible{t.ineligible_reason ? `: ${t.ineligible_reason}` : ""}
                    </Badge>
                  ) : t.eligible ? (
                    <Badge>Eligible</Badge>
                  ) : null}
                </div>
                {t.attribution && (
                  <p className="mt-1 text-xs text-muted-foreground italic">{t.attribution}</p>
                )}
              </div>
              {t.preview_url && (
                <audio
                  controls
                  preload="none"
                  src={t.preview_url}
                  className="h-8 w-56 max-w-full"
                  aria-label={`Preview ${t.title}`}
                />
              )}
              {t.provider === "user" && t.id && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${t.title}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete “${t.title}”?`)) remove.mutate(t.id!);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <UploadTrackDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}

function UploadTrackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    artist: "",
    genre: "",
    moods: "",
    bpm: "",
    license_name: "",
    license_url: "",
    attribution: "",
  });
  const [rights, setRights] = useState(false);
  const [commercial, setCommercial] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const upload = useMutation({
    mutationFn: () => {
      const meta: Record<string, string | boolean | undefined> = {
        rights_confirmed: rights,
        commercial_use: commercial,
      };
      Object.entries(form).forEach(([k, v]) => {
        if (v.trim()) meta[k] = v.trim();
      });
      return api.uploadMusicTrack(file!, meta);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["music-tracks"] });
      onOpenChange(false);
      setFile(null);
      setRights(false);
      setForm({
        title: "",
        artist: "",
        genre: "",
        moods: "",
        bpm: "",
        license_name: "",
        license_url: "",
        attribution: "",
      });
    },
  });

  const valid = !!file && form.title.trim() && form.license_name.trim().length >= 2 && rights;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload a track</DialogTitle>
          <DialogDescription>
            Your track is only used in your own edits. You declare its licence.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="track-file" className="text-xs">
              Audio file
            </Label>
            <Input
              id="track-file"
              type="file"
              accept="audio/*"
              className="mt-1"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !form.title)
                  setForm((x) => ({ ...x, title: f.name.replace(/\.[^.]+$/, "") }));
              }}
            />
          </div>
          {(
            [
              ["title", "Title *"],
              ["artist", "Artist"],
              ["genre", "Genre"],
              ["moods", "Moods (comma-separated)"],
              ["bpm", "BPM"],
              ["license_name", "Licence *"],
              ["license_url", "Licence URL"],
              ["attribution", "Attribution"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <Label htmlFor={`track-${k}`} className="text-xs">
                {label}
              </Label>
              <Input
                id={`track-${k}`}
                className="mt-1"
                type={k === "bpm" ? "number" : "text"}
                value={form[k]}
                onChange={set(k)}
                placeholder={k === "license_name" ? "e.g. Owned, CC BY 4.0" : undefined}
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-xs sm:col-span-2">
            <Checkbox checked={commercial} onCheckedChange={(v) => setCommercial(v === true)} />
            Licence allows commercial use
          </label>
          <label className="flex items-start gap-2 text-xs sm:col-span-2">
            <Checkbox
              checked={rights}
              onCheckedChange={(v) => setRights(v === true)}
              className="mt-0.5"
            />
            I own this audio or have a licence to use it in my videos. *
          </label>
        </div>
        {upload.isError && (
          <p role="alert" className="text-xs text-destructive">
            {upload.error instanceof ApiError ? upload.error.detail : String(upload.error)}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || upload.isPending} onClick={() => upload.mutate()}>
            {upload.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
