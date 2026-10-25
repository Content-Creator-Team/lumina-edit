import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Combine, FileVideo, Loader2, SlidersHorizontal, UploadCloud, X } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useRef, useState } from "react";

import {
  cleanEditOptions,
  DEFAULT_EDIT_OPTIONS,
  EditOptionsPanel,
} from "@/components/app/edit-options-panel";
import { TemplateLibrary } from "@/components/app/template-library";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { EditOptions } from "@/lib/api-types";
import { Progress } from "@/components/ui/progress";
import { ApiError, uploadVideoBatch, uploadVideoFile } from "@/lib/api-client";
import { isDemoMode } from "@/lib/runtime-config";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload footage — REELZOY" },
      { name: "description", content: "Upload MP4, MOV or MKV footage for AI-assisted editing." },
      { property: "og:title", content: "Upload footage — REELZOY" },
      {
        property: "og:description",
        content: "Upload MP4, MOV or MKV footage for AI-assisted editing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UploadPage,
});

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".mkv"];

function validate(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return "Unsupported format. Choose an MP4, MOV or MKV file.";
  }
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_BYTES) {
    return `That file is ${(file.size / 1024 ** 3).toFixed(1)} GB. The limit is 2 GB.`;
  }
  return null;
}

function formatSize(bytes: number) {
  if (bytes > 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

type Phase = "idle" | "uploading" | "error";

function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [file, setFile] = useState<File | null>(null);
  // 2+ files: combined (in this order) into one edit via upload-batch.
  const [batch, setBatch] = useState<File[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("auto");
  const [options, setOptions] = useState<EditOptions>(DEFAULT_EDIT_OPTIONS);
  const [customOpen, setCustomOpen] = useState(false);

  function selectFiles(list: FileList | File[] | null | undefined) {
    const all = Array.from(list ?? []);
    if (all.length === 0) return;
    if (all.length === 1 && batch.length === 0 && !file) {
      selectFile(all[0]!);
      return;
    }
    const merged = [...(file ? [file] : []), ...batch, ...all];
    const problem = merged.map(validate).find(Boolean) ?? null;
    if (problem) {
      setError(problem);
      setPhase("error");
      return;
    }
    if (merged.length > 20) {
      setError("You can combine up to 20 clips at once.");
      setPhase("error");
      return;
    }
    setError(null);
    setPhase("idle");
    setProgress(0);
    setFile(null);
    setBatch(merged);
  }

  function moveBatch(from: number, to: number) {
    setBatch((list) => {
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  }

  function removeFromBatch(index: number) {
    setBatch((list) => {
      const next = list.filter((_, i) => i !== index);
      if (next.length === 1) {
        setFile(next[0]!);
        return [];
      }
      return next;
    });
  }

  function selectFile(next: File | null) {
    if (!next) return;
    if (batch.length > 0) {
      selectFiles([next]);
      return;
    }

    const problem = validate(next);
    setError(problem);
    setPhase(problem ? "error" : "idle");
    setProgress(0);
    setFile(problem ? null : next);
  }

  async function startUpload() {
    if (batch.length >= 2) return startBatchUpload();
    if (!file) return;
    setError(null);
    setProgress(0);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      setPhase("uploading");
      const videoId = await uploadVideoFile(file, setProgress, ctrl.signal, {
        title: file.name.replace(/\.[^.]+$/, ""),
        template_id: templateId,
        options: cleanEditOptions(options),
      });
      posthog.capture("video_uploaded", {
        file_extension: file.name.split(".").pop()?.toLowerCase() ?? "unknown",
        file_size_mb: Math.round(file.size / 1024 ** 2),
        template_id: templateId,
      });
      await queryClient.invalidateQueries({ queryKey: ["videos"] });
      navigate({ to: "/videos/$id", params: { id: videoId } });
    } catch (cause) {
      if ((cause as Error)?.name === "AbortError") {
        setPhase("idle");
        return;
      }
      setPhase("error");
      setError(
        cause instanceof ApiError
          ? cause.detail
          : cause instanceof Error
            ? cause.message
            : "The upload failed. Please try again.",
      );
    } finally {
      abortRef.current = null;
    }
  }

  async function startBatchUpload() {
    setError(null);
    setProgress(0);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      setPhase("uploading");
      const videoId = await uploadVideoBatch(batch, setProgress, ctrl.signal, {
        title: `${batch[0]!.name.replace(/\.[^.]+$/, "")} + ${batch.length - 1} more`,
        template_id: templateId,
        options: cleanEditOptions(options),
      });
      posthog.capture("video_batch_uploaded", { clip_count: batch.length, template_id: templateId });
      await queryClient.invalidateQueries({ queryKey: ["videos"] });
      navigate({ to: "/videos/$id", params: { id: videoId } });
    } catch (cause) {
      if ((cause as Error)?.name === "AbortError") {
        setPhase("idle");
        return;
      }
      setPhase("error");
      setError(cause instanceof ApiError ? cause.detail : cause instanceof Error ? cause.message : "The upload failed.");
    } finally {
      abortRef.current = null;
    }
  }

  function cancelUpload() {
    abortRef.current?.abort();
  }

  const busy = phase === "uploading";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Upload footage</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        MP4, MOV or MKV, up to 2 GB.
      </p>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy) selectFiles(event.dataTransfer.files);
        }}
        className={`mt-8 rounded-lg border border-dashed p-10 text-center transition-colors ${
          dragging ? "border-primary bg-accent/50" : "border-border"
        }`}
      >
        <UploadCloud className="mx-auto size-7 text-muted-foreground" aria-hidden="true" strokeWidth={1.5} />
        <p className="mt-4 text-sm text-foreground">Drag videos here, or choose files</p>
        <p className="mt-1 text-xs text-muted-foreground">Pick 2–20 clips to combine them into one edit.</p>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-matroska,.mp4,.mov,.mkv"
          className="sr-only"
          aria-label="Choose a video file to upload"
          multiple
          onChange={(event) => {
            selectFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Button
          variant="outline"
          className="mt-5"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          Choose file
        </Button>
      </div>

      {batch.length >= 2 && (
        <div className="mt-6 rounded-lg border border-border p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Combine className="size-4 text-primary" aria-hidden="true" />
            Combine into one edit · {batch.length} clips ·{" "}
            {formatSize(batch.reduce((a, f) => a + f.size, 0))}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Clips are joined in this order. Drag or use the arrows to reorder.</p>
          <ol className="mt-3 space-y-1.5">
            {batch.map((f, i) => (
              <li
                key={`${f.name}-${f.size}-${i}`}
                draggable={!busy}
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragIndex !== null) moveBatch(dragIndex, i);
                  setDragIndex(null);
                }}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm"
              >
                <span className="w-5 text-center font-mono text-xs text-muted-foreground">{i + 1}</span>
                <FileVideo className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="text-xs text-muted-foreground">{formatSize(f.size)}</span>
                <button type="button" disabled={busy || i === 0} aria-label={`Move ${f.name} up`} onClick={() => moveBatch(i, i - 1)} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowUp className="size-3.5" aria-hidden="true" />
                </button>
                <button type="button" disabled={busy || i === batch.length - 1} aria-label={`Move ${f.name} down`} onClick={() => moveBatch(i, i + 1)} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowDown className="size-3.5" aria-hidden="true" />
                </button>
                <button type="button" disabled={busy} aria-label={`Remove ${f.name}`} onClick={() => removeFromBatch(i)} className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
          {phase === "uploading" && (
            <div className="mt-4">
              <Progress value={progress} aria-label="Upload progress" />
              <p role="status" className="mt-2 text-xs text-muted-foreground">Uploading {batch.length} clips — {progress}% complete</p>
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => void startUpload()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {busy ? "Uploading…" : phase === "error" ? "Retry" : "Upload & combine"}
            </Button>
            {busy ? (
              <Button variant="outline" onClick={cancelUpload}>Cancel</Button>
            ) : (
              <Button variant="ghost" onClick={() => { setBatch([]); setPhase("idle"); setError(null); }}>Clear</Button>
            )}
          </div>
        </div>
      )}

      {file && (
        <div className="mt-6 rounded-lg border border-border p-4">
          <div className="flex items-start gap-3">
            <FileVideo className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatSize(file.size)}</p>
            </div>
            {!busy && (
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => {
                  setFile(null);
                  setPhase("idle");
                  setProgress(0);
                  setError(null);
                }}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {phase === "uploading" && (
            <div className="mt-4">
              <Progress value={progress} aria-label="Upload progress" />
              <p role="status" className="mt-2 text-xs text-muted-foreground">
                Uploading — {progress}% complete
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => void startUpload()} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {phase === "uploading" ? "Uploading…" : phase === "error" ? "Retry upload" : "Start upload"}
            </Button>
            {busy && (
              <Button variant="outline" onClick={cancelUpload}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      <section className="mt-8" aria-labelledby="style-heading">
        <h2 id="style-heading" className="text-sm font-medium text-foreground">
          Edit style
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick a template, or let Auto Edit choose one from your footage.
        </p>
        <TemplateLibrary className="mt-3" value={templateId} onChange={(id) => setTemplateId(id)} />

        <Collapsible open={customOpen} onOpenChange={setCustomOpen} className="mt-4 rounded-lg border border-border">
          <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-foreground">
            <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
            Customise
            <span className="ml-auto text-xs text-muted-foreground">
              {[
                options.aspect_ratio,
                options.target_duration ? `${options.target_duration}s` : null,
                options.captions === false ? "no captions" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Template defaults"}
            </span>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform ${customOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-border px-4 py-4">
            <EditOptionsPanel value={options} onChange={setOptions} disabled={busy} />
          </CollapsibleContent>
        </Collapsible>
      </section>

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-sm text-foreground"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          {error}
        </p>
      )}

      {isDemoMode() && (
        <div className="mt-8 rounded-lg border border-border bg-muted/30 p-5">
          <p className="text-sm font-medium text-foreground">No footage handy?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The demo workspace includes sample videos with transcripts, scenes and an AI edit plan, so you can
            see the whole editing flow before uploading anything.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => void navigate({ to: "/videos/$id", params: { id: "vid-founder" } })}>
              Open “Ellis &amp; Co — founder story”
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void navigate({ to: "/videos/$id", params: { id: "vid-field" } })}>
              Open “Field report — day 3”
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
