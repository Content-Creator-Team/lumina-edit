import { useQuery } from "@tanstack/react-query";
import { Captions, Film } from "lucide-react";

import { POLL_INTERVAL, formatTimecode, scenesQuery, transcriptQuery } from "@/lib/queries";

/**
 * Fills in as the pipeline produces real output: detected scenes and
 * transcript lines appear here as soon as the backend returns them.
 */
export function LiveProcessingFeed({ videoId, live }: { videoId: string; live: boolean }) {
  const interval = live ? POLL_INTERVAL : false;
  const scenes = useQuery({ ...scenesQuery(videoId), refetchInterval: interval, retry: live ? 3 : 1 });
  const transcript = useQuery({ ...transcriptQuery(videoId), refetchInterval: interval, retry: live ? 3 : 1 });
  const sceneList = scenes.data ?? [];
  const lines = transcript.data?.segments ?? [];

  return (
    <section aria-labelledby="live-feed" aria-live="polite" className="mt-8">
      <h2 id="live-feed" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg">
        {live && <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />}
        {live ? "What the AI has found so far" : "What the AI found"}
      </h2>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="surface-card rounded-xl p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium"><Film className="size-4" aria-hidden="true" /> Scenes · {sceneList.length}</p>
          {sceneList.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{live ? "Detecting scenes…" : "No scenes were returned."}</p>
          ) : (
            <ol className="mt-3 grid grid-cols-4 gap-1.5">
              {sceneList.slice(0, 16).map((sc, i) => (
                <li key={sc.id ?? i} className="ai-change-card overflow-hidden rounded-md border border-border bg-muted" style={{ animationDelay: `${i * 40}ms` }}>
                  {sc.thumbnail_url ? (
                    <img src={sc.thumbnail_url} alt={sc.label ?? `Scene ${i + 1}`} className="aspect-video w-full object-cover" />
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-[10px] text-muted-foreground">{i + 1}</div>
                  )}
                  <p className="truncate px-1 py-0.5 font-mono text-[9px] text-muted-foreground">{formatTimecode(sc.start)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="surface-card rounded-xl p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium"><Captions className="size-4" aria-hidden="true" /> Transcript · {lines.length} lines</p>
          {lines.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{live ? "Transcribing…" : "No transcript was returned."}</p>
          ) : (
            <ol className="mt-3 max-h-56 space-y-1.5 overflow-y-auto text-sm">
              {lines.slice(-12).map((l, i) => (
                <li key={l.id ?? i} className="ai-change-card flex gap-2">
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{formatTimecode(l.start ?? l.start_time ?? 0)}</span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
