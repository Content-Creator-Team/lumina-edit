import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GripVertical, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { TranscriptSegment } from "@/lib/api-types";
import { useEditorStore } from "@/lib/editor-store";
import { formatTimecode, transcriptQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Word = { start: number; end: number; text: string };
type Sentence = { key: string; speaker: string | null; words: Word[]; estimated: boolean };

function toSentences(segments: TranscriptSegment[]): Sentence[] {
  return segments.map((seg, i) => {
    const start = seg.start ?? seg.start_time ?? 0;
    const end = seg.end ?? seg.end_time ?? start + 1;
    if (seg.words && seg.words.length > 0) {
      return { key: seg.id ?? `s${i}`, speaker: seg.speaker ?? null, words: seg.words, estimated: false };
    }
    // No word timings from the backend: spread words evenly across the sentence.
    const tokens = seg.text.split(/\s+/).filter(Boolean);
    const step = (end - start) / Math.max(tokens.length, 1);
    return {
      key: seg.id ?? `s${i}`,
      speaker: seg.speaker ?? null,
      estimated: true,
      words: tokens.map((t, w) => ({ text: t, start: start + w * step, end: start + (w + 1) * step })),
    };
  });
}

/** Turn ordered sentences minus deleted words into back-to-back timeline clips. */
export function buildClipsFromTranscript(sentences: Sentence[], order: number[], deleted: Set<string>) {
  const clips: Array<{ id: string; startTime: number; duration: number; trimIn: number; trimOut: number; type: "video"; sourceStart: number; caption: string }> = [];
  let cursor = 0;
  for (const si of order) {
    const s = sentences[si];
    if (!s) continue;
    let run: Word[] = [];
    let runIdx = 0;
    const flush = () => {
      if (run.length === 0) return;
      const start = run[0]!.start;
      const dur = Math.max(0.1, run[run.length - 1]!.end - start);
      clips.push({ id: `tx_${s.key}_${runIdx++}`, startTime: cursor, duration: dur, trimIn: 0, trimOut: 0, type: "video", sourceStart: start, caption: run.map((w) => w.text).join(" ") });
      cursor += dur;
      run = [];
    };
    s.words.forEach((w, wi) => {
      if (deleted.has(`${si}:${wi}`)) flush();
      else run.push(w);
    });
    flush();
  }
  return clips;
}

/**
 * The transcript as a document: click a word to strike it (cutting that bit of
 * video), drag or move sentences to reorder. Edits rebuild the video track live.
 */
export function TranscriptDocument({ videoId }: { videoId: string }) {
  const q = useQuery(transcriptQuery(videoId));
  const { replaceVideoClips, compareOriginal, toggleCompare, setCurrentTime, currentTime } = useEditorStore();
  const sentences = useMemo(() => toSentences(q.data?.segments ?? []), [q.data]);
  const [order, setOrder] = useState<number[]>([]);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => setOrder(sentences.map((_, i) => i)), [sentences]);

  useEffect(() => {
    if (!touched) return;
    replaceVideoClips(buildClipsFromTranscript(sentences, order, deleted));
  }, [order, deleted, touched, sentences, replaceVideoClips]);

  if (q.isPending) return <p className="p-4 text-sm text-muted-foreground">Loading transcript…</p>;
  if (q.isError) return <p className="p-4 text-sm text-destructive">Couldn't load the transcript. {String(q.error)}</p>;
  if (sentences.length === 0)
    return <p className="p-4 text-sm text-muted-foreground">No transcript yet. It appears once transcription finishes.</p>;

  const toggleWord = (key: string) => {
    setTouched(true);
    setDeleted((d) => {
      const next = new Set(d);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    setTouched(true);
    setOrder((o) => {
      const next = [...o];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  };
  const reset = () => {
    setDeleted(new Set());
    setOrder(sentences.map((_, i) => i));
  };

  const showOriginal = compareOriginal;
  const list = showOriginal ? sentences.map((_, i) => i) : order;
  const estimated = sentences.some((s) => s.estimated);
  const removedCount = deleted.size;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div role="group" aria-label="Before or after" className="flex rounded-md border border-border p-0.5 text-[11px]">
          {(["After", "Before"] as const).map((label) => {
            const active = label === "Before" ? showOriginal : !showOriginal;
            return (
              <button
                key={label}
                aria-pressed={active}
                onClick={() => { if (!active) toggleCompare(); }}
                className={cn("rounded px-2 py-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", active ? "bg-primary/15 font-medium" : "text-muted-foreground")}
              >
                {label === "After" ? "After · edited" : "Before · original"}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-muted-foreground">{removedCount} word{removedCount === 1 ? "" : "s"} cut</span>
        <Button size="sm" variant="ghost" className="ml-auto h-6 px-2 text-[11px]" onClick={reset} disabled={!touched}>
          <RotateCcw className="size-3" /> Reset
        </Button>
        <p className="w-full text-[10px] text-muted-foreground">
          Click a word to cut it, drag sentences to reorder. Changes rebuild the video track — undo with ⌘Z.
          {estimated && " Word timings are estimated from sentence timings."}
        </p>
      </div>

      <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
        {list.map((si, pos) => {
          const s = sentences[si]!;
          const first = s.words[0];
          const playing = first && currentTime >= first.start && currentTime < (s.words[s.words.length - 1]?.end ?? 0);
          return (
            <li
              key={s.key}
              draggable={!showOriginal}
              onDragStart={() => (dragFrom.current = pos)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragFrom.current !== null) move(dragFrom.current, pos); dragFrom.current = null; }}
              className={cn("group flex gap-1.5 rounded-lg border p-2 text-sm leading-relaxed", playing ? "border-primary/50 bg-primary/5" : "border-transparent hover:border-border")}
            >
              {!showOriginal && (
                <div className="flex shrink-0 flex-col items-center text-muted-foreground">
                  <GripVertical className="size-3.5 cursor-grab" aria-hidden="true" />
                  <button aria-label="Move sentence up" onClick={() => move(pos, pos - 1)} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"><ArrowUp className="size-3" /></button>
                  <button aria-label="Move sentence down" onClick={() => move(pos, pos + 1)} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"><ArrowDown className="size-3" /></button>
                </div>
              )}
              <p className="min-w-0">
                <button
                  className="mr-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() => first && setCurrentTime(first.start)}
                  aria-label={`Seek to ${formatTimecode(first?.start ?? 0)}`}
                >
                  {formatTimecode(first?.start ?? 0)}
                </button>
                {s.words.map((w, wi) => {
                  const key = `${si}:${wi}`;
                  const cut = deleted.has(key);
                  if (showOriginal)
                    return <span key={key} className={cn(cut && "bg-destructive/15")}>{w.text} </span>;
                  return (
                    <button
                      key={key}
                      onClick={() => toggleWord(key)}
                      aria-pressed={cut}
                      aria-label={`${cut ? "Restore" : "Cut"} “${w.text}”`}
                      className={cn(
                        "rounded px-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        cut ? "text-muted-foreground line-through decoration-destructive decoration-2" : "hover:bg-destructive/10",
                      )}
                    >
                      {w.text}
                    </button>
                  );
                }).reduce<React.ReactNode[]>((acc, el, i) => (showOriginal ? [...acc, el] : [...acc, el, <span key={`sp${i}`}> </span>]), [])}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
