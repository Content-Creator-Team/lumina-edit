import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, Download, ListOrdered, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "@/lib/editor-store";
import { api } from "@/lib/api-client";
import { formatTimecode, transcriptQuery } from "@/lib/queries";

/** Chapters + a YouTube description drafted from the transcript (client-side). */
function ChaptersBlock({ videoId }: { videoId: string }) {
  const q = useQuery({ ...transcriptQuery(videoId), staleTime: 60_000 });
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => {
    const segs = q.data?.segments ?? [];
    if (segs.length === 0) return null;
    // One chapter per ~30s of speech, titled by the first words of the segment.
    const chapters: string[] = [];
    let last = -30;
    for (const s of segs) {
      const start = s.start ?? s.start_time ?? 0;
      if (start - last >= 30 || chapters.length === 0) {
        const title = s.text.trim().split(/\s+/).slice(0, 6).join(" ").replace(/[.!?]+$/, "");
        chapters.push(`${formatTimecode(start)} ${title}`);
        last = start;
      }
      if (chapters.length >= 12) break;
    }
    const summary = segs[0] ? segs[0].text.trim().slice(0, 140) : "";
    return `${summary}${summary.length === 140 ? "…" : ""}\n\nChapters:\n${chapters.join("\n")}`;
  }, [q.data]);

  if (!text) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs">
          <ListOrdered className="size-3.5" aria-hidden="true" />
          Chapters &amp; description (from the transcript)
        </Label>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 px-2 text-[10px]"
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? <Check className="size-3 text-success" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">{text}</pre>
      <p className="text-[10px] text-muted-foreground">
        Drafted from the transcript — review before pasting into YouTube. Chapters are estimated every ~30s of speech.
      </p>
    </div>
  );
}

type Props = {
  onBeforeExport?: () => Promise<void>;
};

export function ExportModal({ onBeforeExport }: Props) {
  const { showExport, setShowExport, planId, videoId, dirty, aiDecisions, setRightTab, showProperties, toggleProperties } = useEditorStore();
  const navigate = useNavigate();
  const [presetId, setPresetId] = useState("youtube_shorts");
  const [burnCaptions, setBurnCaptions] = useState(true);
  const [brandKitId, setBrandKitId] = useState<string>("");
  const [preferFaces, setPreferFaces] = useState(true);
  const [ackLowConf, setAckLowConf] = useState(false);

  const planQ = useQuery({
    queryKey: ["edit-plan", videoId],
    queryFn: () => api.getEditPlan(videoId!),
    enabled: showExport && !!videoId,
    staleTime: 30_000,
  });

  // Pre-export check: unreviewed low-confidence edits.
  const unreviewedLow = useMemo(
    () =>
      (planQ.data?.segments ?? []).filter(
        (s) => typeof s.confidence === "number" && s.confidence < 0.65 && !aiDecisions[s.id],
      ),
    [planQ.data, aiDecisions],
  );
  const showLowConfWarning = unreviewedLow.length > 0 && !ackLowConf;

  const presetsQ = useQuery({
    queryKey: ["export-presets"],
    queryFn: () => api.listExportPresets(),
    enabled: showExport,
    staleTime: 10 * 60_000,
  });

  const kitsQ = useQuery({
    queryKey: ["brand-kits"],
    queryFn: () => api.listBrandKits(),
    enabled: showExport,
    staleTime: 60_000,
  });

  const selected = useMemo(
    () => presetsQ.data?.presets.find((p) => p.id === presetId),
    [presetsQ.data, presetId],
  );

  const exportMut = useMutation({
    mutationFn: async () => {
      if (!planId) throw new Error("No edit plan loaded — open a video with a draft plan.");
      if (onBeforeExport) await onBeforeExport();
      return api.approvePlan(planId, {
        preset_id: presetId,
        burn_captions: burnCaptions,
        brand_kit_id: brandKitId || null,
        prefer_faces: preferFaces,
      });
    },
    onSuccess: (job) => {
      setShowExport(false);
      const jobId = job.id ?? job.render_job_id ?? job.job_id;
      if (videoId && jobId) {
        void navigate({
          to: "/videos/$id/render",
          params: { id: videoId },
          search: { job: jobId },
        });
      }
    },
  });

  return (
    <Dialog open={showExport} onOpenChange={(open) => { setShowExport(open); if (!open) setAckLowConf(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            Choose a platform preset. Unsaved timeline edits are saved before render.
            {dirty ? " You have unsaved changes." : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Platform preset</Label>
            <select
              className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
            >
              {(presetsQ.data?.presets ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.aspect_ratio})
                </option>
              ))}
            </select>
            {selected && (
              <p className="text-[11px] text-muted-foreground">
                {selected.description}
                {selected.width > 0 && ` · ${selected.width}×${selected.height}`}
                {selected.max_duration_s != null && ` · ≤${selected.max_duration_s}s`}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Brand kit (optional)</Label>
            <select
              className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              value={brandKitId}
              onChange={(e) => setBrandKitId(e.target.value)}
            >
              <option value="">None</option>
              {(kitsQ.data ?? []).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}{k.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={burnCaptions} onChange={(e) => setBurnCaptions(e.target.checked)} />
            Burn captions into video
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={preferFaces} onChange={(e) => setPreferFaces(e.target.checked)} />
            Prefer face-centered reframing
          </label>

          {showLowConfWarning && (
            <div role="alert" className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-xs">
              <p className="font-medium text-foreground">
                {unreviewedLow.length} low-confidence edit{unreviewedLow.length === 1 ? "" : "s"} not reviewed
              </p>
              <p className="mt-0.5 text-muted-foreground">
                The AI wasn't sure about these. Review them first, or export anyway.
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[11px]"
                  onClick={() => {
                    setShowExport(false);
                    if (!showProperties) toggleProperties();
                    setRightTab("ai");
                  }}
                >
                  Review them
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setAckLowConf(true)}>
                  Export anyway
                </Button>
              </div>
            </div>
          )}

          {exportMut.isError && (
            <p className="text-xs text-red-400">{String(exportMut.error)}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowExport(false)}>Cancel</Button>
          <Button
            disabled={!planId || exportMut.isPending || showLowConfWarning}
            onClick={() => exportMut.mutate()}
          >
            {exportMut.isPending ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 size-3.5" />
            )}
            Approve &amp; Render
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
