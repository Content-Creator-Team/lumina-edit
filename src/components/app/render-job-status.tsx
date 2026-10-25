import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Music, RotateCcw, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ApiError, api } from "@/lib/api-client";
import type { RenderJob } from "@/lib/api-types";
import { isTerminal, renderJobQuery } from "@/lib/queries";

const stageLabel = (s?: string | null) =>
  s ? s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : null;

/** Live render progress with cancel / retry, plus the music credit from the job report. */
export function RenderJobStatus({
  jobId,
  onRetried,
  compact,
}: {
  jobId: string;
  onRetried?: (job: RenderJob) => void;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const job = useQuery({
    ...renderJobQuery(jobId),
    refetchInterval: (q) => (q.state.data && isTerminal(q.state.data.status) ? false : 3000),
  });
  const cancel = useMutation({
    mutationFn: () => api.cancelRenderJob(jobId),
    onSuccess: (j) => qc.setQueryData(renderJobQuery(jobId).queryKey, j),
  });
  const retry = useMutation({
    mutationFn: () => api.retryRenderJob(jobId),
    onSuccess: (j) => onRetried?.(j),
  });

  if (job.isPending) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Loading render job…
      </p>
    );
  }
  if (job.isError || !job.data)
    return <p className="text-xs text-destructive">Couldn't load the render job.</p>;

  const j = job.data;
  const status = String(j.status).toLowerCase();
  const running = !isTerminal(status);
  const pct = typeof j.progress === "number" ? Math.round(j.progress) : null;
  const music = j.report?.music;
  // credits arrive as {kind, text} objects (older reports: plain strings)
  const credits = (j.report?.credits ?? []).map((c) => (typeof c === "string" ? c : c.text));
  const err = cancel.error ?? retry.error;

  return (
    <div className="space-y-3">
      {running && (
        <div>
          {pct != null ? <Progress value={pct} aria-label="Render progress" /> : null}
          <p role="status" className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            {stageLabel(j.stage) ?? "Rendering"}
            {pct != null ? ` · ${pct}%` : ""}
            {j.cancel_requested ? " · cancelling…" : ""}
          </p>
        </div>
      )}
      {status === "cancelled" && (
        <p className="text-xs text-muted-foreground">This render was cancelled.</p>
      )}
      {status === "failed" && (
        <p role="alert" className="text-xs text-destructive">
          {j.error_message ?? j.error ?? "The render failed before it finished."}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {running && (
          <Button
            size="sm"
            variant="outline"
            disabled={cancel.isPending || !!j.cancel_requested}
            onClick={() => cancel.mutate()}
          >
            {cancel.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <XCircle className="size-3.5" />
            )}
            Cancel render
          </Button>
        )}
        {(status === "failed" || status === "cancelled") && (
          <Button size="sm" disabled={retry.isPending} onClick={() => retry.mutate()}>
            {retry.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
            Retry render
          </Button>
        )}
      </div>
      {err && (
        <p className="text-xs text-destructive">
          {err instanceof ApiError ? err.detail : String(err)}
        </p>
      )}

      {!compact && status === "complete" && j.report?.render && (
        <p className="text-xs text-muted-foreground">
          {[
            j.report.render.duration ? `${Math.round(j.report.render.duration)}s` : null,
            j.report.render.clips ? `${j.report.render.clips} clips` : null,
            j.report.render.transitions ? `${j.report.render.transitions} transitions` : null,
            j.report.render.beat_aligned_cuts
              ? `${j.report.render.beat_aligned_cuts} cuts on the beat`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {!!j.report?.render?.warnings?.length && (
        <ul className="list-disc pl-4 text-xs text-muted-foreground">
          {j.report.render.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {(music?.title || credits.length > 0) && (
        <div className="rounded-md border border-border bg-muted/20 p-2.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <Music className="size-3.5" aria-hidden="true" /> Music credit
          </p>
          {music?.title && (
            <p className="mt-1">
              {music.title}
              {music.license_name ? ` · ${music.license_name}` : ""}
            </p>
          )}
          {music?.attribution && <p className="mt-0.5 italic">{music.attribution}</p>}
          {credits
            .filter((c) => c !== music?.attribution)
            .map((c) => (
              <p key={c} className="mt-0.5">
                {c}
              </p>
            ))}
          {music?.attribution && (
            <p className="mt-1 text-[10px]">Include this attribution in your video description.</p>
          )}
        </div>
      )}
    </div>
  );
}
