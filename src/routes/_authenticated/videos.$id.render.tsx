import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ErrorState, LoadingState } from "@/components/app/query-states";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ApiError, api } from "@/lib/api-client";
import { editPlanQuery, isTerminal, renderJobQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/videos/$id/render")({
  validateSearch: (search: Record<string, unknown>) => ({
    job: typeof search["job"] === "string" ? search["job"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Render — Cutroom" },
      { name: "description", content: "Track the render job and download the finished cut." },
      { property: "og:title", content: "Render — Cutroom" },
      { property: "og:description", content: "Track the render job and download the finished cut." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RenderPage,
});

function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return seconds;
}

function RenderPage() {
  const { id } = Route.useParams();
  const { job } = Route.useSearch();

  const planQuery = useQuery(editPlanQuery(id));
  const jobQuery = useQuery({
    ...renderJobQuery(job ?? ""),
    enabled: Boolean(job),
    refetchInterval: (q) => (q.state.data && isTerminal(q.state.data.status) ? false : 4000),
  });

  const status = String(jobQuery.data?.status ?? "").toLowerCase();
  const elapsed = useElapsed(Boolean(job) && !isTerminal(status));

  const retry = useMutation({
    mutationFn: async () => {
      if (!planQuery.data) throw new ApiError(0, "The current plan could not be loaded.");
      return api.approvePlan(planQuery.data.id);
    },
    onSuccess: (result) => {
      const nextJob = result.render_job_id ?? result.job_id ?? result.id;
      if (nextJob) window.location.assign(`/videos/${id}/render?job=${nextJob}`);
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/videos/$id"
        params={{ id }}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        ← Back to video
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl">Render</h1>

      {!job ? (
        <p className="mt-6 rounded-md border border-border p-4 text-sm text-muted-foreground">
          No render job is referenced in this link. Approve a plan on the review screen to start a
          render, then return here.
        </p>
      ) : jobQuery.isPending ? (
        <LoadingState label="Loading render job…" />
      ) : jobQuery.isError ? (
        <ErrorState error={jobQuery.error} onRetry={() => void jobQuery.refetch()} />
      ) : (
        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            {!isTerminal(status) && (
              <span role="status" className="text-sm text-muted-foreground">
                Elapsed {Math.floor(elapsed / 60)}m {elapsed % 60}s
              </span>
            )}
          </div>

          {!isTerminal(status) &&
            (typeof jobQuery.data.progress === "number" ? (
              <div>
                <Progress value={jobQuery.data.progress} aria-label="Render progress" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {Math.round(jobQuery.data.progress)}% complete
                </p>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Rendering — this job doesn't report granular progress, so we'll keep checking.
              </p>
            ))}

          {status === "complete" && jobQuery.data.output_url && (
            <div className="space-y-4">
              <video
                controls
                preload="metadata"
                src={jobQuery.data.output_url}
                aria-label="Rendered video"
                className="w-full rounded-lg border border-border bg-black"
              />
              <Button asChild>
                <a href={jobQuery.data.output_url} download>
                  <Download className="size-4" aria-hidden="true" />
                  Download the final cut
                </a>
              </Button>
            </div>
          )}

          {status === "failed" && (
            <div role="alert" className="rounded-md border border-destructive/40 p-4">
              <p className="text-sm text-foreground">
                {jobQuery.data.error ?? "The render failed before it finished."}
              </p>
              <Button
                className="mt-4"
                onClick={() => retry.mutate()}
                disabled={retry.isPending || !planQuery.data}
              >
                {retry.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Retry render with the same plan
              </Button>
              {retry.isError && (
                <p role="alert" className="mt-3 text-sm text-muted-foreground">
                  {(retry.error as Error).message}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
