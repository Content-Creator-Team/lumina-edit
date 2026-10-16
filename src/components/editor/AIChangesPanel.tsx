import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleAlert, Scissors, Sparkles, Star, Undo2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EditPlan, PlanSegment } from "@/lib/api-types";
import { useEditorStore } from "@/lib/editor-store";
import { formatTimecode } from "@/lib/queries";
import { clipForSegment, clipIdForSegment } from "@/lib/timeline-persist";
import { cn } from "@/lib/utils";

export const LOW_CONFIDENCE = 0.65;

type Filter = "all" | "keep" | "cut" | "review";

function isCut(seg: PlanSegment) {
  return String(seg.action).toLowerCase() === "cut";
}

/**
 * Tracked-changes view of every AI decision in the plan. Accepting leaves the
 * timeline as the AI proposed; rejecting reverses that one decision on the
 * timeline (restore a cut, or remove a kept part). Nothing is saved until the
 * user presses Save.
 */
export function AIChangesPanel({ plan }: { plan: EditPlan | undefined }) {
  const { aiDecisions, setAiDecision, deleteClip, restoreClip, tracks, selectClip, setCurrentTime } =
    useEditorStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [focusId, setFocusId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const segments = useMemo(
    () => [...(plan?.segments ?? [])].sort((a, b) => (a.start_ts ?? a.start) - (b.start_ts ?? b.start)),
    [plan],
  );

  if (!plan) {
    return <p className="p-4 text-sm text-muted-foreground">No edit plan loaded yet.</p>;
  }
  if (segments.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">The AI plan has no edits to review.</p>;
  }

  const hasConfidence = segments.some((s) => typeof s.confidence === "number");
  const visible = segments.filter((s) => {
    if (filter === "keep") return !isCut(s);
    if (filter === "cut") return isCut(s);
    if (filter === "review") return typeof s.confidence === "number" && s.confidence < LOW_CONFIDENCE;
    return true;
  });
  const reviewed = segments.filter((s) => aiDecisions[s.id]).length;

  const timelineEnd = () =>
    tracks
      .filter((t) => t.type === "video")
      .flatMap((t) => t.clips)
      .reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);

  const accept = (seg: PlanSegment) => {
    // Undo a previous reject so the timeline matches the AI proposal again.
    if (aiDecisions[seg.id] === "rejected") {
      revert(seg);
      setAiDecision([seg.id], "accepted", false);
    } else setAiDecision([seg.id], "accepted");
  };

  const reject = (seg: PlanSegment) => {
    if (aiDecisions[seg.id] === "rejected") return;
    if (isCut(seg)) restoreClip("vt1", clipForSegment(seg, timelineEnd() + 0.4));
    else deleteClip(clipIdForSegment(seg.id));
    setAiDecision([seg.id], "rejected", false);
  };

  const revert = (seg: PlanSegment) => {
    if (isCut(seg)) deleteClip(clipIdForSegment(seg.id));
    else restoreClip("vt1", clipForSegment(seg, timelineEnd() + 0.4));
  };

  const undoDecision = (seg: PlanSegment) => {
    if (aiDecisions[seg.id] === "rejected") {
      revert(seg);
      setAiDecision([seg.id], null, false);
    } else setAiDecision([seg.id], null);
  };

  const acceptAll = (kind: "keep" | "cut") => {
    for (const s of segments.filter((s) => (kind === "cut" ? isCut(s) : !isCut(s)))) accept(s);
  };

  const jump = (seg: PlanSegment) => {
    const clip = tracks.flatMap((t) => t.clips).find((c) => c.id === clipIdForSegment(seg.id));
    if (clip) {
      selectClip(clip.id);
      setCurrentTime(clip.startTime);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-border p-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          {reviewed} of {segments.length} AI edits reviewed
        </p>
        <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="bg-brand-gradient h-full transition-all" style={{ width: `${(reviewed / segments.length) * 100}%` }} />
        </div>
        <div role="tablist" aria-label="Filter AI edits" className="flex flex-wrap gap-1">
          {(
            [
              ["all", "All"],
              ["keep", "Kept"],
              ["cut", "Cut"],
              ...(hasConfidence ? [["review", "Needs review"] as const] : []),
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                filter === key ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" onClick={() => acceptAll("cut")}>
            Accept all cuts
          </Button>
          <Button size="sm" variant="outline" className="h-7 flex-1 text-[11px]" onClick={() => acceptAll("keep")}>
            Accept all keeps
          </Button>
        </div>
        {!hasConfidence && (
          <p className="text-[10px] text-muted-foreground">The backend didn't report confidence for this plan.</p>
        )}
      </div>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {visible.map((seg) => {
          const cut = isCut(seg);
          const decision = aiDecisions[seg.id];
          const low = typeof seg.confidence === "number" && seg.confidence < LOW_CONFIDENCE;
          return (
            <li
              key={seg.id}
              className={cn(
                "ai-change-card rounded-lg border bg-card p-2.5 text-xs",
                low && !decision ? "border-warning/60" : "border-border",
                decision === "rejected" && "opacity-70",
              )}
            >
              <button
                type="button"
                onClick={() => jump(seg)}
                className="flex w-full items-center gap-1.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {cut ? <Scissors className="size-3.5 text-destructive" aria-hidden="true" /> : <Star className="size-3.5 text-primary" aria-hidden="true" />}
                <span className="font-medium">{cut ? "Cut" : "Keep"}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatTimecode(seg.start_ts ?? seg.start)}–{formatTimecode(seg.end_ts ?? seg.end)}
                </span>
                {typeof seg.confidence === "number" && (
                  <span
                    className={cn(
                      "ml-auto rounded px-1.5 py-0.5 font-mono text-[10px]",
                      low ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground",
                    )}
                    title="AI confidence"
                  >
                    {low && <CircleAlert className="mr-0.5 inline size-3" aria-hidden="true" />}
                    {Math.round(seg.confidence * 100)}%
                  </span>
                )}
              </button>
              <p className="mt-1.5 text-muted-foreground">
                {seg.reason ?? "The AI didn't give a reason for this edit."}
              </p>
              {seg.caption && <p className="mt-1 truncate italic">“{seg.caption}”</p>}
              {cut && decision === "rejected" && (
                <button
                  className="mt-1 text-[11px] text-primary underline-offset-2 hover:underline"
                  onClick={() =>
                    useEditorStore
                      .getState()
                      .sendCopilotPrompt(
                        `Suggest a different cut between ${formatTimecode(seg.start_ts ?? seg.start)} and ${formatTimecode(seg.end_ts ?? seg.end)}`,
                      )
                  }
                >
                  Ask the AI for a different cut here
                </button>
              )}
              <div className="mt-2 flex items-center gap-1">
                {decision ? (
                  <>
                    <span className={cn("text-[11px] font-medium", decision === "accepted" ? "text-success" : "text-destructive")}>
                      {decision === "accepted" ? "Accepted" : "Rejected"}
                    </span>
                    <Button size="sm" variant="ghost" className="ml-auto h-6 px-2 text-[11px]" onClick={() => undoDecision(seg)}>
                      <Undo2 className="size-3" /> Undo
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="secondary" className="h-6 px-2 text-[11px]" onClick={() => accept(seg)}>
                      <Check className="size-3" /> Accept
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => reject(seg)}>
                      <X className="size-3" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto h-6 px-2 text-[11px]"
                      title={cut ? "Bring this part back so you can trim it yourself" : "Select this clip to adjust it"}
                      onClick={() => {
                        if (cut) reject(seg);
                        setTimeout(() => jump(seg), 0);
                      }}
                    >
                      Tweak
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {visible.length === 0 && <li className="text-sm text-muted-foreground">Nothing in this filter.</li>}
      </ul>
    </div>
  );
}
