import { useMemo, useState } from "react";
import { Captions, Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEditorStore } from "@/lib/editor-store";
import { api } from "@/lib/api-client";

export function CaptionsEditor() {
  const { videoId, tracks, updateClip, selectClip, selectedClipId, toggleCaptions, setCurrentTime } =
    useEditorStore();
  const [style, setStyle] = useState("clean_lower");
  const [exporting, setExporting] = useState<"srt" | "vtt" | null>(null);

  const captionClips = useMemo(
    () =>
      tracks
        .filter((t) => t.type === "text")
        .flatMap((t) => t.clips)
        .sort((a, b) => a.startTime - b.startTime),
    [tracks],
  );

  async function downloadCaptions(format: "srt" | "vtt") {
    if (!videoId) return;
    setExporting(format);
    try {
      const blob = await api.exportCaptions(videoId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `captions.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Captions className="size-4 text-primary" />
          <span className="text-sm font-medium">Captions</span>
        </div>
        <Button variant="ghost" size="icon" className="size-6" onClick={toggleCaptions}>
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="space-y-2 border-b border-border p-3">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Style preset</label>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="clean_lower">Clean lower-third</option>
          <option value="bold_pop">Bold pop</option>
          <option value="karaoke_fill">Karaoke</option>
          <option value="boxed">Boxed</option>
        </select>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            disabled={!!exporting}
            onClick={() => void downloadCaptions("srt")}
          >
            {exporting === "srt" ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
            <span className="ml-1">SRT</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            disabled={!!exporting}
            onClick={() => void downloadCaptions("vtt")}
          >
            {exporting === "vtt" ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
            <span className="ml-1">VTT</span>
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Style <code className="text-[10px]">{style}</code> applies on burn-in export. Save to persist caption text.
        </p>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
        {captionClips.length === 0 && (
          <p className="p-2 text-center text-xs text-muted-foreground">
            No caption clips yet. Captions from the edit plan appear here automatically.
          </p>
        )}
        {captionClips.map((clip) => (
          <button
            key={clip.id}
            type="button"
            onClick={() => {
              selectClip(clip.id);
              setCurrentTime(clip.startTime);
            }}
            className={`w-full rounded-md border p-2 text-left transition-colors ${
              selectedClipId === clip.id
                ? "border-primary bg-primary/10"
                : "border-border bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div className="mb-1 text-[10px] tabular-nums text-muted-foreground">
              {clip.startTime.toFixed(1)}s – {(clip.startTime + clip.duration).toFixed(1)}s
            </div>
            <Input
              value={clip.text ?? ""}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                updateClip(clip.id, { text: e.target.value, caption: e.target.value })
              }
              className="h-8 text-xs"
            />
          </button>
        ))}
      </div>
    </aside>
  );
}
