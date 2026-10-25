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
import { chaptersQuery } from "@/lib/queries";
import { RenderJobStatus } from "@/components/app/render-job-status";

/** Chapters + a YouTube description from GET /edit-plans/{id}/chapters. */
function ChaptersBlock({ planId }: { planId: string }) {
  const q = useQuery({ ...chaptersQuery(planId), staleTime: 60_000 });
  const [copied, setCopied] = useState(false);

  if (q.isPending) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Drafting chapters…
      </p>
    );
  }
  if (q.isError || !q.data?.text) return null;
  const data = q.data;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs">
          <ListOrdered className="size-3.5" aria-hidden="true" />
          Chapters &amp; description
        </Label>
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 px-2 text-[10px]"
          onClick={() => {
            void navigator.clipboard.writeText(data.text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? <Check className="size-3 text-success" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">{data.text}</pre>
      {!data.valid && data.problems.length > 0 &&
        (data.chapters.length < 3 || data.problems.some((p) => /short|30\s*s|three|3 chapters|at least/i.test(p)) ? (
          <p className="text-[10px] text-muted-foreground">
            Chapters need a 30s+ edit — the description is still ready to copy.
          </p>
        ) : (
          <p className="text-[10px] text-warning">YouTube may ignore these chapters: {data.problems.join(" ")}</p>
        ))}
      <p className="text-[10px] text-muted-foreground">
        Timed to the edited cut{data.description_source ? ` · description from ${data.description_source}` : ""}. Review before pasting into YouTube.
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
  const [jobId, setJobId] = useState<string | null>(null);

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
      const next = job.render_job_id ?? job.job_id ?? job.id ?? null;
      if (next) setJobId(next);
      else setShowExport(false);
    },
  });

  const openRenderPage = () => {
    setShowExport(false);
    if (videoId && jobId) {
      void navigate({ to: "/videos/$id/render", params: { id: videoId }, search: { job: jobId } });
    }
  };

  return (
    <Dialog open={showExport} onOpenChange={(open) => { setShowExport(open); if (!open) { setAckLowConf(false); setJobId(null); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            Choose a platform preset. Unsaved timeline edits are saved before render.
            {dirty ? " You have unsaved changes." : ""}
          </DialogDescription>
        </DialogHeader>

        {jobId ? (
          <div className="space-y-4 py-2">
            <RenderJobStatus jobId={jobId} onRetried={(j) => setJobId(j.id)} />
            {planId && <ChaptersBlock planId={planId} />}
          </div>
        ) : (
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

          {planId && <ChaptersBlock planId={planId} />}

          <div className="rounded-md border border-border bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
            <p className="font-medium text-foreground">Pre-export checks</p>
            <ul className="mt-1 space-y-0.5">
              <li>✓ Edit plan and timeline reviewed above</li>
              <li>✓ Caption overflow: long captions are wrapped, not clipped, by the renderer</li>
              <li className="text-muted-foreground/80">
                – Blur, darkness and audio-clipping detection need a media-analysis service that isn't
                connected yet, so those aren't checked here.
              </li>
            </ul>
          </div>

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
        )}

        {jobId ? (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowExport(false)}>Close</Button>
            <Button onClick={openRenderPage}>Open render page</Button>
          </DialogFooter>
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
