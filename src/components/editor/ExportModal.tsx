import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
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

type Props = {
  onBeforeExport?: () => Promise<void>;
};

export function ExportModal({ onBeforeExport }: Props) {
  const { showExport, setShowExport, planId, videoId, dirty } = useEditorStore();
  const navigate = useNavigate();
  const [presetId, setPresetId] = useState("youtube_shorts");
  const [burnCaptions, setBurnCaptions] = useState(true);
  const [brandKitId, setBrandKitId] = useState<string>("");
  const [preferFaces, setPreferFaces] = useState(true);

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
    <Dialog open={showExport} onOpenChange={setShowExport}>
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

          {exportMut.isError && (
            <p className="text-xs text-red-400">{String(exportMut.error)}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowExport(false)}>Cancel</Button>
          <Button
            disabled={!planId || exportMut.isPending}
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
