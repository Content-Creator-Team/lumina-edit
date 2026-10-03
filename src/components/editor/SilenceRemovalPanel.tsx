import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEditorStore } from "@/lib/editor-store";
import { api } from "@/lib/api-client";
import { agentOpsToTimelineRanges } from "@/lib/timeline-persist";

export function SilenceRemovalPanel({ videoId }: { videoId: string }) {
  const [threshold, setThreshold] = useState(1.5);
  const [includeFillers, setIncludeFillers] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { cutRanges, setCurrentTime, tracks } = useEditorStore();

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["silence", videoId, threshold],
    queryFn: () => api.getSilenceDetection(videoId, threshold),
    enabled: false,
  });

  function rangeKey(kind: string, start: number, end: number) {
    return `${kind}:${start.toFixed(2)}-${end.toFixed(2)}`;
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    if (!data) return;
    const next = new Set<string>();
    for (const s of data.silences) next.add(rangeKey("silence", s.start, s.end));
    if (includeFillers) {
      for (const f of data.fillers) next.add(rangeKey("filler", f.start, f.end));
    }
    setSelected(next);
  }

  function applyCuts() {
    if (!data) return;
    const sourceOps: Array<{ start_time: number; end_time: number }> = [];
    for (const s of data.silences) {
      if (selected.has(rangeKey("silence", s.start, s.end))) {
        sourceOps.push({ start_time: s.start, end_time: s.end });
      }
    }
    if (includeFillers) {
      for (const f of data.fillers) {
        if (selected.has(rangeKey("filler", f.start, f.end))) {
          sourceOps.push({ start_time: f.start, end_time: f.end });
        }
      }
    }
    // Silence times are source-absolute — map onto timeline positions
    const timelineRanges = agentOpsToTimelineRanges(sourceOps, tracks);
    cutRanges(timelineRanges);
    setSelected(new Set());
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-xs text-muted-foreground">Min gap</label>
        <select
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
        >
          {[1, 1.5, 2, 3, 5].map((t) => (
            <option key={t} value={t}>{t}s</option>
          ))}
        </select>
        <Button
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="size-3 animate-spin" /> : <VolumeX className="size-3" />}
          <span className="ml-1">Detect</span>
        </Button>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={includeFillers}
          onChange={(e) => setIncludeFillers(e.target.checked)}
        />
        Include filler words (um, uh, like…)
      </label>

      {error && <p className="text-xs text-red-400">{String(error)}</p>}

      {data && (
        <>
          <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Silence</span>
              <span className="tabular-nums">{data.total_silence_s.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fillers</span>
              <span className="tabular-nums">{data.total_filler_s.toFixed(1)}s</span>
            </div>
            <div className="mt-1 flex justify-between font-medium">
              <span>Saveable</span>
              <span className="tabular-nums text-primary">{data.saveable_s.toFixed(1)}s</span>
            </div>
          </div>

          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-6 flex-1 text-[10px]" onClick={selectAll}>
              Select all
            </Button>
            <Button
              size="sm"
              className="h-6 flex-1 text-[10px]"
              disabled={selected.size === 0}
              onClick={applyCuts}
            >
              Remove selected ({selected.size})
            </Button>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {data.silences.map((s) => {
              const key = rangeKey("silence", s.start, s.end);
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2 rounded border border-border bg-muted/20 p-1.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggle(key)}
                    className="mt-0.5"
                  />
                  <button type="button" className="flex-1 text-left" onClick={() => setCurrentTime(s.start)}>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[9px]">silence</Badge>
                      <span className="tabular-nums text-muted-foreground">
                        {s.start.toFixed(1)}–{s.end.toFixed(1)}s
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{s.duration.toFixed(1)}s gap</span>
                  </button>
                </label>
              );
            })}
            {includeFillers &&
              data.fillers.map((f) => {
                const key = rangeKey("filler", f.start, f.end);
                const label = f.text || f.word || "filler";
                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-2 rounded border border-border bg-muted/20 p-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggle(key)}
                      className="mt-0.5"
                    />
                    <button type="button" className="flex-1 text-left" onClick={() => setCurrentTime(f.start)}>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[9px]">{label}</Badge>
                        <span className="tabular-nums text-muted-foreground">{f.start.toFixed(1)}s</span>
                      </div>
                    </button>
                  </label>
                );
              })}
          </div>
        </>
      )}

      {!data && !isFetching && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Detect silences and fillers, preview each range, then remove selected cuts from the timeline.
        </p>
      )}
    </div>
  );
}
