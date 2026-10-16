import { BrandMark } from "@/components/landing/site-header";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Sparkles, Undo2, Redo2, Scissors, Loader2, AlertCircle,
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
import { AIChangesPanel } from "./AIChangesPanel";
import { ReviewMiniMap } from "./ReviewMiniMap";
import { TranscriptDocument } from "./TranscriptDocument";
import { EditorCommandPalette, FirstRunOverlay, ShortcutsSheet, cutMarkedRange } from "./EditorCommands";
import { Command, FileText, Keyboard, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

function SavedAgo({ at }: { at: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.max(0, Math.round((Date.now() - at) / 1000));
  const label = secs < 5 ? "Saved · just now" : secs < 60 ? `Saved · ${secs}s ago` : `Saved · ${Math.floor(secs / 60)}m ago`;
  return (
    <span className="flex items-center gap-1 text-[10px] text-success" aria-live="polite">
      <span className="inline-block size-1.5 rounded-full bg-success" aria-hidden="true" />
      {label}
    </span>
  );
}

function EditorToolbar({
  videoName,
  onSave,
  saving,
  saveError,
  lastSavedAt,
}: {
  videoName: string;
  onSave: () => void;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: number | null;
}) {
  const {
    undo, redo, toggleCopilot, showCopilot, splitClip, currentTime, selectedClipId,
    setShowExport, toggleProperties, showProperties, dirty,
  } = useEditorStore();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <TooltipProvider delayDuration={400}>
      <header className="glass-panel relative z-10 m-2 flex h-12 shrink-0 items-center gap-2 rounded-xl px-3">
        <Link to="/dashboard" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <BrandMark />
        </Link>
        <div className="mx-2 h-4 w-px bg-border" />
        <span className="max-w-48 truncate text-sm">{videoName}</span>
        {dirty && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning">Unsaved</span>}
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
        {saveError && <span className="max-w-40 truncate text-[10px] text-destructive">{saveError}</span>}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground" onClick={() => useEditorStore.getState().setShowPalette(true)}>
            <Command className="size-3.5" /> K
          </Button>
          <Button variant="ghost" size="icon" className="size-7" aria-label="Keyboard shortcuts" onClick={() => useEditorStore.getState().setShowShortcuts(true)}>
            <Keyboard className="size-3.5" />
          </Button>
          <Button
            variant={showProperties ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={toggleProperties}
            aria-pressed={showProperties}
          >
            <SlidersHorizontal className="size-3.5" />
            Panel
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
          <Button size="sm" className="bg-brand-gradient h-7 gap-1.5 px-2.5 text-xs text-primary-foreground" onClick={() => setShowExport(true)}>
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
    init, showCopilot, showProperties,
    undo, redo, splitClip,
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
      const el = e.target as HTMLElement;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) return;
      const st = useEditorStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); st.setShowPalette(!st.showPalette); return; }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); if (st.dirty) saveMut.mutate(); return; }
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod || e.altKey) return;
      switch (e.key) {
        case " ": case "k": case "K": e.preventDefault(); st.setPlaying(!st.playing); break;
        case "j": case "J": st.setPlaying(false); st.setCurrentTime(st.currentTime - 5); break;
        case "l": case "L": if (st.playing) st.setCurrentTime(st.currentTime + 5); else st.setPlaying(true); break;
        case "i": case "I": st.setMarkIn(st.currentTime); break;
        case "o": case "O": st.setMarkOut(st.currentTime); break;
        case "x": case "X": cutMarkedRange(); break;
        case "b": case "B": st.toggleCompare(); break;
        case "?": st.setShowShortcuts(true); break;
        case "s": case "S":
          if (st.selectedClipId) { e.preventDefault(); splitClip(st.selectedClipId, st.currentTime); }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, splitClip, saveMut]);

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
      <div className="relative mx-2 flex min-h-0 flex-1 gap-2 overflow-hidden">
        <div className="editor-stage flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-black/80">
          {planQ.isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading edit plan…</span>
            </div>
          ) : (
            <PreviewCanvas className="min-h-0 flex-1" playbackUrl={videoQ.data.playback_url ?? null} />
          )}
        </div>
        {showProperties && <RightSidebar plan={planQ.data} videoId={videoId} />}
        {showCopilot && <AICopilot />}
        <FirstRunOverlay videoId={videoId} editCount={planQ.data?.segments.length ?? 0} />
      </div>
      <div className="surface-card relative m-2 shrink-0 overflow-y-auto rounded-xl" style={{ maxHeight: "40vh", minHeight: 180 }}>
        <Timeline />
      </div>
      <EditorCommandPalette onSave={() => saveMut.mutate()} />
      <ShortcutsSheet />
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

function RightSidebar({ plan, videoId }: { plan: import("@/lib/api-types").EditPlan | undefined; videoId: string }) {
  const { rightTab, setRightTab } = useEditorStore();
  const tabs = [
    { key: "ai", label: "AI edits", icon: Wand2 },
    { key: "transcript", label: "Transcript", icon: FileText },
    { key: "properties", label: "Properties", icon: SlidersHorizontal },
    { key: "captions", label: "Captions", icon: Captions },
  ] as const;
  return (
    <aside aria-label="Editor side panel" className={cn("surface-card flex shrink-0", rightTab === "transcript" ? "w-[26rem]" : "w-80", " flex-col overflow-hidden rounded-xl border border-border bg-card")}>
      <div role="tablist" aria-label="Side panel" className="flex shrink-0 gap-1 border-b border-border p-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={rightTab === t.key}
            onClick={() => setRightTab(t.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              rightTab === t.key ? "bg-primary/15 font-medium text-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <t.icon className="size-3.5" aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="sidebar-embed flex min-h-0 flex-1 flex-col overflow-y-auto">
        {rightTab === "ai" && <AIChangesPanel plan={plan} />}
        {rightTab === "transcript" && <TranscriptDocument videoId={videoId} />}
        {rightTab === "properties" && <PropertiesPanel />}
        {rightTab === "captions" && <CaptionsEditor />}
      </div>
    </aside>
  );
}
