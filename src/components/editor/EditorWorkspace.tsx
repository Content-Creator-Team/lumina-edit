import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Film, Sparkles, Undo2, Redo2, Scissors, Loader2, AlertCircle,
  Download, SlidersHorizontal, Captions, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditorStore, useCanUndo, useCanRedo } from "@/lib/editor-store";
import { api, ApiError } from "@/lib/api-client";
import { planToEditorTracks, buildPlanPatchFromTimeline } from "@/lib/timeline-persist";
import { Timeline } from "./Timeline";
import { PreviewCanvas } from "./PreviewCanvas";
import { AICopilot } from "./AICopilot";
import { PropertiesPanel } from "./PropertiesPanel";
import { CaptionsEditor } from "./CaptionsEditor";
import { ExportModal } from "./ExportModal";

function EditorToolbar({
  videoName,
  onSave,
  saving,
  saveError,
}: {
  videoName: string;
  onSave: () => void;
  saving: boolean;
  saveError: string | null;
}) {
  const {
    undo, redo, toggleCopilot, showCopilot, splitClip, currentTime, selectedClipId,
    setShowExport, toggleProperties, showProperties, toggleCaptions, showCaptions, dirty,
  } = useEditorStore();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <TooltipProvider delayDuration={400}>
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur">
        <Link to="/dashboard" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Film className="size-4" strokeWidth={1.75} />
          <span className="font-[family-name:var(--font-display)] text-sm">Cutroom</span>
        </Link>
        <div className="mx-2 h-4 w-px bg-border" />
        <span className="max-w-48 truncate text-sm">{videoName}</span>
        {dirty && <span className="text-[10px] text-amber-500">Unsaved</span>}
        <div className="mx-2 h-4 w-px bg-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" disabled={!canUndo} onClick={undo}><Undo2 className="size-4" /></Button>
          </TooltipTrigger>
          <TooltipContent>Undo (⌘Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" disabled={!canRedo} onClick={redo}><Redo2 className="size-4" /></Button>
          </TooltipTrigger>
          <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" disabled={!selectedClipId}
              onClick={() => { if (selectedClipId) splitClip(selectedClipId, currentTime); }}>
              <Scissors className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split at playhead (S)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={dirty ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              disabled={!dirty || saving}
              onClick={onSave}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Save
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save timeline to edit plan (⌘S)</TooltipContent>
        </Tooltip>
        {saveError && <span className="max-w-40 truncate text-[10px] text-red-400">{saveError}</span>}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={showProperties ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={toggleProperties}
          >
            <SlidersHorizontal className="size-3.5" />
            Props
          </Button>
          <Button
            variant={showCaptions ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={toggleCaptions}
          >
            <Captions className="size-3.5" />
            Captions
          </Button>
          <Button
            variant={showCopilot ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={toggleCopilot}
          >
            <Sparkles className="size-3.5" />
            AI
          </Button>
          <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs" onClick={() => setShowExport(true)}>
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </header>
    </TooltipProvider>
  );
}

export function EditorWorkspace({ videoId }: { videoId: string }) {
  const {
    init, showCopilot, showProperties, showCaptions,
    undo, redo, splitClip, currentTime, selectedClipId,
    tracks, planId, dirty, markClean,
  } = useEditorStore();
  const queryClient = useQueryClient();

  const videoQ = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => api.getVideo(videoId),
  });

  const planQ = useQuery({
    queryKey: ["edit-plan", videoId],
    queryFn: () => api.getEditPlan(videoId),
    enabled: ["ready", "plan_ready", "approved", "rendering", "complete"].includes(
      String(videoQ.data?.status ?? "").toLowerCase(),
    ),
  });

  useEffect(() => {
    if (!planQ.data || !videoQ.data) return;
    init(
      videoId,
      planToEditorTracks(planQ.data),
      videoQ.data.duration ?? 0,
      planQ.data.id,
    );
  }, [planQ.data?.id, videoQ.data?.id, videoId, init]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!planQ.data) throw new ApiError(0, "No edit plan loaded.");
      const patch = buildPlanPatchFromTimeline(planQ.data, tracks);
      return api.patchPlan(planQ.data.id, patch);
    },
    onSuccess: async () => {
      markClean();
      await queryClient.invalidateQueries({ queryKey: ["edit-plan", videoId] });
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty) saveMut.mutate();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.key === "s" || e.key === "S") && selectedClipId && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        splitClip(selectedClipId, currentTime);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, splitClip, currentTime, selectedClipId, dirty, saveMut]);

  if (videoQ.isLoading) {
    return <div className="flex flex-1 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  if (videoQ.isError || !videoQ.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertCircle className="size-8" />
        <p className="text-sm">Failed to load video</p>
        <Link to="/dashboard" className="text-xs underline">Back to dashboard</Link>
      </div>
    );
  }

  const title = videoQ.data.filename ?? videoQ.data.name ?? videoQ.data.title ?? "Video";

  return (
    <>
      <EditorToolbar
        videoName={title}
        onSave={() => saveMut.mutate()}
        saving={saveMut.isPending}
        saveError={saveMut.isError ? String(saveMut.error) : null}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col bg-black/80">
          {planQ.isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading edit plan…</span>
            </div>
          ) : (
            <PreviewCanvas className="min-h-0 flex-1" />
          )}
        </div>
        {showProperties && <PropertiesPanel />}
        {showCaptions && <CaptionsEditor />}
        {showCopilot && <AICopilot />}
      </div>
      <div className="shrink-0 overflow-y-auto" style={{ maxHeight: "40vh", minHeight: 180 }}>
        <Timeline />
      </div>
      <ExportModal
        onBeforeExport={async () => {
          if (dirty && planId && planQ.data) {
            const patch = buildPlanPatchFromTimeline(planQ.data, useEditorStore.getState().tracks);
            await api.patchPlan(planId, patch);
            markClean();
            await queryClient.invalidateQueries({ queryKey: ["edit-plan", videoId] });
          }
        }}
      />
    </>
  );
}
