import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, CircleDashed, Loader2, MinusCircle } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { StageRecord } from "@/lib/api-types";
import { POLL_INTERVAL, videoProgressQuery } from "@/lib/queries";

const LABELS: Record<string, string> = {
  upload: "Upload",
  uploaded: "Upload",
  probe: "Reading the file",
  transcode: "Preparing media",
  transcription: "Transcription",
  scene_detection: "Scene detection",
  analysis: "Footage analysis",
  vision_tagging: "Vision tagging",
  creative_plan: "Creative plan",
  plan_generation: "Plan generation",
  thumbnails: "Thumbnails",
  render: "Render",
};

function label(stage: string) {
  return LABELS[stage] ?? stage.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function norm(status: string) {
  const s = status.toLowerCase();
  if (["done", "complete", "completed", "success", "succeeded"].includes(s)) return "done";
  if (["running", "in_progress", "processing", "started"].includes(s)) return "running";
  if (["failed", "error"].includes(s)) return "failed";
  if (s === "skipped") return "skipped";
  return "pending";
}

function duration(r: StageRecord) {
  if (!r.started_at || !r.finished_at) return null;
  const ms = new Date(r.finished_at).getTime() - new Date(r.started_at).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms < 1000
    ? "<1s"
    : ms < 60_000
      ? `${Math.round(ms / 1000)}s`
      : `${Math.round(ms / 60_000)}m`;
}

/** Real pipeline progress from GET /videos/{id}/progress. */
export function ProcessingStages({ videoId, live }: { videoId: string; live: boolean }) {
  const query = useQuery({
    ...videoProgressQuery(videoId),
    refetchInterval: live ? Math.min(POLL_INTERVAL, 3_000) : false,
  });

  if (query.isPending) {
    return (
      <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading pipeline status…
      </p>
    );
  }
  if (query.isError || !query.data) {
    return (
      <p className="mt-8 text-sm text-muted-foreground">
        Pipeline status is unavailable right now.
      </p>
    );
  }

  const data = query.data;
  const records = new Map(data.stages.map((r) => [r.stage, r]));
  const order = data.all_stages?.length ? data.all_stages : data.stages.map((s) => s.stage);
  const rows: StageRecord[] = order.map(
    (stage) => records.get(stage) ?? { stage, status: "pending" },
  );
  data.stages.forEach((r) => {
    if (!order.includes(r.stage)) rows.push(r);
  });
  const pct = Math.max(0, Math.min(100, Math.round(data.progress ?? 0)));

  return (
    <section aria-labelledby="pipeline-heading" className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 id="pipeline-heading" className="text-sm font-medium text-foreground">
          Pipeline {data.stage && norm(data.status) !== "done" ? `· ${label(data.stage)}` : ""}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className="mt-2" aria-label="Processing progress" />
      {data.error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 p-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          {data.error}
        </p>
      )}
      <ol className="mt-4 space-y-2" aria-live="polite">
        {rows.map((r) => {
          const state = norm(r.status);
          const took = duration(r);
          return (
            <li key={r.stage} className="surface-card flex items-start gap-3 rounded-xl px-4 py-3">
              <span className="mt-0.5" aria-hidden="true">
                {state === "done" ? (
                  <Check className="size-4 text-primary" />
                ) : state === "running" ? (
                  <Loader2 className="size-4 animate-spin text-foreground" />
                ) : state === "failed" ? (
                  <AlertTriangle className="size-4 text-destructive" />
                ) : state === "skipped" ? (
                  <MinusCircle className="size-4 text-muted-foreground" />
                ) : (
                  <CircleDashed className="size-4 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {label(r.stage)}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {state === "done"
                      ? `Done${took ? ` · ${took}` : ""}`
                      : state === "running"
                        ? "In progress"
                        : state === "failed"
                          ? "Failed"
                          : state === "skipped"
                            ? "Skipped"
                            : "Waiting"}
                  </span>
                </p>
                {r.note && <p className="mt-0.5 text-xs text-muted-foreground">{r.note}</p>}
                {r.error && <p className="mt-0.5 text-xs text-destructive">{r.error}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
