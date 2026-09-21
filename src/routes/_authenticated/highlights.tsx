import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Download, Loader2, Play, Sparkles, Trash2, UploadCloud, Wand2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { findHighlights, type HighlightSuggestion } from "@/lib/highlights.functions";
import { formatTimecode } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/highlights")({
  head: () => ({
    meta: [
      { title: "AI highlights — Cutroom" },
      {
        name: "description",
        content: "Drop in footage and let AI suggest editable highlight clips with timecodes.",
      },
      { property: "og:title", content: "AI highlights — Cutroom" },
      {
        property: "og:description",
        content: "Drop in footage and let AI suggest editable highlight clips with timecodes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HighlightsPage,
});

const MAX_BYTES = 20 * 1024 * 1024;

type Clip = HighlightSuggestion & { id: string; keep: boolean };

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
}

function HighlightsPage() {
  const analyze = useServerFn(findHighlights);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopAt = useRef<number | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [goal, setGoal] = useState("");
  const [dragging, setDragging] = useState(false);
  const [summary, setSummary] = useState("");
  const [clips, setClips] = useState<Clip[]>([]);

  const kept = useMemo(() => clips.filter((clip) => clip.keep), [clips]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a video first.");
      if (!duration) throw new Error("Still reading the video length — try again in a second.");
      const dataUrl = await readAsDataUrl(file);
      return analyze({
        data: {
          dataUrl,
          mimeType: file.type || "video/mp4",
          durationSeconds: duration,
          filename: file.name,
          goal: goal.trim() || undefined,
        },
      });
    },
    onSuccess: (result) => {
      setSummary(result.summary);
      setClips(
        result.highlights.map((highlight, index) => ({
          ...highlight,
          id: `clip-${index}-${Math.round(highlight.start * 100)}`,
          keep: true,
        })),
      );
      toast.success(`${result.highlights.length} highlight moments suggested.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function selectFile(next: File | null) {
    if (!next) return;
    if (!next.type.startsWith("video/")) {
      toast.error("That file is not a video.");
      return;
    }
    if (next.size > MAX_BYTES) {
      toast.error("Keep the clip under 20 MB so it can be analysed in one pass.");
      return;
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(next);
    setVideoUrl(URL.createObjectURL(next));
    setClips([]);
    setSummary("");
    setDuration(0);
  }

  function updateClip(id: string, patch: Partial<Clip>) {
    setClips((current) => current.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)));
  }

  function previewClip(clip: Clip) {
    const video = videoRef.current;
    if (!video) return;
    stopAt.current = clip.end;
    video.currentTime = clip.start;
    void video.play();
  }

  function exportClips() {
    const payload = {
      source: file?.name ?? "video",
      duration,
      generated_at: new Date().toISOString(),
      clips: kept.map(({ title, start, end, caption, reason, score }) => ({
        title,
        start: Number(start.toFixed(2)),
        end: Number(end.toFixed(2)),
        caption,
        reason,
        score,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cutroom-highlights.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const pct = (value: number) => `${Math.min(100, Math.max(0, (value / (duration || 1)) * 100))}%`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">AI assisted</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">Highlight finder</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Add a clip, describe what you are cutting for, and get suggested highlight moments you
            can edit, preview and export as a cut list.
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()}>
          <UploadCloud className="size-4" aria-hidden="true" />
          Choose video
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv"
        className="sr-only"
        aria-label="Choose a video to analyse"
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <section
        aria-label="Video source"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFile(event.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "grid gap-6 rounded-lg border border-dashed p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]",
          dragging ? "border-primary bg-accent/50" : "border-border bg-card",
        )}
      >
        <div className="overflow-hidden rounded-md border border-border bg-background">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="aspect-video w-full bg-black"
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              onTimeUpdate={(event) => {
                if (stopAt.current !== null && event.currentTarget.currentTime >= stopAt.current) {
                  event.currentTarget.pause();
                  stopAt.current = null;
                }
              }}
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-2 text-center">
              <Sparkles className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Drop a video here, or choose one. Up to 20 MB.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="goal">What are you cutting for?</Label>
            <Textarea
              id="goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              rows={3}
              placeholder="e.g. punchy 30 second social teaser, keep the funniest reactions"
              className="mt-2"
            />
          </div>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">File</dt>
              <dd className="truncate">{file?.name ?? "None selected"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Length</dt>
              <dd className="font-mono">{duration ? formatTimecode(duration) : "--:--"}</dd>
            </div>
          </dl>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!file || mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Wand2 className="size-4" aria-hidden="true" />
            )}
            {mutation.isPending ? "Finding highlights…" : "Find highlights"}
          </Button>
          <p role="status" className="text-xs text-muted-foreground">
            {mutation.isPending
              ? "Watching the footage. This can take a minute for longer clips."
              : "Suggestions are a starting point — every clip stays editable."}
          </p>
        </div>
      </section>

      {clips.length > 0 ? (
        <section aria-label="Suggested highlight clips" className="space-y-4">
          {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}

          <div className="relative h-8 overflow-hidden rounded-md border border-border bg-muted">
            {clips.map((clip) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => previewClip(clip)}
                title={`${clip.title} · ${formatTimecode(clip.start)}–${formatTimecode(clip.end)}`}
                aria-label={`Preview ${clip.title} from ${formatTimecode(clip.start)} to ${formatTimecode(clip.end)}`}
                className={cn(
                  "absolute top-0 h-full overflow-hidden border-r border-background px-1 text-[10px] font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                  clip.keep
                    ? "bg-primary/25 text-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground line-through",
                )}
                style={{
                  left: pct(clip.start),
                  width: pct(Math.max(0.3, clip.end - clip.start)),
                }}
              >
                <span className="truncate">{clip.title}</span>
              </button>
            ))}
          </div>

          <ul className="space-y-3">
            {clips.map((clip) => (
              <li
                key={clip.id}
                className={cn(
                  "rounded-lg border border-border bg-card p-4",
                  !clip.keep && "opacity-60",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`${clip.id}-title`} className="sr-only">
                      Clip title
                    </Label>
                    <Input
                      id={`${clip.id}-title`}
                      value={clip.title}
                      onChange={(event) => updateClip(clip.id, { title: event.target.value })}
                      className="font-medium"
                    />
                    <p className="mt-2 text-sm text-muted-foreground">{clip.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground">
                      Confidence {Math.round(clip.score * 100)}%
                    </span>
                    <Button variant="outline" size="sm" onClick={() => previewClip(clip)}>
                      <Play className="size-4" aria-hidden="true" />
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateClip(clip.id, { keep: !clip.keep })}
                    >
                      {clip.keep ? "Exclude" : "Include"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${clip.title}`}
                      onClick={() => setClips((c) => c.filter((item) => item.id !== clip.id))}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor={`${clip.id}-start`}>Start (s)</Label>
                    <Input
                      id={`${clip.id}-start`}
                      type="number"
                      step="0.1"
                      min={0}
                      max={duration || undefined}
                      value={clip.start.toFixed(1)}
                      onChange={(event) =>
                        updateClip(clip.id, {
                          start: Math.min(clip.end - 0.5, Math.max(0, Number(event.target.value))),
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${clip.id}-end`}>End (s)</Label>
                    <Input
                      id={`${clip.id}-end`}
                      type="number"
                      step="0.1"
                      min={0}
                      max={duration || undefined}
                      value={clip.end.toFixed(1)}
                      onChange={(event) =>
                        updateClip(clip.id, {
                          end: Math.max(
                            clip.start + 0.5,
                            Math.min(duration || Infinity, Number(event.target.value)),
                          ),
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${clip.id}-caption`}>Caption</Label>
                    <Input
                      id={`${clip.id}-caption`}
                      value={clip.caption ?? ""}
                      onChange={(event) => updateClip(clip.id, { caption: event.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={exportClips} disabled={kept.length === 0}>
              <Download className="size-4" aria-hidden="true" />
              Export {kept.length} clip{kept.length === 1 ? "" : "s"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Exports a cut list you can hand to the trimmer or your editor.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
