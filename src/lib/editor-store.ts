import { create } from "zustand";

// ── types ─────────────────────────────────────────────────────────────────────

export type TrackType = "video" | "audio" | "text" | "image" | "effect";

export interface Clip {
  id: string;
  trackId: string;
  /** Position on the timeline in seconds */
  startTime: number;
  duration: number;
  trimIn: number;
  trimOut: number;
  sourceId?: string;
  /** Absolute start time in the source media (seconds) */
  sourceStart?: number;
  type: TrackType;
  text?: string;
  fontSize?: number;
  fontColor?: string;
  volume?: number;
  muted?: boolean;
  opacity?: number;
  caption?: string;
  /** Visual effects (0–2 range for brightness/contrast/saturation where 1 = neutral) */
  brightness?: number;
  contrast?: number;
  saturation?: number;
  fadeIn?: number;
  fadeOut?: number;
  effect?: "none" | "fade" | "dissolve" | "zoom_in" | "zoom_out";
}

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  clips: Clip[];
}

interface EditorState {
  videoId: string | null;
  planId: string | null;
  tracks: Track[];
  currentTime: number;
  duration: number;
  zoom: number;
  playing: boolean;
  selectedClipId: string | null;
  selectedTrackId: string | null;
  snapEnabled: boolean;
  showCopilot: boolean;
  showMediaLibrary: boolean;
  showProperties: boolean;
  showCaptions: boolean;
  showExport: boolean;
  dirty: boolean;
  past: Array<{ tracks: Track[]; duration: number }>;
  future: Array<{ tracks: Track[]; duration: number }>;
}

interface EditorActions {
  init: (videoId: string, tracks: Track[], duration: number, planId?: string | null) => void;
  setCurrentTime: (t: number) => void;
  setPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  selectClip: (id: string | null) => void;
  selectTrack: (id: string | null) => void;
  toggleSnapEnabled: () => void;
  toggleCopilot: () => void;
  toggleMediaLibrary: () => void;
  toggleProperties: () => void;
  toggleCaptions: () => void;
  setShowExport: (open: boolean) => void;
  markClean: () => void;
  undo: () => void;
  redo: () => void;

  addTrack: (type: TrackType, name?: string) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, patch: Partial<Omit<Track, "id" | "clips">>) => void;

  addClip: (trackId: string, clip: Omit<Clip, "id" | "trackId">) => void;
  updateClip: (id: string, patch: Partial<Omit<Clip, "id" | "trackId">>) => void;
  moveClip: (clipId: string, targetTrackId: string, startTime: number) => void;
  trimClip: (clipId: string, trimIn: number, trimOut: number) => void;
  deleteClip: (clipId: string) => void;
  splitClip: (clipId: string, splitAt: number) => void;
  cutRanges: (ranges: Array<{ start: number; end: number }>) => void;
}

export type EditorStore = EditorState & EditorActions;

let _nextId = 1;
const uid = () => `clip_${_nextId++}_${Math.random().toString(36).slice(2, 6)}`;

function findClip(tracks: Track[], clipId: string): [Track, Clip] | null {
  for (const track of tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) return [track, clip];
  }
  return null;
}

function snapshot(s: EditorState) {
  return { tracks: s.tracks, duration: s.duration };
}

function withHistory(s: EditorState, next: Partial<EditorState>): Partial<EditorState> {
  return {
    past: [...s.past.slice(-49), snapshot(s)],
    future: [],
    dirty: true,
    ...next,
  };
}

function applyCutRanges(tracks: Track[], ranges: Array<{ start: number; end: number }>): Track[] {
  if (ranges.length === 0) return tracks;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);

  return tracks.map((track) => {
    if (track.type !== "video" && track.type !== "audio") return track;
    const nextClips: Clip[] = [];
    for (const clip of track.clips) {
      let pieces: Clip[] = [{ ...clip }];
      for (const range of sorted) {
        const rebuilt: Clip[] = [];
        for (const p of pieces) {
          const ps = p.startTime;
          const pe = p.startTime + p.duration;
          if (range.end <= ps || range.start >= pe) {
            rebuilt.push(p);
            continue;
          }
          if (range.start > ps) {
            rebuilt.push({ ...p, duration: range.start - ps });
          }
          if (range.end < pe) {
            rebuilt.push({
              ...p,
              id: uid(),
              startTime: range.end,
              duration: pe - range.end,
              trimIn: p.trimIn + (range.end - ps),
            });
          }
        }
        pieces = rebuilt.filter((c) => c.duration > 0.05);
      }
      nextClips.push(...pieces);
    }
    return { ...track, clips: nextClips };
  });
}

