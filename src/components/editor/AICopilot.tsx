import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, Loader2, ChevronRight, Scissors, Wand2, X, Languages, Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/editor-store";
import { api } from "@/lib/api-client";
import { agentOpsToTimelineRanges } from "@/lib/timeline-persist";
import { SilenceRemovalPanel } from "./SilenceRemovalPanel";

function EngagementPanel({ videoId }: { videoId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["engagement", videoId],
    queryFn: () => api.getEngagement(videoId),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  const gradeColor = { A: "text-green-400", B: "text-emerald-400", C: "text-yellow-400", D: "text-orange-400", F: "text-red-400" }[data.grade] ?? "text-muted-foreground";

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-3">
        <span className={cn("text-4xl font-bold font-[family-name:var(--font-display)]", gradeColor)}>{data.grade}</span>
        <div>
          <div className="text-sm font-medium">{data.total_score.toFixed(0)}<span className="text-xs text-muted-foreground">/100</span></div>
          <div className="text-xs text-muted-foreground">Virality score</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {data.signals.map((s) => (
          <div key={s.name}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className="text-muted-foreground">{s.name}</span>
              <span className="font-medium tabular-nums">{s.score.toFixed(0)}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${s.score}%` }} />
            </div>
          </div>
        ))}
      </div>
      {data.suggestions.length > 0 && (
        <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Suggestions</p>
          {data.suggestions.map((s, i) => (
            <p key={i} className="flex gap-1.5 text-xs"><ChevronRight className="mt-0.5 size-3 shrink-0 text-primary" />{s}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function SmartClipsPanel({ videoId }: { videoId: string }) {
  const [dur, setDur] = useState(30);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["smart-clips", videoId, dur],
    queryFn: () => api.getSmartClips(videoId, dur, 5),
    enabled: false,
  });
  const { addTrack, addClip, tracks } = useEditorStore();

  function useClip(clip: { start: number; end: number; hook: string }) {
    let vt = tracks.find((t) => t.type === "video");
    if (!vt) {
      addTrack("video");
      vt = useEditorStore.getState().tracks.find((t) => t.type === "video")!;
    }
    addClip(vt.id, {
      type: "video",
      startTime: clip.start,
      duration: clip.end - clip.start,
      trimIn: 0,
      trimOut: 0,
      caption: clip.hook,
      sourceId: videoId,
      sourceStart: clip.start,
    });
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-xs text-muted-foreground">Duration</label>
        <select value={dur} onChange={(e) => setDur(Number(e.target.value))}
          className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground">
          {[15, 30, 45, 60].map((d) => <option key={d} value={d}>{d}s</option>)}
        </select>
        <Button size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="size-3 animate-spin" /> : <Scissors className="size-3" />}
          <span className="ml-1">Detect</span>
        </Button>
      </div>
      {data?.clips.map((clip, i) => (
        <div key={i} className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2">
          <div className="flex items-start justify-between gap-1">
            <p className="text-xs font-medium leading-snug">{clip.hook}</p>
            <Badge variant="outline" className="shrink-0 text-[10px]">{clip.score.toFixed(0)}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">{clip.reason}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {clip.start.toFixed(1)}s – {clip.end.toFixed(1)}s
            </span>
            <Button variant="outline" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => useClip(clip)}>
              Add to timeline
            </Button>
          </div>
        </div>
      ))}
      {data?.clips.length === 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">No clips detected. Try a different duration.</p>
      )}
    </div>
  );
}

function CommandPanel({ videoId }: { videoId: string }) {
  const [instr, setInstr] = useState("");
  const [summary, setSummary] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (instruction: string) => api.agentEdit(videoId, instruction),
    onSuccess: (data) => {
      setInstr("");
      setSummary(data.edit_plan.summary);
      const currentTracks = useEditorStore.getState().tracks;
      const ranges = agentOpsToTimelineRanges(data.edit_plan.operations, currentTracks);
      if (ranges.length > 0) useEditorStore.getState().cutRanges(ranges);
    },
  });

  const QUICK = [
    "Remove all silences longer than 2 seconds",
    "Keep only the most energetic segments",
    "Create a 30-second highlight reel",
    "Add captions to all spoken segments",
    "Remove all filler words",
  ];

  return (
    <div className="space-y-3 p-3">
      <Textarea value={instr} onChange={(e) => setInstr(e.target.value)}
        placeholder={"Tell the AI what to do…\ne.g. 'Remove silences' or 'Keep the best 2 minutes'"}
        className="min-h-[80px] resize-none text-sm"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && instr.trim()) mutation.mutate(instr); }}
      />
      <Button className="w-full" size="sm" disabled={!instr.trim() || mutation.isPending} onClick={() => mutation.mutate(instr)}>
        {mutation.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Wand2 className="mr-1.5 size-3.5" />}
        {mutation.isPending ? "Processing…" : "Apply (⌘↵)"}
      </Button>
      {mutation.isError && <p className="text-xs text-red-400">{String(mutation.error)}</p>}
      {mutation.isSuccess && (
        <p className="text-xs text-green-400">
          Applied {mutation.data.edit_plan.operations.length} cut(s) to the timeline.
          {summary ? ` ${summary}` : ""} Save to persist.
        </p>
      )}
      <div className="space-y-0.5">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Quick actions</p>
        {QUICK.map((s) => (
          <button key={s} onClick={() => setInstr(s)}
            className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <ChevronRight className="size-3 shrink-0" />{s}
          </button>
        ))}
      </div>
    </div>
  );
}

function LocalizationPanel({ videoId }: { videoId: string }) {
  const [lang, setLang] = useState("hi");
  const [consent, setConsent] = useState(false);

  const translateMut = useMutation({
    mutationFn: () => api.translateVideo(videoId, lang),
  });

  const dubMut = useMutation({
    mutationFn: () =>
      api.dubVideo(videoId, lang, {
        voice_clone: false,
        voice_clone_consent: consent,
        translate_job_id: translateMut.data?.job_id,
      }),
  });

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Languages className="size-3.5" />
        EN · HI · MR
      </div>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
      >
        <option value="en">English</option>
        <option value="hi">Hindi</option>
        <option value="mr">Marathi</option>
      </select>
      <Button size="sm" className="w-full" disabled={translateMut.isPending} onClick={() => translateMut.mutate()}>
        {translateMut.isPending ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
        Preview translation
      </Button>
      {translateMut.data && (
        <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-border p-2">
          <p className="text-[10px] text-muted-foreground">{translateMut.data.message}</p>
          {translateMut.data.preview_segments.slice(0, 5).map((s, i) => (
            <div key={i} className="border-t border-border/50 pt-1 text-[11px]">
              <p className="text-muted-foreground">{s.source_text}</p>
              <p>{s.translated_text}</p>
            </div>
          ))}
        </div>
      )}
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        I authorize voice cloning if enabled later
      </label>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={dubMut.isPending}
        onClick={() => dubMut.mutate()}
      >
        {dubMut.isPending ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
        Queue dubbing
      </Button>
      {dubMut.data && <p className="text-[11px] text-green-400">{dubMut.data.message}</p>}
      {(translateMut.isError || dubMut.isError) && (
        <p className="text-xs text-red-400">{String(translateMut.error || dubMut.error)}</p>
      )}
    </div>
  );
}

function BrandKitPanel() {
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#0ea5e9");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["brand-kits"],
    queryFn: () => api.listBrandKits(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      api.createBrandKit({
        name: name || "My Brand",
        primary_color: primary,
        caption_preset: "clean_lower",
        is_default: !(data && data.length),
      }),
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["brand-kits"] });
    },
  });

  async function onLogo(kitId: string, file: File | undefined) {
    if (!file) return;
    setUploadingId(kitId);
    try {
      await api.uploadBrandLogo(kitId, file);
      await queryClient.invalidateQueries({ queryKey: ["brand-kits"] });
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Palette className="size-3.5" />
        Brand kits
      </div>
      {isLoading && <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />}
      <div className="space-y-1.5">
        {(data ?? []).map((k) => (
          <div key={k.id} className="space-y-1 rounded border border-border px-2 py-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span
                className="size-3 rounded-full border border-border"
                style={{ background: k.primary_color ?? "#888" }}
              />
              <span className="flex-1 truncate">{k.name}</span>
              {k.logo_url && (
                <img src={k.logo_url} alt="" className="size-5 rounded object-contain" />
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
              {uploadingId === k.id ? <Loader2 className="size-3 animate-spin" /> : null}
              {k.logo_url ? "Replace logo" : "Upload logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => void onLogo(k.id, e.target.files?.[0])}
              />
            </label>
          </div>
        ))}
        {data?.length === 0 && (
          <p className="text-center text-[11px] text-muted-foreground">No brand kits yet.</p>
        )}
      </div>
      <Input
        placeholder="Kit name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-xs"
      />
      <div className="flex items-center gap-2">
        <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-8 w-10" />
        <Button size="sm" className="h-8 flex-1 text-xs" disabled={createMut.isPending} onClick={() => createMut.mutate()}>
          Create kit
        </Button>
      </div>
    </div>
  );
}

export function AICopilot() {
  const { videoId, toggleCopilot } = useEditorStore();
  if (!videoId) return null;

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-primary" />
          <span className="text-sm font-medium">AI Copilot</span>
        </div>
        <Button variant="ghost" size="icon" className="size-6" onClick={toggleCopilot}>
          <X className="size-3.5" />
        </Button>
      </div>
      <Tabs defaultValue="command" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-2 mt-2 grid h-auto grid-cols-3 gap-0.5">
          <TabsTrigger value="command" className="text-[10px]">Command</TabsTrigger>
          <TabsTrigger value="silence" className="text-[10px]">Silence</TabsTrigger>
          <TabsTrigger value="clips" className="text-[10px]">Clips</TabsTrigger>
          <TabsTrigger value="score" className="text-[10px]">Score</TabsTrigger>
          <TabsTrigger value="locale" className="text-[10px]">Translate</TabsTrigger>
          <TabsTrigger value="brand" className="text-[10px]">Brand</TabsTrigger>
        </TabsList>
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="command" className="mt-0"><CommandPanel videoId={videoId} /></TabsContent>
          <TabsContent value="silence" className="mt-0"><SilenceRemovalPanel videoId={videoId} /></TabsContent>
          <TabsContent value="clips" className="mt-0"><SmartClipsPanel videoId={videoId} /></TabsContent>
          <TabsContent value="score" className="mt-0"><EngagementPanel videoId={videoId} /></TabsContent>
          <TabsContent value="locale" className="mt-0"><LocalizationPanel videoId={videoId} /></TabsContent>
          <TabsContent value="brand" className="mt-0"><BrandKitPanel /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
