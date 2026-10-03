import { useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { useEditorStore, type Track, type Clip, type TrackType } from "@/lib/editor-store";
import { Eye, EyeOff, Volume2, VolumeX, Lock, Unlock, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRACK_HEIGHT = 48;
const HEADER_WIDTH = 180;

const TRACK_COLORS: Record<TrackType, string> = {
  video: "bg-primary/80 border-primary",
  audio: "bg-green-600/80 border-green-500",
  text: "bg-amber-500/80 border-amber-400",
  image: "bg-purple-600/80 border-purple-500",
  effect: "bg-rose-600/80 border-rose-500",
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
}

function TimelineRuler({ duration, zoom }: { duration: number; zoom: number }) {
  const step = zoom >= 100 ? 1 : zoom >= 40 ? 5 : zoom >= 20 ? 10 : 30;
  const ticks: number[] = [];
  for (let t = 0; t <= duration + step; t += step) ticks.push(t);
  return (
    <div className="relative h-7 select-none border-b border-border bg-muted/40 text-[10px] text-muted-foreground">
      {ticks.map((t) => (
        <div key={t} className="absolute top-0 flex flex-col items-start" style={{ left: t * zoom }}>
          <div className="h-3 w-px bg-border" />
          <span className="ml-1">{fmt(t)}</span>
        </div>
      ))}
    </div>
  );
}

function ClipBlock({
  clip, zoom, isSelected, trackLocked, onSelect, onDragStart,
}: {
  clip: Clip; zoom: number; isSelected: boolean; trackLocked: boolean;
  onSelect: (id: string) => void; onDragStart: (e: React.MouseEvent, id: string) => void;
}) {
  const left = clip.startTime * zoom;
  const width = Math.max(clip.duration * zoom, 4);
  return (
    <div
      className={cn(
        "absolute top-1 flex h-10 cursor-pointer select-none items-center overflow-hidden rounded border px-1.5 text-[10px] font-medium text-white",
        TRACK_COLORS[clip.type],
        isSelected && "ring-2 ring-white ring-offset-1 ring-offset-background",
        trackLocked && "cursor-not-allowed opacity-60"
      )}
      style={{ left, width }}
      onMouseDown={(e) => { if (trackLocked) return; e.stopPropagation(); onSelect(clip.id); onDragStart(e, clip.id); }}
      title={clip.text ?? clip.caption ?? clip.type}
    >
      <span className="truncate">{clip.text ?? clip.caption ?? clip.type}</span>
    </div>
  );
}

function TrackHeader({ track }: { track: Track }) {
  const { updateTrack, removeTrack, selectTrack, selectedTrackId } = useEditorStore();
  return (
    <div
      className={cn("flex h-12 cursor-pointer items-center gap-1.5 border-b border-r border-border px-2 text-xs", selectedTrackId === track.id && "bg-accent")}
      style={{ width: HEADER_WIDTH }}
      onClick={() => selectTrack(track.id)}
    >
      <span className="flex-1 truncate font-medium">{track.name}</span>
      <button className="text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); updateTrack(track.id, { visible: !track.visible }); }}>
        {track.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
      </button>
      <button className="text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); updateTrack(track.id, { muted: !track.muted }); }}>
        {track.muted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
      </button>
      <button className="text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); updateTrack(track.id, { locked: !track.locked }); }}>
        {track.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
      </button>
      <button className="text-muted-foreground hover:text-red-400" onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}>
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}

function TrackLane({ track, zoom, totalWidth, onSelect, onDragStart }: {
  track: Track; zoom: number; totalWidth: number;
  onSelect: (id: string) => void; onDragStart: (e: React.MouseEvent, id: string) => void;
}) {
  const { selectedClipId, setCurrentTime } = useEditorStore();
  return (
    <div
      className="relative h-12 border-b border-border"
      style={{ width: totalWidth }}
      onDoubleClick={(e) => {
        if (track.locked) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setCurrentTime((e.clientX - rect.left) / zoom);
      }}
    >
      {track.clips.map((clip) => (
        <ClipBlock key={clip.id} clip={clip} zoom={zoom} isSelected={selectedClipId === clip.id}
          trackLocked={track.locked} onSelect={onSelect} onDragStart={onDragStart} />
      ))}
    </div>
  );
}

function Playhead({ currentTime, zoom, totalHeight }: { currentTime: number; zoom: number; totalHeight: number }) {
  return (
    <div className="pointer-events-none absolute top-0 z-20 flex flex-col items-center" style={{ left: currentTime * zoom, height: totalHeight }}>
      <div className="size-2 rotate-45 bg-orange-400" style={{ marginTop: -1 }} />
      <div className="w-px flex-1 bg-orange-400/70" />
    </div>
  );
}

export function Timeline() {
  const { tracks, currentTime, duration, zoom, setCurrentTime, setZoom, addTrack, selectClip, moveClip } = useEditorStore();
  const totalWidth = Math.max(duration * zoom + 200, 800);
  const totalHeight = tracks.length * TRACK_HEIGHT;
  const dragRef = useRef<{ clipId: string; startX: number; origStart: number; origTrackId: string } | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent, clipId: string) => {
    const clip = tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
    const track = tracks.find((t) => t.clips.some((c) => c.id === clipId));
    if (!clip || !track) return;
    dragRef.current = { clipId, startX: e.clientX, origStart: clip.startTime, origTrackId: track.id };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = me.clientX - dragRef.current.startX;
      moveClip(clipId, dragRef.current.origTrackId, Math.max(0, dragRef.current.origStart + dx / zoom));
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [tracks, zoom, moveClip]);

  return (
    <div className="flex flex-col border-t border-border bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <span className="text-xs text-muted-foreground">Zoom</span>
        <input type="range" min={10} max={300} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-1 w-24 accent-primary" />
        <span className="w-10 text-xs tabular-nums text-muted-foreground">{zoom}px/s</span>
        <span className="text-xs text-muted-foreground">{fmt(currentTime)}</span>
        <div className="ml-auto flex gap-1">
          {(["video", "audio", "text"] as TrackType[]).map((t) => (
            <Button key={t} variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => addTrack(t)}>
              <Plus className="mr-0.5 size-3" />{t}
            </Button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex overflow-hidden" style={{ height: Math.max(totalHeight + 28, 160) }}>
        {/* Track headers */}
        <div className="flex-shrink-0" style={{ width: HEADER_WIDTH }}>
          <div className="h-7 border-b border-r border-border bg-muted/40" />
          {tracks.map((t) => <TrackHeader key={t.id} track={t} />)}
        </div>

        {/* Scrollable tracks */}
        <div className="relative flex-1 overflow-auto">
          {/* Ruler */}
          <div className="sticky top-0 z-10 cursor-pointer" style={{ width: totalWidth }}
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCurrentTime((e.clientX - r.left) / zoom); }}>
            <TimelineRuler duration={duration} zoom={zoom} />
          </div>
          {/* Lanes */}
          <div className="relative" style={{ width: totalWidth }}>
            {tracks.map((t) => (
              <TrackLane key={t.id} track={t} zoom={zoom} totalWidth={totalWidth} onSelect={selectClip} onDragStart={handleDragStart} />
            ))}
            <Playhead currentTime={currentTime} zoom={zoom} totalHeight={Math.max(totalHeight, 48)} />
          </div>
        </div>
      </div>
    </div>
  );
}
