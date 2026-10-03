import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Lock,
  RotateCcw,
  RotateCw,
  Save,
  Scissors,
  Star,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PlanTimeline } from "@/components/app/plan-timeline";
import { ErrorState, LoadingState } from "@/components/app/query-states";
import { RevisionPrompt } from "@/components/app/revision-prompt";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import type { EditPlan, PlanSegment, PlanSegmentAction, Scene } from "@/lib/api-types";
import {
  editPlanQuery,
  formatTimecode,
  scenesQuery,
  transcriptQuery,
  videoQuery,
} from "@/lib/queries";
import { isDemoMode } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/videos/$id/review")({
  head: () => ({
    meta: [
      { title: "Review edit plan — Cutroom" },
      { name: "description", content: "Review, trim and approve the AI-generated edit plan." },
      { property: "og:title", content: "Review edit plan — Cutroom" },
      { property: "og:description", content: "Review, trim and approve the AI-generated edit plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

const TRANSCRIPT_PAGE_SIZE = 40;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function sceneBoundsFor(segment: PlanSegment, scenes: Scene[]) {
  const scene =
    scenes.find((c) => c.id && c.id === segment.scene_id) ??
    scenes.find((c) => segment.start >= c.start && segment.start < c.end);
  return scene ? { min: scene.start, max: scene.end } : null;
}

function ReviewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number | null>(null);

  const video = useQuery(videoQuery(id));
  const plan = useQuery(editPlanQuery(id));
  const scenes = useQuery(scenesQuery(id));
  const transcript = useQuery(transcriptQuery(id));

  const [draft, setDraft] = useState<PlanSegment[]>([]);
  const [baselinePlanId, setBaselinePlanId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [transcriptPage, setTranscriptPage] = useState(0);
  const [revisionBanner, setRevisionBanner] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dragging, setDragging] = useState<{
    pointerId: number;
    segmentId: string;
    type: "start" | "end";
  } | null>(null);
  const [history, setHistory] = useState<PlanSegment[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Initialize draft + history when plan first loads or a revision arrives.
  useEffect(() => {
    if (plan.data && plan.data.id !== baselinePlanId) {
      const initial = plan.data.segments.map((s) => ({ ...s }));
      setDraft(initial);
      setHistory([initial]);
      setHistoryIndex(0);
      setBaselinePlanId(plan.data.id);
    }
  }, [plan.data, baselinePlanId]);

  const isDraftPlan = String(plan.data?.status ?? "").toUpperCase() === "DRAFT";
  const totalDuration = duration || video.data?.duration || 0;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const isDirty = useMemo(() => {
    if (!plan.data) return false;
    const originalIds = new Set(plan.data.segments.map((s) => s.id));
    const draftIds = new Set(draft.map((s) => s.id));
    if (plan.data.segments.some((s) => !draftIds.has(s.id))) return true;
    if (draft.some((s) => !originalIds.has(s.id))) return true;
    const origMap = new Map(plan.data.segments.map((s) => [s.id, s]));
    return draft.some((s) => {
      const base = origMap.get(s.id);
      if (!base) return true;
      return (
        base.start !== s.start ||
        base.end !== s.end ||
        base.action !== s.action ||
        (base.caption ?? "") !== (s.caption ?? "") ||
        (base.text_overlay ?? "") !== (s.text_overlay ?? "")
      );
    });
  }, [draft, plan.data]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function commitDraft(next: PlanSegment[]) {
    const ordered = [...next].sort((a, b) => a.start - b.start);
    setDraft(ordered);
    setHistory((h) => {
      const base = h.slice(0, historyIndex + 1);
      return [...base, ordered.map((s) => ({ ...s }))];
    });
    setHistoryIndex((i) => i + 1);
  }

  function undo() {
    if (!canUndo) return;
    const entry = history[historyIndex - 1];
    if (!entry) return;
    setHistoryIndex((i) => i - 1);
    setDraft(entry.map((s) => ({ ...s })));
  }

  function redo() {
    if (!canRedo) return;
    const entry = history[historyIndex + 1];
    if (!entry) return;
    setHistoryIndex((i) => i + 1);
    setDraft(entry.map((s) => ({ ...s })));
  }

  function seek(time: number) {
    const t = clamp(time, 0, totalDuration);
    setCurrentTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }

  function timeFromPointer(clientX: number) {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || totalDuration === 0) return currentTime;
    return clamp((clientX - rect.left) / rect.width, 0, 1) * totalDuration;
  }

  function beginDrag(e: React.PointerEvent, segId: string, type: "start" | "end") {
    if (!isDraftPlan) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerRef.current = e.pointerId;
    setSelectedSegmentId(segId);
    setDragging({ pointerId: e.pointerId, segmentId: segId, type });
  }

  function updateDrag(e: React.PointerEvent) {
    if (!dragging || activePointerRef.current !== e.pointerId) return;
    const time = timeFromPointer(e.clientX);
    setDraft((prev) =>
      prev.map((s) => {
        if (s.id !== dragging.segmentId) return s;
        const bounds = sceneBoundsFor(s, scenes.data ?? []);
        if (dragging.type === "start") {
          return { ...s, start: clamp(time, bounds?.min ?? 0, s.end - 0.1) };
        }
        return { ...s, end: clamp(time, s.start + 0.1, bounds?.max ?? totalDuration) };
      }),
    );
  }

  function endDrag(e?: React.PointerEvent) {
    if (e && dragging && e.pointerId !== dragging.pointerId) return;
    activePointerRef.current = null;
    if (dragging) {
      setDragging(null);
      commitDraft(draft);
    }
  }

  function splitAtPlayhead() {
    if (!isDraftPlan) return;
    const seg = draft.find((s) => currentTime > s.start + 0.2 && currentTime < s.end - 0.2);
    if (!seg) return;
    const ts = Date.now();
    const a: PlanSegment = { ...seg, id: `split-${ts}-a`, end: currentTime };
    const b: PlanSegment = { ...seg, id: `split-${ts}-b`, start: currentTime };
    commitDraft(draft.flatMap((s) => (s.id === seg.id ? [a, b] : [s])));
    setSelectedSegmentId(b.id);
  }

  function deleteSegment(segId: string) {
    if (!isDraftPlan || draft.length <= 1) return;
    const next = draft.filter((s) => s.id !== segId);
    if (selectedSegmentId === segId) setSelectedSegmentId(next[0]?.id ?? null);
    commitDraft(next);
  }

  function updateSegment(segId: string, patch: Partial<PlanSegment>) {
    setDraft((prev) => prev.map((s) => (s.id === segId ? { ...s, ...patch } : s)));
  }

  function applyRevision(next: EditPlan) {
    queryClient.setQueryData(["edit-plan", id], next);
    void queryClient.invalidateQueries({ queryKey: ["edit-plans", id] });
    setBaselinePlanId(null);
    setRevisionBanner(next.revision_instruction ?? null);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!plan.data) throw new Error("No plan loaded.");
      const original = plan.data.segments;
      const originalIds = new Set(original.map((s) => s.id));
      const draftIds = new Set(draft.map((s) => s.id));
      const origMap = new Map(original.map((s) => [s.id, s]));

      const segments = draft
        .filter((s) => originalIds.has(s.id))
        .filter((s) => {
          const base = origMap.get(s.id)!;
          return (
            base.start !== s.start ||
            base.end !== s.end ||
            base.action !== s.action ||
            (base.caption ?? "") !== (s.caption ?? "") ||
            (base.text_overlay ?? "") !== (s.text_overlay ?? "")
          );
        })
        .map((s) => ({
          id: s.id,
          start_ts: s.start,
          end_ts: s.end,
          action: s.action as PlanSegmentAction,
          caption: s.caption ?? null,
          text_overlay: s.text_overlay ?? null,
          order: draft.indexOf(s),
        }));

      const create = draft
        .filter((s) => !originalIds.has(s.id))
        .map((s) => ({
          scene_id: s.scene_id ?? original[0]?.scene_id ?? "",
          action: (s.action as PlanSegmentAction) ?? "keep",
          start_ts: s.start,
          end_ts: s.end,
          caption: s.caption ?? null,
          text_overlay: s.text_overlay ?? null,
          order: draft.indexOf(s),
        }));

      const delete_ids = original.filter((s) => !draftIds.has(s.id)).map((s) => s.id);

      return api.patchPlan(plan.data.id, { segments, create, delete_ids });
    },
    onSuccess: () => {
      posthog.capture("edit_plan_saved", { segment_count: draft.length });
      void queryClient.invalidateQueries({ queryKey: ["edit-plan", id] });
      // Reset baseline so useEffect re-initializes draft from fresh server data.
      setBaselinePlanId(null);
    },
  });

  const approve = useMutation({
    mutationFn: async () => {
      if (!plan.data) throw new Error("No plan loaded.");
      return api.approvePlan(plan.data.id);
    },
    onSuccess: (result) => {
      posthog.capture("edit_plan_approved", { segment_count: draft.length });
      const job = result.render_job_id ?? result.job_id ?? result.id ?? undefined;
      void queryClient.invalidateQueries({ queryKey: ["video", id] });
      navigate({
        to: "/videos/$id/render",
        params: { id },
        search: job ? { job } : {},
      });
    },
  });

  // Keyboard shortcuts — no dep array so closure is always fresh.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "s" && !mod) {
        e.preventDefault();
        splitAtPlayhead();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !mod) {
        e.preventDefault();
        if (selectedSegmentId) deleteSegment(selectedSegmentId);
      }
      if (e.key.toLowerCase() === "z" && mod && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === "z" && mod) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (video.isPending || plan.isPending) return <LoadingState label="Loading the edit plan…" />;
  if (video.isError) return <ErrorState error={video.error} onRetry={() => void video.refetch()} />;
  if (plan.isError) return <ErrorState error={plan.error} onRetry={() => void plan.refetch()} />;

  const transcriptSegments = transcript.data?.segments ?? [];
  const pageCount = Math.max(1, Math.ceil(transcriptSegments.length / TRANSCRIPT_PAGE_SIZE));
  const pagedTranscript = transcriptSegments.slice(
    transcriptPage * TRANSCRIPT_PAGE_SIZE,
    (transcriptPage + 1) * TRANSCRIPT_PAGE_SIZE,
  );

  return (
    <div className="min-w-[1000px] lg:min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/videos/$id"
            params={{ id }}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            ← Back to video
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">Review edit plan</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={String(plan.data.status).toLowerCase()} />
          <span className="text-sm text-muted-foreground">Version {plan.data.version ?? "—"}</span>
          <Button asChild variant="ghost" size="sm">
            <Link to="/videos/$id/versions" params={{ id }}>
              Version history
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/editor/$videoId" params={{ videoId: id }}>
              Open editor
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/videos/$id/thumbnails" params={{ id }}>
              Thumbnails
            </Link>
          </Button>
        </div>
      </div>

      {revisionBanner && (
        <div role="status" className="mt-4 rounded-md border border-border p-4 text-sm">
          <p className="text-foreground">A new plan version was created from your instruction:</p>
          <blockquote className="mt-2 border-l-2 border-border pl-3 text-muted-foreground">
            "{revisionBanner}"
          </blockquote>
          <Button asChild variant="link" className="mt-1 h-auto p-0 text-sm">
            <Link to="/videos/$id/versions" params={{ id }}>
              Compare with previous versions
            </Link>
          </Button>
        </div>
      )}

      {!isDraftPlan && (
        <p className="mt-4 flex items-start gap-2 rounded-md border border-border p-4 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This plan is {String(plan.data.status).toLowerCase()} and can no longer be edited —
          approved plans are immutable so renders stay reproducible. Use the revision prompt below
          to create a new version instead.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">

          {/* ── Video player + scene overview ── */}
          <div>
            {video.data.playback_url ? (
              <video
                ref={videoRef}
                controls
                preload="metadata"
                src={video.data.playback_url}
                aria-label={`Playback for ${video.data.filename ?? "this video"}`}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                className="w-full rounded-lg border border-border bg-black"
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-8 text-center text-sm text-muted-foreground">
                <span>A playback URL isn't available for this video yet.</span>
                {isDemoMode() && (
                  <span className="max-w-md text-xs leading-relaxed">
                    The demo workspace ships no media files, so the plan, timeline and transcript
                    below stay fully interactive while the player waits for a real presigned URL
                    from the backend.
                  </span>
                )}
              </div>
            )}

            <div className="mt-4">
              <PlanTimeline
                duration={totalDuration}
                currentTime={currentTime}
                scenes={scenes.data ?? []}
                segments={draft}
                events={plan.data.events ?? []}
                selectedSegmentId={selectedSegmentId}
                onSeek={seek}
                onSelectSegment={setSelectedSegmentId}
              />
            </div>
          </div>

          {/* ── Interactive trim timeline ── */}
          <section className="rounded-lg border border-border bg-card p-4" aria-label="Trim editor">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-foreground">Trim editor</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Drag handles to trim ·{" "}
                  <kbd className="rounded border border-border px-1 font-mono text-[10px]">S</kbd>{" "}
                  split at playhead ·{" "}
                  <kbd className="rounded border border-border px-1 font-mono text-[10px]">Del</kbd>{" "}
                  remove selected
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Zoom out"
                      onClick={() => setZoomLevel((v) => Math.max(0.75, v / 1.25))}
                    >
                      <ZoomOut className="size-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom out</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Zoom in"
                      onClick={() => setZoomLevel((v) => Math.min(4, v * 1.25))}
                    >
                      <ZoomIn className="size-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom in</TooltipContent>
                </Tooltip>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!isDraftPlan}
                  onClick={splitAtPlayhead}
                >
                  <Scissors className="size-4" aria-hidden="true" />
                  Split
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Undo"
                      disabled={!canUndo}
                      onClick={undo}
                    >
                      <RotateCcw className="size-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="Redo"
                      disabled={!canRedo}
                      onClick={redo}
                    >
                      <RotateCw className="size-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-md border border-border bg-background p-3">
              <div className="min-w-full" style={{ width: `${zoomLevel * 100}%` }}>
                <div
                  ref={timelineRef}
                  role="group"
                  aria-label="Editable trim timeline"
                  className="relative h-20 select-none rounded-md bg-muted"
                  onPointerMove={updateDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onClick={(e) => {
                    if (!dragging) seek(timeFromPointer(e.clientX));
                  }}
                >
                  {totalDuration > 0 &&
                    draft.map((seg) => {
                      const selected = seg.id === selectedSegmentId;
                      const keep = seg.action !== "cut";
                      const bounds = sceneBoundsFor(seg, scenes.data ?? []);
                      const srcMin = bounds?.min ?? seg.start;
                      const srcMax = bounds?.max ?? seg.end;
                      const srcLeft = (srcMin / totalDuration) * 100;
                      const srcWidth = ((srcMax - srcMin) / totalDuration) * 100;
                      const keepLeft = (seg.start / totalDuration) * 100;
                      const keepWidth = Math.max(
                        1.2,
                        ((seg.end - seg.start) / totalDuration) * 100,
                      );

                      return (
                        <div key={seg.id}>
                          {/* scene source range */}
                          <div
                            aria-hidden="true"
                            className="absolute top-2 h-16 rounded-sm border border-border/40 bg-background/30"
                            style={{ left: `${srcLeft}%`, width: `${srcWidth}%` }}
                          />
                          {/* kept/cut range bar */}
                          <button
                            type="button"
                            aria-label={`${keep ? "Keep" : "Cut"}: ${formatTimecode(seg.start)}–${formatTimecode(seg.end)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSegmentId(seg.id);
                              seek(seg.start);
                            }}
                            className={cn(
                              "absolute top-5 flex h-10 items-center justify-center rounded-sm border text-[10px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                              keep
                                ? "border-primary bg-primary/20 text-foreground"
                                : "border-destructive/50 bg-destructive/10 text-muted-foreground",
                              selected && keep && "bg-primary/35",
                              selected && !keep && "bg-destructive/25",
                            )}
                            style={{ left: `${keepLeft}%`, width: `${keepWidth}%` }}
                          >
                            <span className="truncate px-1">{keep ? "Keep" : "Cut"}</span>
                          </button>
                          {/* start handle */}
                          {isDraftPlan && (
                            <button
                              type="button"
                              aria-label={`Trim start at ${formatTimecode(seg.start)}`}
                              onPointerDown={(e) => beginDrag(e, seg.id, "start")}
                              className={cn(
                                "absolute top-3 h-14 w-3 -translate-x-1/2 cursor-col-resize rounded-sm border border-primary bg-background text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                                selected && "bg-primary/20",
                              )}
                              style={{ left: `${keepLeft}%` }}
                            >
                              <ChevronLeft className="size-3" aria-hidden="true" />
                            </button>
                          )}
                          {/* end handle */}
                          {isDraftPlan && (
                            <button
                              type="button"
                              aria-label={`Trim end at ${formatTimecode(seg.end)}`}
                              onPointerDown={(e) => beginDrag(e, seg.id, "end")}
                              className={cn(
                                "absolute top-3 h-14 w-3 -translate-x-1/2 cursor-col-resize rounded-sm border border-primary bg-background text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                                selected && "bg-primary/20",
                              )}
                              style={{ left: `${(seg.end / totalDuration) * 100}%` }}
                            >
                              <ChevronRight className="size-3" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  {/* playhead */}
                  {totalDuration > 0 && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 h-full w-0.5 bg-foreground/70"
                      style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                    />
                  )}
                </div>
                <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
                  <span>{formatTimecode(0)}</span>
                  <span>{formatTimecode(totalDuration)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Segment cards ── */}
          <section aria-labelledby="segments-heading">
            <h2 id="segments-heading" className="text-sm font-medium">
              Segments
            </h2>
            <ul className="mt-3 space-y-3">
              {draft.map((segment) => {
                const keep = segment.action !== "cut";
                return (
                  <li
                    key={segment.id}
                    className={cn(
                      "rounded-lg border border-border p-4",
                      selectedSegmentId === segment.id && "ring-2 ring-ring",
                    )}
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSegmentId(segment.id);
                          seek(segment.start);
                        }}
                        aria-label={`Play from ${formatTimecode(segment.start)}`}
                        className="h-14 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {segment.thumbnail_url ? (
                          <img
                            src={segment.thumbnail_url}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center font-mono text-[11px] text-muted-foreground">
                            {formatTimecode(segment.start)}
                          </span>
                        )}
                      </button>

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatTimecode(segment.start)} – {formatTimecode(segment.end)}
                          </span>
                          <Button
                            size="sm"
                            variant={keep ? "default" : "outline"}
                            disabled={!isDraftPlan}
                            aria-pressed={keep}
                            onClick={() =>
                              updateSegment(segment.id, { action: keep ? "cut" : "keep" })
                            }
                          >
                            {keep ? (
                              <Star className="size-3.5" aria-hidden="true" />
                            ) : (
                              <Scissors className="size-3.5" aria-hidden="true" />
                            )}
                            {keep ? "Keeping" : "Cutting"}
                          </Button>
                          {isDraftPlan && draft.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteSegment(segment.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-xs text-muted-foreground">
                            Caption
                            <Input
                              className="mt-1"
                              value={segment.caption ?? ""}
                              disabled={!isDraftPlan}
                              onChange={(e) =>
                                updateSegment(segment.id, { caption: e.target.value })
                              }
                            />
                          </label>
                          <label className="block text-xs text-muted-foreground">
                            Text overlay
                            <Input
                              className="mt-1"
                              value={segment.text_overlay ?? ""}
                              disabled={!isDraftPlan}
                              onChange={(e) =>
                                updateSegment(segment.id, { text_overlay: e.target.value })
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ── Action bar ── */}
          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
            <Button
              onClick={() => save.mutate()}
              disabled={!isDirty || !isDraftPlan || save.isPending}
            >
              {save.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              {save.isPending ? "Saving changes…" : "Save changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => approve.mutate()}
              disabled={!isDraftPlan || isDirty || approve.isPending}
            >
              {approve.isPending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              Approve &amp; render
            </Button>
            <span role="status" className="text-xs text-muted-foreground">
              {save.isSuccess && !isDirty
                ? "All changes saved."
                : isDirty
                  ? "Unsaved changes"
                  : "No unsaved changes."}
            </span>
            {(save.isError || approve.isError) && (
              <p role="alert" className="w-full text-sm text-destructive">
                {((save.error ?? approve.error) as Error).message}
              </p>
            )}
          </div>

          <RevisionPrompt
            videoId={id}
            planId={plan.data.id}
            disabled={isDirty}
            onRevised={applyRevision}
          />
          {isDirty && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="size-3.5" aria-hidden="true" />
              Save or discard your edits before requesting a revision.
            </p>
          )}
        </div>

        {/* ── Transcript sidebar ── */}
        <aside aria-labelledby="transcript-heading" className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setTranscriptOpen((open) => !open)}
              aria-expanded={transcriptOpen}
              className="flex w-full items-center justify-between p-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span id="transcript-heading" className="text-sm font-medium">
                Transcript
              </span>
              <span className="text-xs text-muted-foreground">
                {transcriptOpen ? "Hide" : "Show"}
              </span>
            </button>

            {transcriptOpen && (
              <div className="border-t border-border p-2">
                {transcript.isPending ? (
                  <LoadingState label="Loading transcript…" />
                ) : transcript.isError ? (
                  <ErrorState
                    error={transcript.error}
                    onRetry={() => void transcript.refetch()}
                  />
                ) : transcriptSegments.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    No transcript is available for this video.
                  </p>
                ) : (
                  <>
                    <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
                      {pagedTranscript.map((line, index) => (
                        <li key={`${line.start}-${index}`}>
                          <button
                            type="button"
                            onClick={() => seek(line.start)}
                            className="w-full rounded-md p-2 text-left text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {formatTimecode(line.start)}
                            </span>
                            <span className="ml-2 text-foreground">{line.text}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between p-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={transcriptPage === 0}
                        onClick={() => setTranscriptPage((p) => p - 1)}
                      >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {transcriptPage + 1} of {pageCount}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={transcriptPage >= pageCount - 1}
                        onClick={() => setTranscriptPage((p) => p + 1)}
                      >
                        Next
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
