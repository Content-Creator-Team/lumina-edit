import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clapperboard, Download, Loader2 } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";

import { ErrorState, LoadingState } from "@/components/app/query-states";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ApiError, api } from "@/lib/api-client";
import { editPlanQuery, isTerminal, renderJobQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/videos/$id/render")({
  validateSearch: (search: Record<string, unknown>): { job?: string } =>
    typeof search["job"] === "string" ? { job: search["job"] } : {},
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
  const { job: jobFromSearch } = Route.useSearch();
  const navigate = useNavigate();
  const posthog = usePostHog();

  const planQuery = useQuery(editPlanQuery(id));
  const jobsListQ = useQuery({
    queryKey: ["render-jobs", id],
    queryFn: () => api.listRenderJobs(id),
    enabled: !jobFromSearch,
  });

  const resolvedJobId = jobFromSearch ?? jobsListQ.data?.[0]?.id ?? undefined;

  useEffect(() => {
    if (!jobFromSearch && jobsListQ.data?.[0]?.id) {
      void navigate({
        to: "/videos/$id/render",
        params: { id },
        search: { job: jobsListQ.data[0].id },
        replace: true,
      });
    }
  }, [jobFromSearch, jobsListQ.data, id, navigate]);

  const jobQuery = useQuery({
    ...renderJobQuery(resolvedJobId ?? ""),
    enabled: Boolean(resolvedJobId),
    refetchInterval: (q) => (q.state.data && isTerminal(q.state.data.status) ? false : 4000),
  });

  const status = String(jobQuery.data?.status ?? "").toLowerCase();
  const elapsed = useElapsed(Boolean(resolvedJobId) && !isTerminal(status));

  const retry = useMutation({
    mutationFn: async () => {
      if (!planQuery.data) throw new ApiError(0, "The current plan could not be loaded.");
      return api.approvePlan(planQuery.data.id);
    },
    onSuccess: (result) => {
      const nextJob = result.render_job_id ?? result.job_id ?? result.id;
      if (nextJob) {
        void navigate({
          to: "/videos/$id/render",
          params: { id },
          search: { job: nextJob },
        });
      }
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Render</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/editor/$videoId" params={{ videoId: id }}>
            <Clapperboard className="mr-1.5 size-3.5" />
            Editor
          </Link>
        </Button>
      </div>

      {!resolvedJobId && (jobsListQ.isPending || !jobFromSearch) ? (
        jobsListQ.isPending ? (
          <LoadingState label="Looking up render jobs…" />
        ) : (
          <p className="mt-6 rounded-md border border-border p-4 text-sm text-muted-foreground">
            No render jobs yet. Export from the editor or approve a plan on the review screen.
          </p>
        )
      ) : jobQuery.isPending ? (
        <LoadingState label="Loading render job…" />
      ) : jobQuery.isError ? (
        <ErrorState error={jobQuery.error} onRetry={() => void jobQuery.refetch()} />
      ) : (
        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            {jobQuery.data.preset_id && (
              <span className="text-xs text-muted-foreground">Preset: {jobQuery.data.preset_id}</span>
            )}
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
                <a
                  href={jobQuery.data.output_url}
                  download
                  onClick={() => posthog.capture("render_downloaded")}
                >
                  <Download className="size-4" aria-hidden="true" />
                  Download the final cut
                </a>
              </Button>
            </div>
          )}

          {status === "failed" && (
            <div role="alert" className="rounded-md border border-destructive/40 p-4">
              <p className="text-sm text-foreground">
                {jobQuery.data.error_message ?? jobQuery.data.error ?? "The render failed before it finished."}
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  posthog.capture("render_retry_requested");
                  retry.mutate();
                }}
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
