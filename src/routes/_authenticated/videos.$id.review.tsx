import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Lock,
  Save,
  Scissors,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PlanTimeline } from "@/components/app/plan-timeline";
import { ErrorState, LoadingState } from "@/components/app/query-states";
import { RevisionPrompt } from "@/components/app/revision-prompt";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import type { EditPlan, PlanSegment, Scene } from "@/lib/api-types";
import {
  editPlanQuery,
  formatTimecode,
  scenesQuery,
  transcriptQuery,
  videoQuery,
} from "@/lib/queries";
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

function sceneBoundsFor(segment: PlanSegment, scenes: Scene[]) {
  const scene =
    scenes.find((candidate) => candidate.id && candidate.id === segment.scene_id) ??
    scenes.find((candidate) => segment.start >= candidate.start && segment.start < candidate.end);
  return scene ? { min: scene.start, max: scene.end } : null;
}

function ReviewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // Load the plan into a local draft; edits are batched until "Save changes".
  useEffect(() => {
    if (plan.data && plan.data.id !== baselinePlanId) {
      setDraft(plan.data.segments.map((segment) => ({ ...segment })));
      setBaselinePlanId(plan.data.id);
    }
  }, [plan.data, baselinePlanId]);

  const isDraftPlan = String(plan.data?.status ?? "").toUpperCase() === "DRAFT";

  const dirtySegments = useMemo(() => {
    if (!plan.data) return [];
    const original = new Map(plan.data.segments.map((segment) => [segment.id, segment]));
    return draft.filter((segment) => {
      const base = original.get(segment.id);
      if (!base) return true;
      return (
        base.start !== segment.start ||
        base.end !== segment.end ||
        base.action !== segment.action ||
        (base.caption ?? "") !== (segment.caption ?? "") ||
        (base.text_overlay ?? "") !== (segment.text_overlay ?? "")
      );
    });
  }, [draft, plan.data]);

  const isDirty = dirtySegments.length > 0;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const save = useMutation({
    mutationFn: async () => {
      if (!plan.data) throw new Error("No plan loaded.");
      return api.patchPlan(plan.data.id, {
        segments: dirtySegments.map((segment) => ({
          id: segment.id,
          start: segment.start,
          end: segment.end,
          action: segment.action === "cut" ? "cut" : "keep",
          caption: segment.caption ?? null,
          text_overlay: segment.text_overlay ?? null,
        })),
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["edit-plan", id], updated);
      setDraft(updated.segments.map((segment) => ({ ...segment })));
    },
  });

  const approve = useMutation({
    mutationFn: async () => {
      if (!plan.data) throw new Error("No plan loaded.");
      return api.approvePlan(plan.data.id);
    },
    onSuccess: (result) => {
      const job = result.render_job_id ?? result.job_id ?? result.id ?? undefined;
      void queryClient.invalidateQueries({ queryKey: ["video", id] });
      navigate({
        to: "/videos/$id/render",
        params: { id },
        search: job ? { job } : {},
      });
    },
  });

  function updateSegment(segmentId: string, patch: Partial<PlanSegment>) {
    setDraft((current) =>
      current.map((segment) => (segment.id === segmentId ? { ...segment, ...patch } : segment)),
    );
  }

  function seek(time: number) {
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
  }

  function applyRevision(next: EditPlan) {
    queryClient.setQueryData(["edit-plan", id], next);
    void queryClient.invalidateQueries({ queryKey: ["edit-plans", id] });
    setBaselinePlanId(null);
    setRevisionBanner(next.revision_instruction ?? null);
  }

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
        </div>
      </div>

      {revisionBanner && (
        <div role="status" className="mt-4 rounded-md border border-border p-4 text-sm">
          <p className="text-foreground">A new plan version was created from your instruction:</p>
          <blockquote className="mt-2 border-l-2 border-border pl-3 text-muted-foreground">
            “{revisionBanner}”
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
          approved plans are immutable so renders stay reproducible. Use the revision prompt below to
          create a new version instead.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div>
            {video.data.playback_url ? (
              <video
                ref={videoRef}
                controls
                preload="metadata"
                src={video.data.playback_url}
                aria-label={`Playback for ${video.data.filename ?? "this video"}`}
                onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
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
                duration={duration || video.data.duration || 0}
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

          <section aria-labelledby="segments-heading">
            <h2 id="segments-heading" className="text-sm font-medium">
              Segments
            </h2>
            <ul className="mt-3 space-y-3">
              {draft.map((segment) => {
                const keep = segment.action !== "cut";
                const bounds = sceneBoundsFor(segment, scenes.data ?? []);
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
                          <img src={segment.thumbnail_url} alt="" loading="lazy" className="size-full object-cover" />
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
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-xs text-muted-foreground">
                            Trim start
                            <input
                              type="range"
                              className="mt-1 w-full accent-[var(--color-primary)]"
                              min={bounds?.min ?? 0}
                              max={Math.max(bounds?.min ?? 0, segment.end - 0.1)}
                              step={0.1}
                              value={segment.start}
                              disabled={!isDraftPlan}
                              aria-label={`Trim start of segment beginning ${formatTimecode(segment.start)}`}
                              aria-valuetext={formatTimecode(segment.start)}
                              onChange={(event) =>
                                updateSegment(segment.id, { start: Number(event.target.value) })
                              }
                            />
                          </label>
                          <label className="block text-xs text-muted-foreground">
                            Trim end
                            <input
                              type="range"
                              className="mt-1 w-full accent-[var(--color-primary)]"
                              min={Math.min(segment.start + 0.1, bounds?.max ?? segment.end)}
                              max={bounds?.max ?? Math.max(duration, segment.end)}
                              step={0.1}
                              value={segment.end}
                              disabled={!isDraftPlan}
                              aria-label={`Trim end of segment ending ${formatTimecode(segment.end)}`}
                              aria-valuetext={formatTimecode(segment.end)}
                              onChange={(event) =>
                                updateSegment(segment.id, { end: Number(event.target.value) })
                              }
                            />
                          </label>
                        </div>
                        {bounds && (
                          <p className="text-[11px] text-muted-foreground">
                            Constrained to its scene: {formatTimecode(bounds.min)} –{" "}
                            {formatTimecode(bounds.max)}
                          </p>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-xs text-muted-foreground">
                            Caption
                            <Input
                              className="mt-1"
                              value={segment.caption ?? ""}
                              disabled={!isDraftPlan}
                              onChange={(event) =>
                                updateSegment(segment.id, { caption: event.target.value })
                              }
                            />
                          </label>
                          <label className="block text-xs text-muted-foreground">
                            Text overlay
                            <Input
                              className="mt-1"
                              value={segment.text_overlay ?? ""}
                              disabled={!isDraftPlan}
                              onChange={(event) =>
                                updateSegment(segment.id, { text_overlay: event.target.value })
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

          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
            <Button onClick={() => save.mutate()} disabled={!isDirty || !isDraftPlan || save.isPending}>
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
              {approve.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Approve &amp; render
            </Button>
            <span role="status" className="text-xs text-muted-foreground">
              {save.isSuccess && !isDirty
                ? "All changes saved."
                : isDirty
                  ? `${dirtySegments.length} unsaved change${dirtySegments.length === 1 ? "" : "s"}`
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
                  <ErrorState error={transcript.error} onRetry={() => void transcript.refetch()} />
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
                        onClick={() => setTranscriptPage((page) => page - 1)}
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
                        onClick={() => setTranscriptPage((page) => page + 1)}
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
