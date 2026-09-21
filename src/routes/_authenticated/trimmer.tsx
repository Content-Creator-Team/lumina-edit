import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileVideo,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Scissors,
  Trash2,
  UploadCloud,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTimecode } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trimmer")({
  head: () => ({
    meta: [
      { title: "Quick trimmer — Cutroom" },
      {
        name: "description",
        content: "Trim a local video with draggable handles, split points and export-ready cut notes.",
      },
      { property: "og:title", content: "Quick trimmer — Cutroom" },
      {
        property: "og:description",
        content: "Trim a local video with draggable handles, split points and export-ready cut notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrimmerPage,
});

type Segment = {
  id: string;
  start: number;
  end: number;
  trimStart: number;
  trimEnd: number;
  label: string;
};

type HistoryEntry = {
  segments: Segment[];
};

const DEMO_DURATION = 48;
const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/x-matroska", "video/webm"];
const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm"];

function createDemoSegments(): Segment[] {
  return [
    { id: "intro", start: 0, end: 13, trimStart: 1.6, trimEnd: 10.8, label: "Cold open" },
    { id: "middle", start: 13, end: 31, trimStart: 14.2, trimEnd: 27.4, label: "Main beat" },
    { id: "close", start: 31, end: 48, trimStart: 33.2, trimEnd: 44.5, label: "End card" },
  ];
}

function validateVideo(file: File) {
  const name = file.name.toLowerCase();
  const typeOk = ACCEPTED_TYPES.includes(file.type);
  const extOk = ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
  if (!typeOk && !extOk) return "Choose an MP4, MOV, MKV or WebM file.";
  if (file.size === 0) return "That file is empty.";
  return null;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function TrimmerPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(DEMO_DURATION);
  const [currentTime, setCurrentTime] = useState(6.4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [segments, setSegments] = useState<Segment[]>(() => createDemoSegments());
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>("intro");
  const [history, setHistory] = useState<HistoryEntry[]>(() => [{ segments: createDemoSegments() }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [dragging, setDragging] = useState<{
    pointerId: number;
    segmentId: string;
    type: "start" | "end" | "move";
    offset: number;
  } | null>(null);

  const selectedSegment = useMemo(
    () => segments.find((segment) => segment.id === selectedSegmentId) ?? segments[0],
    [segments, selectedSegmentId],
  );

  const keptDuration = useMemo(
    () => segments.reduce((total, segment) => total + Math.max(0, segment.trimEnd - segment.trimStart), 0),
    [segments],
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const canDelete = segments.length > 1;

  useEffect(() => {
    return () => {
      if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (!isPlaying || videoUrl) return;
    const interval = window.setInterval(() => {
      setCurrentTime((time) => (time >= duration ? 0 : Math.min(duration, time + 0.2)));
    }, 200);
    return () => window.clearInterval(interval);
  }, [duration, isPlaying, videoUrl]);

  const commitSegments = useCallback(
    (next: Segment[]) => {
      const ordered = next
        .map((segment) => ({
          ...segment,
          trimStart: clamp(segment.trimStart, segment.start, segment.end - 0.2),
          trimEnd: clamp(segment.trimEnd, segment.start + 0.2, segment.end),
        }))
        .sort((a, b) => a.start - b.start);
      setSegments(ordered);
      setHistory((current) => {
        const base = current.slice(0, historyIndex + 1);
        return [...base, { segments: ordered.map((segment) => ({ ...segment })) }];
      });
      setHistoryIndex((index) => index + 1);
    },
    [historyIndex],
  );

  const setSegmentsLive = useCallback((next: Segment[]) => {
    setSegments(next.sort((a, b) => a.start - b.start));
  }, []);

  function loadDemo() {
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    const timer = window.setInterval(() => {
      setUploadProgress((value) => {
        if (value >= 100) {
          window.clearInterval(timer);
          setUploading(false);
          setFile(null);
          setDuration(DEMO_DURATION);
          const demo = createDemoSegments();
          setSegments(demo);
          setHistory([{ segments: demo.map((segment) => ({ ...segment })) }]);
          setHistoryIndex(0);
          setSelectedSegmentId("intro");
          setCurrentTime(6.4);
          return 100;
        }
        return Math.min(100, value + 14);
      });
    }, 120);
  }

  function selectFile(nextFile: File | null) {
    if (!nextFile) return;
    const validation = validateVideo(nextFile);
    if (validation) {
      setError(validation);
      return;
    }

    setError(null);
    setFile(nextFile);
    setUploading(true);
    setUploadProgress(0);
    setIsPlaying(false);

    if (videoUrl.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    const nextUrl = URL.createObjectURL(nextFile);
    setVideoUrl(nextUrl);

    const timer = window.setInterval(() => {
      setUploadProgress((value) => {
        if (value >= 100) {
          window.clearInterval(timer);
          setUploading(false);
          return 100;
        }
        return Math.min(100, value + Math.round(7 + Math.random() * 10));
      });
    }, 140);
  }

  function handleMetadata() {
    const nextDuration = videoRef.current?.duration;
    if (!nextDuration || Number.isNaN(nextDuration)) return;
    setDuration(nextDuration);
    setCurrentTime(0);
    const initial: Segment = {
      id: "clip-1",
      start: 0,
      end: nextDuration,
      trimStart: 0,
      trimEnd: nextDuration,
      label: file?.name.replace(/\.[^.]+$/, "") || "Selected clip",
    };
    setSegments([initial]);
    setHistory([{ segments: [{ ...initial }] }]);
    setHistoryIndex(0);
    setSelectedSegmentId(initial.id);
  }

  function seek(time: number) {
    const next = clamp(time, 0, duration);
    setCurrentTime(next);
    if (videoRef.current) videoRef.current.currentTime = next;
  }

  function timeFromPointer(clientX: number) {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return currentTime;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * duration;
  }

  function beginDrag(event: React.PointerEvent, segment: Segment, type: "start" | "end" | "move") {
    event.preventDefault();
    event.stopPropagation();
    activePointerRef.current = event.pointerId;
    const time = timeFromPointer(event.clientX);
    setSelectedSegmentId(segment.id);
    setDragging({ pointerId: event.pointerId, segmentId: segment.id, type, offset: time - segment.trimStart });
  }

  function updateDrag(event: React.PointerEvent) {
    if (!dragging || activePointerRef.current !== event.pointerId) return;
    const time = timeFromPointer(event.clientX);
    setSegmentsLive(
      segments.map((segment) => {
        if (segment.id !== dragging.segmentId) return segment;
        if (dragging.type === "start") {
          return { ...segment, trimStart: clamp(time, segment.start, segment.trimEnd - 0.2) };
        }
        if (dragging.type === "end") {
          return { ...segment, trimEnd: clamp(time, segment.trimStart + 0.2, segment.end) };
        }
        const length = segment.trimEnd - segment.trimStart;
        const nextStart = clamp(time - dragging.offset, segment.start, segment.end - length);
        return { ...segment, trimStart: nextStart, trimEnd: nextStart + length };
      }),
    );
  }

  function endDrag(event?: React.PointerEvent) {
    if (event && dragging && event.pointerId !== dragging.pointerId) return;
    activePointerRef.current = null;
    if (dragging) {
      setDragging(null);
      commitSegments(segments);
    }
  }

  function splitAtPlayhead() {
    const segment = segments.find((item) => currentTime > item.start + 0.3 && currentTime < item.end - 0.3);
    if (!segment) return;
    const next = segments.flatMap((item) => {
      if (item.id !== segment.id) return [item];
      return [
        { ...item, id: `${item.id}-a-${Date.now()}`, end: currentTime, trimEnd: Math.min(item.trimEnd, currentTime), label: `${item.label} A` },
        { ...item, id: `${item.id}-b-${Date.now()}`, start: currentTime, trimStart: Math.max(item.trimStart, currentTime), label: `${item.label} B` },
      ];
    });
    setSelectedSegmentId(next.find((item) => item.start === currentTime)?.id ?? selectedSegmentId);
    commitSegments(next);
  }

  function deleteCurrentSegment() {
    if (!selectedSegment || segments.length <= 1) return;
    const next = segments.filter((segment) => segment.id !== selectedSegment.id);
    setSelectedSegmentId(next[0]?.id ?? null);
    commitSegments(next);
  }

  function undo() {
    if (!canUndo) return;
    const entry = history[historyIndex - 1];
    if (!entry) return;
    setHistoryIndex((index) => index - 1);
    setSegments(entry.segments.map((segment) => ({ ...segment })));
  }

  function redo() {
    if (!canRedo) return;
    const entry = history[historyIndex + 1];
    if (!entry) return;
    setHistoryIndex((index) => index + 1);
    setSegments(entry.segments.map((segment) => ({ ...segment })));
  }

  function exportCutList() {
    const payload = {
      name: file?.name ?? "cutroom-demo-reel",
      totalDuration: duration,
      keptDuration,
      segments: segments.map(({ id, label, trimStart, trimEnd }) => ({ id, label, start: trimStart, end: trimEnd })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cutroom-trim-list.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        setIsPlaying((playing) => !playing);
      }
      if (event.key.toLowerCase() === "s" && !modifier) {
        event.preventDefault();
        splitAtPlayhead();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && !modifier) {
        event.preventDefault();
        deleteCurrentSegment();
      }
      if (event.key.toLowerCase() === "z" && modifier && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (event.key.toLowerCase() === "z" && modifier) {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const activeTrimStart = selectedSegment?.trimStart ?? 0;
  const activeTrimEnd = selectedSegment?.trimEnd ?? duration;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">Interactive local tool</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">Quick trimmer</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Bring a local clip in, mark the best section with handles, split beats and export a cut list.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={loadDemo} disabled={uploading}>
            <FileVideo className="size-4" aria-hidden="true" />
            Load demo reel
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            <UploadCloud className="size-4" aria-hidden="true" />
            Choose video
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
        className="sr-only"
        aria-label="Choose a local video file"
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <section
        aria-label="Video import area"
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingOver(false);
          selectFile(event.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "grid gap-6 rounded-lg border border-dashed p-5 transition-colors lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]",
          isDraggingOver ? "border-primary bg-accent/50" : "border-border bg-card",
        )}
      >
        <div className="overflow-hidden rounded-md border border-border bg-background">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls={false}
              className="aspect-video w-full bg-muted object-contain"
              onLoadedMetadata={handleMetadata}
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              aria-label="Selected video preview"
            />
          ) : (
            <div className="relative aspect-video overflow-hidden bg-muted" aria-label="Demo reel preview">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--accent),transparent_32%),linear-gradient(135deg,var(--surface-raised),var(--surface-sunken))]" />
              <div className="absolute inset-x-8 top-8 h-10 rounded-sm border border-border bg-background/60" />
              <div className="absolute bottom-10 left-10 right-10 h-20 rounded-md border border-border bg-card/80 shadow-[var(--shadow-card)]" />
              <div className="absolute left-[20%] top-[28%] h-20 w-28 rotate-[-8deg] rounded-md border border-border bg-background/75" />
              <div className="absolute right-[18%] top-[24%] h-24 w-36 rotate-[7deg] rounded-md border border-border bg-background/75" />
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsPlaying((playing) => !playing)}
                  aria-label={isPlaying ? "Pause demo preview" : "Play demo preview"}
                  className="flex size-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {isPlaying ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-border p-3">
            <Button
              size="icon"
              variant="outline"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={() => {
                if (videoRef.current) {
                  if (videoRef.current.paused) void videoRef.current.play();
                  else videoRef.current.pause();
                } else {
                  setIsPlaying((playing) => !playing);
                }
              }}
            >
              {isPlaying ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            </Button>
            <div className="min-w-0 flex-1">
              <Slider
                value={[currentTime]}
                min={0}
                max={duration || 1}
                step={0.1}
                aria-label="Preview time"
                onValueChange={(value) => seek(value[0] ?? 0)}
              />
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {formatTimecode(currentTime)} / {formatTimecode(duration)}
            </span>
          </div>
        </div>

        <aside className="flex flex-col justify-between gap-5">
          <div>
            <h2 className="text-sm font-medium text-foreground">Current source</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {file ? `${file.name} · ${formatSize(file.size)}` : "Demo reel loaded locally for preview."}
            </p>
            {error && <p role="alert" className="mt-3 rounded-md border border-destructive/40 p-3 text-sm text-foreground">{error}</p>}
            {uploading && (
              <div className="mt-4">
                <Progress value={uploadProgress} aria-label="Import progress" />
                <p role="status" className="mt-2 text-xs text-muted-foreground">
                  Preparing editor — {uploadProgress}%
                </p>
              </div>
            )}
          </div>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="Segments" value={String(segments.length)} />
            <Stat label="Kept" value={formatTimecode(keptDuration)} />
            <Stat label="Zoom" value={`${Math.round(zoomLevel * 100)}%`} />
          </dl>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={undo} disabled={!canUndo}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Undo
            </Button>
            <Button variant="outline" onClick={redo} disabled={!canRedo}>
              <RotateCw className="size-4" aria-hidden="true" />
              Redo
            </Button>
            <Button variant="outline" onClick={splitAtPlayhead}>
              <Scissors className="size-4" aria-hidden="true" />
              Split
            </Button>
            <Button variant="outline" onClick={deleteCurrentSegment} disabled={!canDelete}>
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </aside>
      </section>

      <section className="rounded-lg border border-border bg-card p-4" aria-label="Trim timeline">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-foreground">Timeline</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Drag handles to trim. Drag a selected segment body to move its kept range.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" aria-label="Zoom out" onClick={() => setZoomLevel((value) => Math.max(0.75, value / 1.25))}>
                  <ZoomOut className="size-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" aria-label="Zoom in" onClick={() => setZoomLevel((value) => Math.min(3, value * 1.25))}>
                  <ZoomIn className="size-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
            <Button onClick={exportCutList}>
              <Download className="size-4" aria-hidden="true" />
              Export cut list
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-border bg-background p-3">
          <div className="min-w-full" style={{ width: `${zoomLevel * 100}%` }}>
            <div className="grid grid-cols-12 gap-px overflow-hidden rounded-sm border border-border bg-border" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, index) => (
                <span
                  key={index}
                  className="h-12 bg-muted"
                  style={{ opacity: 0.55 + (index % 3) * 0.12 }}
                />
              ))}
            </div>

            <div
              ref={timelineRef}
              role="group"
              aria-label="Editable trim timeline"
              className="relative mt-3 h-20 select-none rounded-md bg-muted"
              onPointerMove={updateDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onClick={(event) => seek(timeFromPointer(event.clientX))}
            >
              {segments.map((segment) => {
                const selected = segment.id === selectedSegmentId;
                const baseLeft = (segment.start / duration) * 100;
                const baseWidth = ((segment.end - segment.start) / duration) * 100;
                const keepLeft = (segment.trimStart / duration) * 100;
                const keepWidth = ((segment.trimEnd - segment.trimStart) / duration) * 100;
                return (
                  <div key={segment.id}>
                    <button
                      type="button"
                      aria-label={`${segment.label}, source range ${formatTimecode(segment.start)} to ${formatTimecode(segment.end)}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedSegmentId(segment.id);
                        seek(segment.trimStart);
                      }}
                      className={cn(
                        "absolute top-3 h-14 rounded-sm border border-border bg-background/70 text-left text-xs text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        selected && "border-primary text-foreground",
                      )}
                      style={{ left: `${baseLeft}%`, width: `${baseWidth}%` }}
                    >
                      <span className="block truncate px-2 py-1">{segment.label}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Move kept range for ${segment.label}`}
                      onPointerDown={(event) => beginDrag(event, segment, "move")}
                      className={cn(
                        "absolute top-6 flex h-8 items-center justify-center rounded-sm border border-primary bg-primary/25 text-[11px] font-medium text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        selected && "bg-primary/35",
                      )}
                      style={{ left: `${keepLeft}%`, width: `${Math.max(1.5, keepWidth)}%` }}
                    >
                      <span className="truncate px-2">Keep</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Adjust start for ${segment.label}`}
                      onPointerDown={(event) => beginDrag(event, segment, "start")}
                      className="absolute top-4 h-12 w-3 -translate-x-1/2 rounded-sm border border-primary bg-background text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      style={{ left: `${keepLeft}%` }}
                    >
                      <ChevronLeft className="size-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Adjust end for ${segment.label}`}
                      onPointerDown={(event) => beginDrag(event, segment, "end")}
                      className="absolute top-4 h-12 w-3 -translate-x-1/2 rounded-sm border border-primary bg-background text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      style={{ left: `${(segment.trimEnd / duration) * 100}%` }}
                    >
                      <ChevronRight className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 h-full w-0.5 bg-foreground"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
              <span>{formatTimecode(0)}</span>
              <span>{formatTimecode(duration)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Selected segment</h2>
          {selectedSegment ? (
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="text-muted-foreground">Label</span>
                <input
                  value={selectedSegment.label}
                  onChange={(event) => {
                    const next = segments.map((segment) =>
                      segment.id === selectedSegment.id ? { ...segment, label: event.target.value } : segment,
                    );
                    setSegmentsLive(next);
                  }}
                  onBlur={() => commitSegments(segments)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="In" value={formatTimecode(activeTrimStart)} />
                <Stat label="Out" value={formatTimecode(activeTrimEnd)} />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Choose a segment from the timeline.</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Cut list</h2>
          <div className="mt-4 divide-y divide-border rounded-md border border-border">
            {segments.map((segment) => (
              <button
                key={segment.id}
                type="button"
                onClick={() => {
                  setSelectedSegmentId(segment.id);
                  seek(segment.trimStart);
                }}
                className={cn(
                  "grid w-full grid-cols-[1fr_auto] gap-4 px-4 py-3 text-left text-sm transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  segment.id === selectedSegmentId && "bg-accent text-accent-foreground",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{segment.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Source {formatTimecode(segment.start)}–{formatTimecode(segment.end)}
                  </span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTimecode(segment.trimStart)}–{formatTimecode(segment.trimEnd)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-sm text-foreground">{value}</dd>
    </div>
  );
}