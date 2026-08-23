import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, CircleDashed, Loader2 } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/app/query-states";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { POLL_INTERVAL, formatDate, isTerminal, videoQuery, videoTitle } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/videos/$id/")({
  head: () => ({
    meta: [
      { title: "Processing — Cutroom" },
      { name: "description", content: "Follow scene detection, transcription and plan generation." },
      { property: "og:title", content: "Processing — Cutroom" },
      {
        property: "og:description",
        content: "Follow scene detection, transcription and plan generation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VideoDetailPage,
});

const PIPELINE = [
  { key: "scene_detection", label: "Scene detection", blurb: "Splitting the footage into shots." },
  { key: "transcription", label: "Transcription", blurb: "Turning speech into a timed transcript." },
  { key: "timeline_extraction", label: "Timeline extraction", blurb: "Mapping cuts and events." },
  { key: "vision_tagging", label: "Vision tagging", blurb: "Labelling what appears on screen." },
  { key: "plan_generation", label: "Plan generation", blurb: "Drafting the edit plan." },
] as const;

const ORDERED_STATUSES = ["uploading", "processing", "plan_ready", "approved", "rendering", "complete"];

function stageState(stageIndex: number, video: { status: string; stages?: Record<string, string> | null }, key: string) {
  const explicit = video.stages?.[key];
  if (explicit) return explicit.toLowerCase();

  const status = String(video.status).toLowerCase();
  if (status === "failed") return "unknown";
  const statusIndex = ORDERED_STATUSES.indexOf(status);
  if (statusIndex >= ORDERED_STATUSES.indexOf("plan_ready")) return "complete";
  if (status === "processing") return stageIndex === 0 ? "running" : "pending";
  return "pending";
}

function VideoDetailPage() {
  const { id } = Route.useParams();
  const query = useQuery({
    ...videoQuery(id),
    refetchInterval: (q) => (q.state.data && !isTerminal(q.state.data.status) ? POLL_INTERVAL : false),
  });

  if (query.isPending) return <LoadingState label="Loading video…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const video = query.data;
  const status = String(video.status).toLowerCase();
  const planReady = ["plan_ready", "approved", "rendering", "complete"].includes(status);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/dashboard"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        ← All videos
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">{videoTitle(video)}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Uploaded {formatDate(video.created_at ?? video.uploaded_at)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {status === "failed" && (
        <p role="alert" className="mt-6 rounded-md border border-destructive/40 p-4 text-sm">
          {video.error ?? "Processing failed. Try uploading the file again."}
        </p>
      )}

      <ol className="mt-8 space-y-3">
        {PIPELINE.map((stage, index) => {
          const state = stageState(index, { status, stages: video.stages ?? null }, stage.key);
          return (
            <li
              key={stage.key}
              className="flex items-start gap-3 rounded-lg border border-border p-4"
            >
              <span className="mt-0.5" aria-hidden="true">
                {state === "complete" ? (
                  <Check className="size-4 text-primary" />
                ) : state === "running" ? (
                  <Loader2 className="size-4 animate-spin text-foreground" />
                ) : (
                  <CircleDashed className="size-4 text-muted-foreground" />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {stage.label}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {state === "complete"
                      ? "Done"
                      : state === "running"
                        ? "In progress"
                        : state === "failed"
                          ? "Failed"
                          : state === "unknown"
                            ? "Status unavailable"
                            : "Waiting"}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stage.blurb}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild disabled={!planReady}>
          <Link to="/videos/$id/review" params={{ id }}>
            {planReady ? "Review edit plan" : "Plan not ready yet"}
          </Link>
        </Button>
        {["rendering", "complete"].includes(status) && (
          <Button asChild variant="outline">
            <Link to="/videos/$id/render" params={{ id }}>
              View render
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link to="/videos/$id/versions" params={{ id }}>
            Plan versions
          </Link>
        </Button>
      </div>
    </div>
  );
}