export const useEditorStore = create<EditorStore>()((set, get) => ({
  videoId: null,
  planId: null,
  tracks: [],
  currentTime: 0,
  duration: 0,
  zoom: 80,
  playing: false,
  selectedClipId: null,
  selectedTrackId: null,
  snapEnabled: true,
  showCopilot: false,
  showMediaLibrary: true,
  showProperties: true,
  showCaptions: false,
  showExport: false,
  dirty: false,
  past: [],
  future: [],

  init: (videoId, tracks, duration, planId = null) =>
    set({
      videoId,
      planId: planId ?? null,
      tracks,
      duration,
      currentTime: 0,
      selectedClipId: null,
      past: [],
      future: [],
      dirty: false,
    }),

  setCurrentTime: (t) => set({ currentTime: Math.max(0, Math.min(t, get().duration)) }),
  setPlaying: (playing) => set({ playing }),
  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(zoom, 400)) }),
  selectClip: (id) => set({ selectedClipId: id, showProperties: id ? true : get().showProperties }),
  selectTrack: (id) => set({ selectedTrackId: id }),
  toggleSnapEnabled: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  toggleCopilot: () => set((s) => ({ showCopilot: !s.showCopilot })),
  toggleMediaLibrary: () => set((s) => ({ showMediaLibrary: !s.showMediaLibrary })),
  toggleProperties: () => set((s) => ({ showProperties: !s.showProperties })),
  toggleCaptions: () => set((s) => ({ showCaptions: !s.showCaptions })),
  setShowExport: (open) => set({ showExport: open }),
  markClean: () => set({ dirty: false }),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return s;
      return {
        ...prev,
        past: s.past.slice(0, -1),
        future: [snapshot(s), ...s.future.slice(0, 49)],
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return s;
      return {
        ...next,
        past: [...s.past.slice(-49), snapshot(s)],
        future: s.future.slice(1),
      };
    }),

  addTrack: (type, name) =>
    set((s) => {
      const count = s.tracks.filter((t) => t.type === type).length + 1;
      const track: Track = {
        id: uid(),
        type,
        name: name ?? `${type[0].toUpperCase()}${type.slice(1)} ${count}`,
        muted: false,
        locked: false,
        visible: true,
        clips: [],
      };
      return withHistory(s, { tracks: [...s.tracks, track] });
    }),

  removeTrack: (id) =>
    set((s) => withHistory(s, { tracks: s.tracks.filter((t) => t.id !== id) })),

  updateTrack: (id, patch) =>
    set((s) => ({
      tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),

  addClip: (trackId, clipData) =>
    set((s) =>
      withHistory(s, {
        tracks: s.tracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: [...t.clips, { ...clipData, id: uid(), trackId }] }
            : t,
        ),
      }),
    ),

  updateClip: (id, patch) =>
    set((s) =>
      withHistory(s, {
        tracks: s.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      }),
    ),

  moveClip: (clipId, targetTrackId, startTime) =>
    set((s) => {
      const found = findClip(s.tracks, clipId);
      if (!found) return s;
      const [, clip] = found;
      const moved = { ...clip, startTime: Math.max(0, startTime), trackId: targetTrackId };
      const tracks = s.tracks.map((t) => {
        if (t.id === clip.trackId && t.id !== targetTrackId)
          return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
        if (t.id === targetTrackId && t.id !== clip.trackId)
          return { ...t, clips: [...t.clips, moved] };
        if (t.id === targetTrackId)
          return { ...t, clips: t.clips.map((c) => (c.id === clipId ? moved : c)) };
        return t;
      });
      return withHistory(s, { tracks });
    }),

  trimClip: (clipId, trimIn, trimOut) =>
    set((s) =>
      withHistory(s, {
        tracks: s.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => (c.id === clipId ? { ...c, trimIn, trimOut } : c)),
        })),
      }),
    ),

  deleteClip: (clipId) =>
    set((s) =>
      withHistory(s, {
        tracks: s.tracks.map((t) => ({ ...t, clips: t.clips.filter((c) => c.id !== clipId) })),
        selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId,
      }),
    ),

  splitClip: (clipId, splitAt) =>
    set((s) => {
      const found = findClip(s.tracks, clipId);
      if (!found) return s;
      const [track, clip] = found;
      const offset = splitAt - clip.startTime;
      if (offset <= 0.05 || offset >= clip.duration - 0.05) return s;
      const left: Clip = { ...clip, duration: offset };
      const right: Clip = {
        ...clip,
        id: uid(),
        startTime: splitAt,
        duration: clip.duration - offset,
        trimIn: clip.trimIn + offset,
      };
      return withHistory(s, {
        tracks: s.tracks.map((t) =>
          t.id === track.id
            ? { ...t, clips: t.clips.flatMap((c) => (c.id === clipId ? [left, right] : [c])) }
            : t,
        ),
      });
    }),

  cutRanges: (ranges) =>
    set((s) => withHistory(s, { tracks: applyCutRanges(s.tracks, ranges) })),
}));

export const useCanUndo = () => useEditorStore((s) => s.past.length > 0);
export const useCanRedo = () => useEditorStore((s) => s.future.length > 0);
export const useSelectedClip = () =>
  useEditorStore((s) => {
    if (!s.selectedClipId) return null;
    for (const t of s.tracks) {
      const c = t.clips.find((c) => c.id === s.selectedClipId);
      if (c) return c;
    }
    return null;
  });
