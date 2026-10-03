import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileVideo, Loader2, UploadCloud, X } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ApiError, uploadVideoFile } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload footage — Cutroom" },
      { name: "description", content: "Upload MP4, MOV or MKV footage for AI-assisted editing." },
      { property: "og:title", content: "Upload footage — Cutroom" },
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
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function selectFile(next: File | null) {
    if (!next) return;
    const problem = validate(next);
    setError(problem);
    setPhase(problem ? "error" : "idle");
    setProgress(0);
    setFile(problem ? null : next);
  }

  async function startUpload() {
    if (!file) return;
    setError(null);
    setProgress(0);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      setPhase("uploading");
      const videoId = await uploadVideoFile(file, setProgress, ctrl.signal);
      posthog.capture("video_uploaded", {
        file_extension: file.name.split(".").pop()?.toLowerCase() ?? "unknown",
        file_size_mb: Math.round(file.size / 1024 ** 2),
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
          if (!busy) selectFile(event.dataTransfer.files?.[0] ?? null);
        }}
        className={`mt-8 rounded-lg border border-dashed p-10 text-center transition-colors ${
          dragging ? "border-primary bg-accent/50" : "border-border"
        }`}
      >
        <UploadCloud className="mx-auto size-7 text-muted-foreground" aria-hidden="true" strokeWidth={1.5} />
        <p className="mt-4 text-sm text-foreground">Drag a video here, or choose a file</p>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-matroska,.mp4,.mov,.mkv"
          className="sr-only"
          aria-label="Choose a video file to upload"
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
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

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-sm text-foreground"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
