import { useRef, useEffect, useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function fmtTC(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const f = Math.floor((s % 1) * 30);
  return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}:${f.toString().padStart(2,"0")}`;
}

/** Canvas-based preview player. Renders text/caption clips; video clips show placeholder. */
export function PreviewCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const { tracks, currentTime, duration, playing, setCurrentTime, setPlaying } = useEditorStore();

  // Playback RAF loop
  useEffect(() => {
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastRef.current = null; return; }
    const tick = (now: number) => {
      const dt = lastRef.current ? (now - lastRef.current) / 1000 : 0;
      lastRef.current = now;
      const next = currentTime + dt;
      if (next >= duration) { setPlaying(false); setCurrentTime(0); return; }
      setCurrentTime(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, currentTime, duration, setCurrentTime, setPlaying]);

  // Canvas draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, W, H);

    for (const track of tracks) {
      if (!track.visible || track.muted) continue;
      for (const clip of track.clips) {
        const end = clip.startTime + clip.duration;
        if (currentTime < clip.startTime || currentTime > end) continue;
        if (clip.type === "text" && clip.text) {
          ctx.save();
          ctx.globalAlpha = clip.opacity ?? 1;
          ctx.font = `bold ${clip.fontSize ?? 26}px sans-serif`;
          ctx.fillStyle = clip.fontColor ?? "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.strokeText(clip.text, W / 2, H - 40);
          ctx.fillText(clip.text, W / 2, H - 40);
          ctx.restore();
        } else if (clip.type === "video" || clip.type === "image") {
          ctx.save();
          ctx.globalAlpha = clip.opacity ?? 1;
          // Approximate brightness/contrast via fill overlays
          ctx.fillStyle = "#1a1a2e";
          ctx.fillRect(0, 0, W, H);
          const b = clip.brightness ?? 1;
          const c = clip.contrast ?? 1;
          const s = clip.saturation ?? 1;
          if (b !== 1 || c !== 1) {
            ctx.fillStyle = b > 1 ? `rgba(255,255,255,${(b - 1) * 0.4})` : `rgba(0,0,0,${(1 - b) * 0.5})`;
            ctx.fillRect(0, 0, W, H);
          }
          // Zoom effect preview
          let scale = 1;
          const localT = (currentTime - clip.startTime) / Math.max(clip.duration, 0.01);
          if (clip.effect === "zoom_in") scale = 1 + localT * 0.15;
          if (clip.effect === "zoom_out") scale = 1.15 - localT * 0.15;
          if (scale !== 1) {
            ctx.translate(W / 2, H / 2);
            ctx.scale(scale, scale);
            ctx.translate(-W / 2, -H / 2);
          }
          ctx.fillStyle = `hsla(220, ${Math.round(20 * s)}%, 18%, 1)`;
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#ffffff40";
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(clip.caption ?? clip.sourceId ?? "Video", W / 2, H / 2 - 10);
          ctx.font = "11px monospace";
          ctx.fillStyle = "#ffffff30";
          ctx.fillText(
            `${clip.startTime.toFixed(1)}s – ${end.toFixed(1)}s · ${clip.effect ?? "none"}`,
            W / 2,
            H / 2 + 16,
          );
          // Fade overlays
          if ((clip.fadeIn ?? 0) > 0 && currentTime - clip.startTime < (clip.fadeIn ?? 0)) {
            const a = 1 - (currentTime - clip.startTime) / (clip.fadeIn ?? 1);
            ctx.fillStyle = `rgba(0,0,0,${a})`;
            ctx.fillRect(0, 0, W, H);
          }
          if ((clip.fadeOut ?? 0) > 0 && end - currentTime < (clip.fadeOut ?? 0)) {
            const a = 1 - (end - currentTime) / (clip.fadeOut ?? 1);
            ctx.fillStyle = `rgba(0,0,0,${a})`;
            ctx.fillRect(0, 0, W, H);
          }
          ctx.restore();
        }
      }
    }

    // Timecode
    ctx.save();
    ctx.fillStyle = "#ffffff60";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(fmtTC(currentTime), 8, H - 6);
    ctx.restore();
  }, [tracks, currentTime]);

  const seek = useCallback((d: number) => setCurrentTime(currentTime + d), [currentTime, setCurrentTime]);

  return (
    <div className={cn("flex flex-col items-stretch gap-2 bg-black", className)}>
      <div className="relative flex-1 overflow-hidden bg-black">
        <canvas ref={canvasRef} width={1280} height={720} className="h-full w-full object-contain" />
      </div>
      <div className="flex shrink-0 items-center justify-center gap-1.5 pb-2">
        <Button variant="ghost" size="icon" className="size-7" onClick={() => { setCurrentTime(0); setPlaying(false); }}>
          <SkipBack className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-7" onClick={() => seek(-5)}>
          <span className="text-[9px] font-bold">-5</span>
        </Button>
        <Button variant="ghost" size="icon" className="size-9 rounded-full border border-border" onClick={() => setPlaying(!playing)}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="size-7" onClick={() => seek(5)}>
          <span className="text-[9px] font-bold">+5</span>
        </Button>
        <Button variant="ghost" size="icon" className="size-7" onClick={() => { setCurrentTime(duration); setPlaying(false); }}>
          <SkipForward className="size-3.5" />
        </Button>
        <span className="ml-2 font-mono text-[11px] text-muted-foreground tabular-nums">
          {fmtTC(currentTime)} / {fmtTC(duration)}
        </span>
      </div>
    </div>
  );
}
