/**
 * Map editor timeline state back to an EditPlan PATCH payload.
 */
import type { Clip, Track } from "./editor-store";
import type { EditPlan, PlanPatch, PlanSegment } from "./api-types";

const SEG_PREFIX = "seg_";

function clipEffects(clip: Clip) {
  return {
    brightness: clip.brightness ?? 1,
    contrast: clip.contrast ?? 1,
    saturation: clip.saturation ?? 1,
    fade_in: clip.fadeIn ?? 0,
    fade_out: clip.fadeOut ?? 0,
    effect: clip.effect && clip.effect !== "none" ? clip.effect : null,
  };
}

export function segmentIdFromClipId(clipId: string): string | null {
  if (!clipId.startsWith(SEG_PREFIX)) return null;
  return clipId.slice(SEG_PREFIX.length);
}

export function clipIdForSegment(segmentId: string): string {
  return `${SEG_PREFIX}${segmentId}`;
}

/** Source window for a video clip (absolute seconds in the original file). */
export function sourceWindow(clip: Clip): { start: number; end: number } {
  const start = (clip.sourceStart ?? 0) + (clip.trimIn ?? 0);
  const end = start + clip.duration;
  return { start, end };
}

/**
 * Build a PlanPatch from the current timeline relative to the loaded plan.
 * - Video clips with seg_* ids → keep + update timing/caption/effects
 * - Plan segments missing from timeline → cut
 * - Caption text track updates caption on matching segment
 */
export function buildPlanPatchFromTimeline(
  plan: EditPlan,
  tracks: Track[],
): PlanPatch {
  const videoClips = tracks
    .filter((t) => t.type === "video")
    .flatMap((t) => t.clips)
    .sort((a, b) => a.startTime - b.startTime);

  const captionBySeg = new Map<string, string>();
  for (const track of tracks.filter((t) => t.type === "text")) {
    for (const clip of track.clips) {
      const sid = segmentIdFromClipId(clip.id.replace(/^cap_/, SEG_PREFIX))
        ?? (clip.id.startsWith("cap_") ? clip.id.slice(4) : null);
      if (sid && (clip.text || clip.caption)) {
        captionBySeg.set(sid, clip.text ?? clip.caption ?? "");
      }
    }
  }

  const present = new Map<string, Clip>();
  for (const clip of videoClips) {
    const sid = segmentIdFromClipId(clip.id);
    if (sid) present.set(sid, clip);
  }

  const segments: NonNullable<PlanPatch["segments"]> = [];
  let order = 0;

  for (const seg of plan.segments) {
    const clip = present.get(seg.id);
    if (clip) {
      const { start, end } = sourceWindow(clip);
      segments.push({
        id: seg.id,
        action: "keep",
        start_ts: start,
        end_ts: end,
        caption: captionBySeg.get(seg.id) ?? clip.caption ?? seg.caption ?? null,
        order: order++,
        ...clipEffects(clip),
      });
    } else {
      // Still in plan but removed from timeline → cut
      segments.push({
        id: seg.id,
        action: "cut",
        order: order++,
      });
    }
  }

  // New keep clips without seg_ prefix (e.g. smart clips) — create if we have a scene
  const create: NonNullable<PlanPatch["create"]> = [];
  const fallbackScene =
    plan.segments.find((s) => s.scene_id)?.scene_id ?? plan.segments[0]?.scene_id ?? null;

  for (const clip of videoClips) {
    if (segmentIdFromClipId(clip.id)) continue;
    if (!fallbackScene && !clip.sourceId) continue;
    const { start, end } = sourceWindow(clip);
    create.push({
      scene_id: clip.sourceId || fallbackScene!,
      action: "keep",
      start_ts: start,
      end_ts: Math.max(end, start + 0.1),
      caption: clip.caption ?? clip.text ?? null,
      order: order++,
      ...clipEffects(clip),
    });
  }

  return { segments, create, delete_ids: [] };
}

export function planToEditorTracks(plan: EditPlan): Track[] {
  const kept = plan.segments
    .filter((s) => s.action.toString().toLowerCase() === "keep")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (kept.length === 0) return [];

  let cursor = 0;
  const clips: Clip[] = kept.map((seg) => {
    const srcStart = seg.start_ts ?? seg.start ?? 0;
    const srcEnd = seg.end_ts ?? seg.end ?? srcStart + 30;
    const duration = Math.max(srcEnd - srcStart, 0.5);
    const effect = seg.effect as Clip["effect"] | undefined;
    const clip: Clip = {
      id: clipIdForSegment(seg.id),
      trackId: "vt1",
      startTime: cursor,
      duration,
      trimIn: 0,
      trimOut: 0,
      type: "video",
      sourceId: seg.scene_id ?? undefined,
      sourceStart: srcStart,
      caption: seg.caption ?? undefined,
      brightness: seg.brightness ?? 1,
      contrast: seg.contrast ?? 1,
      saturation: seg.saturation ?? 1,
      fadeIn: seg.fade_in ?? 0,
      fadeOut: seg.fade_out ?? 0,
      effect: effect && effect !== "none" ? effect : "none",
    };
    cursor += duration + 0.4;
    return clip;
  });

  const tracks: Track[] = [
    { id: "vt1", type: "video", name: "Video 1", muted: false, locked: false, visible: true, clips },
  ];

  const capClips: Clip[] = kept
    .filter((s) => s.caption)
    .map((seg) => {
      const vc = clips.find((c) => c.id === clipIdForSegment(seg.id));
      return {
        id: `cap_${seg.id}`,
        trackId: "tt1",
        startTime: vc?.startTime ?? 0,
        duration: vc?.duration ?? 5,
        trimIn: 0,
        trimOut: 0,
        type: "text" as const,
        text: seg.caption!,
        fontSize: 24,
        fontColor: "#ffffff",
        caption: seg.caption!,
        sourceStart: seg.start_ts ?? seg.start ?? 0,
      };
    });

  if (capClips.length > 0) {
    tracks.push({
      id: "tt1",
      type: "text",
      name: "Captions",
      muted: false,
      locked: false,
      visible: true,
      clips: capClips,
    });
  }

  return tracks;
}

/** Apply agent cut operations as timeline range removals (source-absolute → timeline). */
export function agentOpsToTimelineRanges(
  operations: Array<{ start_time: number; end_time: number }>,
  tracks: Track[],
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const videoClips = tracks.filter((t) => t.type === "video").flatMap((t) => t.clips);

  for (const op of operations) {
    for (const clip of videoClips) {
      const src = sourceWindow(clip);
      const overlapStart = Math.max(op.start_time, src.start);
      const overlapEnd = Math.min(op.end_time, src.end);
      if (overlapEnd <= overlapStart) continue;
      const timelineStart = clip.startTime + (overlapStart - src.start);
      const timelineEnd = clip.startTime + (overlapEnd - src.start);
      ranges.push({ start: timelineStart, end: timelineEnd });
    }
  }
  return ranges;
}

export type { PlanSegment };
