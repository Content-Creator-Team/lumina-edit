import { SlidersHorizontal, Trash2, Type, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useEditorStore, useSelectedClip } from "@/lib/editor-store";

export function PropertiesPanel() {
  const clip = useSelectedClip();
  const { updateClip, deleteClip, trimClip, toggleProperties } = useEditorStore();

  if (!clip) {
    return (
      <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Properties</span>
          </div>
          <Button variant="ghost" size="icon" className="size-6" onClick={toggleProperties}>×</Button>
        </div>
        <p className="p-4 text-xs text-muted-foreground">Select a clip on the timeline to edit its properties.</p>
      </aside>
    );
  }

  const endTrim = clip.trimIn + clip.duration;

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="size-4 text-primary" />
          <span className="text-sm font-medium">Properties</span>
        </div>
        <Button variant="ghost" size="icon" className="size-6" onClick={toggleProperties}>×</Button>
      </div>

      <div className="space-y-4 p-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Clip</p>
          <p className="text-xs font-medium capitalize">{clip.type}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {clip.startTime.toFixed(2)}s · {clip.duration.toFixed(2)}s
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Trim in (s)</Label>
          <Input
            type="number"
            step={0.1}
            min={0}
            value={Number(clip.trimIn.toFixed(2))}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v) || v < 0) return;
              const newDur = Math.max(0.1, endTrim - v);
              updateClip(clip.id, { trimIn: v, duration: newDur });
            }}
            className="h-8 text-xs"
          />
          <Label className="text-xs">Duration (s)</Label>
          <Input
            type="number"
            step={0.1}
            min={0.1}
            value={Number(clip.duration.toFixed(2))}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isFinite(v) || v < 0.1) return;
              updateClip(clip.id, { duration: v });
              trimClip(clip.id, clip.trimIn, clip.trimIn + v);
            }}
            className="h-8 text-xs"
          />
        </div>

        {(clip.type === "video" || clip.type === "audio") && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Volume2 className="size-3.5 text-muted-foreground" />
              <Label className="text-xs">Volume</Label>
              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                {Math.round((clip.volume ?? 1) * 100)}%
              </span>
            </div>
            <Slider
              value={[(clip.volume ?? 1) * 100]}
              min={0}
              max={200}
              step={1}
              onValueChange={([v]) => updateClip(clip.id, { volume: (v ?? 100) / 100 })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Opacity</Label>
          <Slider
            value={[(clip.opacity ?? 1) * 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => updateClip(clip.id, { opacity: (v ?? 100) / 100 })}
          />
        </div>

        {(clip.type === "video" || clip.type === "image") && (
          <div className="space-y-2 border-t border-border pt-3">
            <Label className="text-xs">Effects</Label>
            <select
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
              value={clip.effect ?? "none"}
              onChange={(e) =>
                updateClip(clip.id, {
                  effect: e.target.value as "none" | "fade" | "dissolve" | "zoom_in" | "zoom_out",
                })
              }
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="dissolve">Dissolve</option>
              <option value="zoom_in">Zoom in</option>
              <option value="zoom_out">Zoom out</option>
            </select>
            <Label className="text-xs">Brightness</Label>
            <Slider
              value={[Math.round((clip.brightness ?? 1) * 100)]}
              min={50}
              max={150}
              step={1}
              onValueChange={([v]) => updateClip(clip.id, { brightness: (v ?? 100) / 100 })}
            />
            <Label className="text-xs">Contrast</Label>
            <Slider
              value={[Math.round((clip.contrast ?? 1) * 100)]}
              min={50}
              max={150}
              step={1}
              onValueChange={([v]) => updateClip(clip.id, { contrast: (v ?? 100) / 100 })}
            />
            <Label className="text-xs">Saturation</Label>
            <Slider
              value={[Math.round((clip.saturation ?? 1) * 100)]}
              min={0}
              max={200}
              step={1}
              onValueChange={([v]) => updateClip(clip.id, { saturation: (v ?? 100) / 100 })}
            />
            <Label className="text-xs">Fade in (s)</Label>
            <Input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={clip.fadeIn ?? 0}
              onChange={(e) => updateClip(clip.id, { fadeIn: Number(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
            <Label className="text-xs">Fade out (s)</Label>
            <Input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={clip.fadeOut ?? 0}
              onChange={(e) => updateClip(clip.id, { fadeOut: Number(e.target.value) || 0 })}
              className="h-8 text-xs"
            />
          </div>
        )}

        {(clip.type === "text" || clip.caption) && (
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center gap-1.5">
              <Type className="size-3.5 text-muted-foreground" />
              <Label className="text-xs">Text / Caption</Label>
            </div>
            <textarea
              className="min-h-[72px] w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              value={clip.text ?? clip.caption ?? ""}
              onChange={(e) =>
                updateClip(clip.id, {
                  text: e.target.value,
                  caption: e.target.value,
                })
              }
            />
            <Label className="text-xs">Font size</Label>
            <Input
              type="number"
              min={10}
              max={96}
              value={clip.fontSize ?? 24}
              onChange={(e) => updateClip(clip.id, { fontSize: Number(e.target.value) || 24 })}
              className="h-8 text-xs"
            />
            <Label className="text-xs">Color</Label>
            <Input
              type="color"
              value={clip.fontColor ?? "#ffffff"}
              onChange={(e) => updateClip(clip.id, { fontColor: e.target.value })}
              className="h-8 p-1"
            />
          </div>
        )}

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => deleteClip(clip.id)}
        >
          <Trash2 className="mr-1.5 size-3.5" />
          Delete clip
        </Button>
      </div>
    </aside>
  );
}
