import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Crown, Gauge, Magnet, RefreshCw } from "lucide-react";

import { ErrorState } from "@/components/app/query-states";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import type { SmartClip } from "@/lib/api-types";
import { formatTimecode, videoQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

const VARIANTS = [
  { target: 60, label: "60s cut", format: "16:9 · YouTube" },
  { target: 30, label: "30s cut", format: "9:16 · Reels / Shorts" },
  { target: 15, label: "15s teaser", format: "9:16 · Stories / TikTok" },
] as const;

function Meter({ label, value, icon: Icon }: { label: string; value: number | null | undefined; icon: typeof Gauge }) {
  const has = typeof value === "number";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{label}</span>
        <span className="font-mono font-medium">{has ? Math.round(value) : "—"}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={has ? Math.round(value) : undefined}>
        {has && <div className="bg-brand-gradient h-full" style={{ width: `${Math.min(100, value)}%` }} />}
      </div>
      {!has && <p className="mt-0.5 text-[10px] text-muted-foreground">Not reported by the analysis service</p>}
    </div>
  );
}

/** Several AI-picked cuts from one upload, side by side and scored. */
export function VariantCuts({ videoId }: { videoId: string }) {
  const video = useQuery(videoQuery(videoId));
  const results = useQueries({
    queries: VARIANTS.map((v) => ({
      queryKey: ["smart-clips", videoId, v.target],
      queryFn: () => api.getSmartClips(videoId, v.target, 1),
    })),
  });
  const engagement = useQuery({ queryKey: ["engagement", videoId], queryFn: () => api.getEngagement(videoId) });

  const cuts = VARIANTS.map((v, i) => ({ ...v, q: results[i]!, clip: results[i]?.data?.clips?.[0] as SmartClip | undefined }));
  const best = cuts.reduce<(typeof cuts)[number] | null>((acc, c) => (c.clip && (!acc?.clip || c.clip.score > acc.clip.score) ? c : acc), null);

  return (
    <section aria-labelledby="variants-title" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="variants-title" className="font-[family-name:var(--font-display)] text-xl">AI cuts from this upload</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each cut is picked by the analysis service and scored for hook strength and predicted retention.
            {engagement.data && <> Whole video: grade <strong>{engagement.data.grade}</strong> ({Math.round(engagement.data.total_score)}/100).</>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => results.forEach((r) => void r.refetch())}>
          <RefreshCw className="size-3.5" /> Regenerate cuts
        </Button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {cuts.map((c) => (
          <article
            key={c.target}
            className={cn("surface-card flex flex-col rounded-xl border bg-card p-3", best === c ? "border-primary" : "border-border")}
          >
            <header className="flex items-center gap-2">
              <h3 className="font-medium">{c.label}</h3>
              <span className="text-xs text-muted-foreground">{c.format}</span>
              {best === c && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium">
                  <Crown className="size-3" aria-hidden="true" /> Top hook
                </span>
              )}
            </header>

            {c.q.isPending && <div className="mt-3 aspect-video animate-pulse rounded-lg bg-muted" aria-label="Generating cut" />}
            {c.q.isError && <ErrorState error={c.q.error} onRetry={() => void c.q.refetch()} />}
            {c.q.data && !c.clip && <p className="mt-3 text-sm text-muted-foreground">The footage is too short for a cut of this length.</p>}

            {c.clip && (
              <>
                <div className={cn("mt-3 overflow-hidden rounded-lg bg-muted", c.format.startsWith("9:16") ? "mx-auto aspect-[9/16] max-h-64" : "aspect-video")}>
                  {video.data?.playback_url ? (
                    <video
                      src={`${video.data.playback_url}#t=${c.clip.start},${c.clip.end}`}
                      controls
                      preload="metadata"
                      className="h-full w-full object-cover"
                      aria-label={`${c.label} preview`}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
                      Preview needs the original video file. Timing: {formatTimecode(c.clip.start)}–{formatTimecode(c.clip.end)}
                    </div>
                  )}
                </div>
                <p className="mt-3 text-sm font-medium">“{c.clip.hook}”</p>
                <p className="text-xs text-muted-foreground">{c.clip.reason}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {formatTimecode(c.clip.start)}–{formatTimecode(c.clip.end)}
                </p>
                <div className="mt-3 space-y-2">
                  <Meter label="Hook strength" value={c.clip.score} icon={Magnet} />
                  <Meter label="Predicted retention" value={c.clip.retention} icon={Gauge} />
                </div>
                <Button asChild size="sm" variant="secondary" className="mt-3">
                  <Link to="/editor/$videoId" params={{ videoId }}>Edit this cut</Link>
                </Button>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
