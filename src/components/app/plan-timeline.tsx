import { Scissors, Star } from "lucide-react";

import type { PlanEvent, PlanSegment, Scene } from "@/lib/api-types";
import { formatTimecode } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Props = {
  duration: number;
  currentTime: number;
  scenes: Scene[];
  segments: PlanSegment[];
  events: PlanEvent[];
  selectedSegmentId: string | null;
  onSeek: (time: number) => void;
  onSelectSegment: (segmentId: string) => void;
};

/**
 * Timeline overlay: scene bounds, event markers and colour-coded plan
 * segments. Keep/cut is always reinforced with an icon and text label so the
 * information never depends on colour alone.
 */
export function PlanTimeline({
  duration,
  currentTime,
  scenes,
  segments,
  events,
  selectedSegmentId,
  onSeek,
  onSelectSegment,
}: Props) {
  const safeDuration = duration > 0 ? duration : 1;
  const pct = (value: number) => `${Math.min(100, Math.max(0, (value / safeDuration) * 100))}%`;

  return (
    <div className="select-none">
      <div className="relative h-3 rounded-sm bg-muted" aria-hidden="true">
        {scenes.map((scene, index) => (
          <span
            key={scene.id ?? `${scene.start}-${index}`}
            className="absolute top-0 h-full border-l border-border"
            style={{ left: pct(scene.start) }}
          />
        ))}
      </div>

      <div
        role="group"
        aria-label="Edit plan timeline"
        className="relative mt-1 h-12 overflow-hidden rounded-md border border-border bg-card"
      >
        {segments.map((segment) => {
          const keep = segment.action !== "cut";
          const selected = segment.id === selectedSegmentId;
          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => {
                onSelectSegment(segment.id);
                onSeek(segment.start);
              }}
              aria-label={`${keep ? "Keep" : "Cut"} segment from ${formatTimecode(segment.start)} to ${formatTimecode(segment.end)}${segment.caption ? `. ${segment.caption}` : ""}`}
              title={`${keep ? "Keep" : "Cut"} · ${formatTimecode(segment.start)}–${formatTimecode(segment.end)}`}
              className={cn(
                "absolute top-0 flex h-full items-center gap-1 overflow-hidden border-r border-background px-1.5 text-[10px] font-medium transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                keep
                  ? "bg-primary/25 text-foreground"
                  : "bg-destructive/20 text-foreground line-through decoration-1",
                selected && "ring-2 ring-ring ring-inset",
              )}
              style={{ left: pct(segment.start), width: pct(Math.max(0.2, segment.end - segment.start)) }}
            >
              {keep ? (
                <Star className="size-3 shrink-0" aria-hidden="true" />
              ) : (
                <Scissors className="size-3 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">{keep ? "Keep" : "Cut"}</span>
            </button>
          );
        })}

        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 h-full w-0.5 bg-foreground"
          style={{ left: pct(currentTime) }}
        />
      </div>

      <div className="relative mt-1 h-6" aria-hidden={events.length === 0}>
        {events.map((event, index) => (
          <button
            key={`${event.time}-${index}`}
            type="button"
            onClick={() => onSeek(event.time)}
            title={`${event.label ?? event.type ?? "Event"} at ${formatTimecode(event.time)}${event.description ? ` — ${event.description}` : ""}`}
            aria-label={`Jump to ${event.label ?? event.type ?? "event"} at ${formatTimecode(event.time)}`}
            className="absolute top-0 size-3 -translate-x-1/2 rounded-full border border-foreground bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            style={{ left: pct(event.time) }}
          />
        ))}
      </div>

      <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>{formatTimecode(0)}</span>
        <span>{formatTimecode(duration)}</span>
      </div>
    </div>
  );
}
