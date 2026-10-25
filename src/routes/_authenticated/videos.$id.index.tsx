import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Clapperboard, Loader2, Target } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/app/query-states";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { LiveProcessingFeed } from "@/components/app/live-processing-feed";
import { FootageAnalysis } from "@/components/app/footage-analysis";
import { ProcessingStages } from "@/components/app/processing-stages";
import { POLL_INTERVAL, formatDate, formatTimecode, isTerminal, videoQuery, videoTitle } from "@/lib/queries";
import { PROJECT_GOALS } from "@/lib/editor-extras";
import { isDemoMode } from "@/lib/runtime-config";
import { useVideoGoal } from "@/lib/use-preferences";
import { cn } from "@/lib/utils";

/** "What's this for?" — the chosen goal steers revision prompts and AI suggestions. */
function GoalPicker({ videoId }: { videoId: string }) {
  const { goal, setGoal, saving } = useVideoGoal(videoId);
  return (
    <section aria-labelledby="goal-heading" className="mt-8 rounded-xl border border-border p-4">
      <h2 id="goal-heading" className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Target className="size-4 text-primary" aria-hidden="true" />
        What's this video for?
        {saving && <Loader2 className="size-3 animate-spin text-muted-foreground" aria-hidden="true" />}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        The AI uses this intent when you ask for revisions.
        {isDemoMode() ? " Saved on this device." : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Video goal">
        {PROJECT_GOALS.map((g) => (
          <button
            key={g.id}
            role="radio"
            aria-checked={goal === g.id}
            title={g.hint}
            onClick={() => {
              setGoal(goal === g.id ? null : g.id);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              goal === g.id
                ? "border-primary bg-primary/15 font-medium text-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/_authenticated/videos/$id/")({
  head: () => ({
    meta: [
      { title: "Processing — REELZOY" },
      { name: "description", content: "Follow scene detection, transcription and plan generation." },
      { property: "og:title", content: "Processing — REELZOY" },
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
  const planReady = ["ready", "plan_ready", "approved", "rendering", "complete"].includes(status);

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

      <GoalPicker videoId={id} />

      {!!video.edit_options?.combined_parts?.length && (
        <section aria-label="Combined clips" className="mt-6 rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground">
            Combined from {video.edit_options.combined_parts.length} clips
          </p>
          <ol className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {video.edit_options.combined_parts.map((p) => (
              <li key={p.index} className="shrink-0 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                <span className="font-medium text-foreground">{p.index + 1}. {p.name}</span>
                <span className="ml-1.5 font-mono text-muted-foreground">
                  {formatTimecode(p.start)}–{formatTimecode(p.end)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {!video.edit_options?.combined_parts?.length && !!video.edit_options?.combined_from?.length && (
        <p className="mt-6 text-xs text-muted-foreground">
          Combining {video.edit_options.combined_from.length} clips: {video.edit_options.combined_from.join(", ")}
        </p>
      )}

      {status === "failed" && (
        <p role="alert" className="mt-6 rounded-md border border-destructive/40 p-4 text-sm">
          {video.error ?? "Processing failed. Try uploading the file again."}
        </p>
      )}

      <ProcessingStages videoId={id} live={!isTerminal(video.status)} />

      <FootageAnalysis videoId={id} enabled={planReady} />

      <LiveProcessingFeed videoId={id} live={!isTerminal(video.status)} />

      <div className="mt-8 flex flex-wrap gap-3">
        {planReady ? (
          <Button asChild className="bg-brand-gradient text-primary-foreground">
            <Link to="/videos/$id/plan" params={{ id }}>View AI plan</Link>
          </Button>
        ) : (
          <Button disabled>Plan not ready yet</Button>
        )}
        {planReady && (
          <Button asChild variant="outline">
            <Link to="/videos/$id/review" params={{ id }}>Review & edit plan</Link>
          </Button>
        )}
        {planReady && (
          <Button asChild variant="secondary">
            <Link to="/editor/$videoId" params={{ videoId: id }}>
              <Clapperboard className="mr-1.5 size-4" />
              Open in Editor
            </Link>
          </Button>
        )}
        {planReady && (
          <Button asChild variant="outline">
            <Link to="/videos/$id/thumbnails" params={{ id }}>
              Thumbnails
            </Link>
          </Button>
        )}
        {["rendering", "complete", "ready", "plan_ready", "approved"].includes(status) && (
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
