import { useEffect, useState } from "react";
import {
  Captions, Download, Eye, Keyboard, Pause, Redo2, Save, Scissors, SkipBack, Sparkles,
  SlidersHorizontal, Undo2, Wand2, X,
} from "lucide-react";

import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEditorStore } from "@/lib/editor-store";

export const SHORTCUTS: Array<[string, string]> = [
  ["Space / K", "Play or pause"],
  ["J", "Back 5 seconds"],
  ["L", "Play (press again to skip 5s ahead)"],
  ["I / O", "Mark in / out point"],
  ["X", "Cut the marked in–out range"],
  ["S", "Split the selected clip at the playhead"],
  ["B", "Before / after: compare with original footage"],
  ["⌘/Ctrl + Z", "Undo (⇧ to redo)"],
  ["⌘/Ctrl + S", "Save timeline to the edit plan"],
  ["⌘/Ctrl + K", "Command menu"],
  ["?", "Show this sheet"],
];

/** Cuts the in–out range; shared by keyboard and command menu. */
export function cutMarkedRange() {
  const s = useEditorStore.getState();
  if (s.markIn === null || s.markOut === null) return false;
  const start = Math.min(s.markIn, s.markOut);
  const end = Math.max(s.markIn, s.markOut);
  if (end - start < 0.05) return false;
  s.cutRanges([{ start, end }]);
  s.setMarkIn(null);
  s.setMarkOut(null);
  return true;
}

export function EditorCommandPalette({ onSave }: { onSave: () => void }) {
  const st = useEditorStore();
  const [query, setQuery] = useState("");
  const run = (fn: () => void) => {
    fn();
    st.setShowPalette(false);
    setQuery("");
  };

  return (
    <CommandDialog open={st.showPalette} onOpenChange={st.setShowPalette}>
      <CommandInput placeholder="Type a command, or /prompt for the AI Copilot…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No matching command.</CommandEmpty>
        {query.startsWith("/") && query.length > 1 && (
          <CommandGroup heading="AI Copilot">
            <CommandItem
              value={query}
              onSelect={() =>
                run(() => st.sendCopilotPrompt(query.slice(1).trim()))
              }
            >
              <Sparkles /> Send to AI Copilot: “{query.slice(1)}”
            </CommandItem>
          </CommandGroup>
        )}
        <CommandGroup heading="Playback">
          <CommandItem onSelect={() => run(() => st.setPlaying(!st.playing))}><Pause /> Play / pause<CommandShortcut>K</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => run(() => st.setCurrentTime(0))}><SkipBack /> Go to start</CommandItem>
          <CommandItem onSelect={() => run(st.toggleCompare)}><Eye /> Before / after compare<CommandShortcut>B</CommandShortcut></CommandItem>
        </CommandGroup>
        <CommandGroup heading="Edit">
          <CommandItem onSelect={() => run(() => st.setMarkIn(st.currentTime))}>Mark in at playhead<CommandShortcut>I</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => run(() => st.setMarkOut(st.currentTime))}>Mark out at playhead<CommandShortcut>O</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => run(() => void cutMarkedRange())}><Scissors /> Cut in–out range<CommandShortcut>X</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => run(() => st.selectedClipId && st.splitClip(st.selectedClipId, st.currentTime))}><Scissors /> Split selected clip<CommandShortcut>S</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => run(st.undo)}><Undo2 /> Undo<CommandShortcut>⌘Z</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => run(st.redo)}><Redo2 /> Redo<CommandShortcut>⌘⇧Z</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => run(onSave)}><Save /> Save to edit plan<CommandShortcut>⌘S</CommandShortcut></CommandItem>
        </CommandGroup>
        <CommandGroup heading="Panels">
          <CommandItem onSelect={() => run(() => st.setRightTab("ai"))}><Wand2 /> Review AI edits</CommandItem>
          <CommandItem onSelect={() => run(() => st.setRightTab("properties"))}><SlidersHorizontal /> Clip properties</CommandItem>
          <CommandItem onSelect={() => run(() => st.setRightTab("captions"))}><Captions /> Captions</CommandItem>
          <CommandItem onSelect={() => run(st.toggleCopilot)}><Sparkles /> Toggle AI Copilot</CommandItem>
          <CommandItem onSelect={() => run(() => st.setShowExport(true))}><Download /> Export</CommandItem>
          <CommandItem onSelect={() => run(() => st.setShowShortcuts(true))}><Keyboard /> Keyboard shortcuts<CommandShortcut>?</CommandShortcut></CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function ShortcutsSheet() {
  const { showShortcuts, setShowShortcuts } = useEditorStore();
  return (
    <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>For fast, hands-on-keys editing.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="contents">
              <dt><kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">{k}</kbd></dt>
              <dd className="text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

/** First visit per video: "The AI made N edits — review them". */
export function FirstRunOverlay({ videoId, editCount }: { videoId: string; editCount: number }) {
  const [open, setOpen] = useState(false);
  const setRightTab = useEditorStore((s) => s.setRightTab);
  const key = `reelzoy.editor_intro.${videoId}`;
  useEffect(() => {
    try { if (editCount > 0 && !localStorage.getItem(key)) setOpen(true); } catch { /* storage blocked */ }
  }, [editCount, key]);
  if (!open) return null;
  const close = () => {
    try { localStorage.setItem(key, "1"); } catch { /* storage blocked */ }
    setOpen(false);
  };
  return (
    <div role="dialog" aria-label="AI edits summary" className="first-run glass-panel absolute right-4 bottom-4 z-30 w-80 rounded-2xl p-4">
      <button aria-label="Dismiss" onClick={close} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
      <p className="eyebrow">AI pass complete</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-lg">
        The AI made {editCount} edit{editCount === 1 ? "" : "s"}.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Each one shows its reason. Accept or reject them one by one, like tracked changes.</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="bg-brand-gradient text-primary-foreground" onClick={() => { setRightTab("ai"); close(); }}>
          Review them →
        </Button>
        <Button size="sm" variant="ghost" onClick={close}>Later</Button>
      </div>
    </div>
  );
}
