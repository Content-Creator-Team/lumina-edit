import type { EditPlan, PlanSegment } from "@/lib/api-types";
import { useEditorStore } from "@/lib/editor-store";
import { clipIdForSegment } from "@/lib/timeline-persist";
import { cn } from "@/lib/utils";
import { LOW_CONFIDENCE } from "./AIChangesPanel";

/**
 * One-tick-per-AI-edit strip above the timeline. Colour shows review state:
 * accepted, rejected, pending, and low-confidence pending. Click a tick to
 * jump to that edit on the timeline.
 */
export function ReviewMiniMap({ plan }: { plan: EditPlan | undefined }) {
  const { aiDecisions, duration, tracks, selectClip, setCurrentTime, setRightTab, showProperties } =
    useEditorStore();

  if (!plan || plan.segments.length === 0 || duration <= 0) return null;

  const segments = [...plan.segments].sort(
    (a, b) => (a.start_ts ?? a.start) - (b.start_ts ?? b.start),
  );
  const pending = segments.filter((s) => !aiDecisions[s.id]).length;
  const lowPending = segments.filter(
    (s) => !aiDecisions[s.id] && typeof s.confidence === "number" && s.confidence < LOW_CONFIDENCE,
  ).length;

  const jump = (seg: PlanSegment) => {
    const clip = tracks.flatMap((t) => t.clips).find((c) => c.id === clipIdForSegment(seg.id));
    if (clip) {
      selectClip(clip.id);
      setCurrentTime(clip.startTime);
    } else {
      setCurrentTime(seg.start_ts ?? seg.start);
    }
  };

  return (
    <div className="border-b border-border px-3 pt-2 pb-1.5">
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-muted/60"
        role="group"
        aria-label={`AI edit review map: ${segments.length - pending} of ${segments.length} reviewed, ${lowPending} low-confidence pending`}
      >
        {segments.map((seg) => {
          const start = seg.start_ts ?? seg.start;
          const end = seg.end_ts ?? seg.end;
          const decision = aiDecisions[seg.id];
          const low = typeof seg.confidence === "number" && seg.confidence < LOW_CONFIDENCE;
          const left = Math.max(0, Math.min(100, (start / duration) * 100));
          const width = Math.max(0.6, ((end - start) / duration) * 100);
          return (
            <button
              key={seg.id}
              onClick={() => {
                if (!showProperties) useEditorStore.getState().toggleProperties();
                setRightTab("ai");
                jump(seg);
              }}
              title={`${decision ?? (low ? "pending · low confidence" : "pending")} · ${seg.reason ?? "AI edit"}`}
              aria-label={`AI edit at ${Math.round(start)}s: ${decision ?? "pending"}${low ? ", low confidence" : ""}`}
              className={cn(
                "absolute top-0 h-full rounded-full transition-transform hover:scale-y-125 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                decision === "accepted" && "bg-success",
                decision === "rejected" && "bg-destructive/70",
                !decision && (low ? "bg-warning" : "bg-primary/50"),
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
      </div>
      <p className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block size-1.5 rounded-full bg-success" /> Accepted</span>
        <span className="flex items-center gap-1"><span className="inline-block size-1.5 rounded-full bg-destructive/70" /> Rejected</span>
        <span className="flex items-center gap-1"><span className="inline-block size-1.5 rounded-full bg-primary/50" /> Pending</span>
        <span className="flex items-center gap-1"><span className="inline-block size-1.5 rounded-full bg-warning" /> Low confidence</span>
        <span className="ml-auto">{pending > 0 ? `${pending} to review` : "All reviewed"}</span>
      </p>
    </div>
  );
}
