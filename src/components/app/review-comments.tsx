import { Check, Link2, Loader2, MessageSquare, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { EditPlan } from "@/lib/api-types";
import { formatTimecode } from "@/lib/queries";
import { isDemoMode } from "@/lib/runtime-config";
import { useVideoComments } from "@/lib/use-comments";
import { cn } from "@/lib/utils";

type Props = {
  videoId: string;
  planId: string;
  currentTime: number;
  author: string;
  disabled?: boolean;
  onSeek: (t: number) => void;
  onRevised: (plan: EditPlan) => void;
};

/**
 * Timestamped review comments. Any comment can be sent to the AI as a revision
 * ("apply this feedback"), which creates a new plan version via the real API.
 * Stored on the backend in live mode; on this device in demo mode.
 */
export function ReviewComments({ videoId, planId, currentTime, author, disabled, onSeek, onRevised }: Props) {
  const [text, setText] = useState("");
  const { comments, add: addComment, remove, apply } = useVideoComments(videoId);

  const add = () => {
    if (!text.trim()) return;
    addComment.mutate({ time: currentTime, text: text.trim(), author }, { onSuccess: () => setText("") });
  };
  const applyComment = (c: (typeof comments)[number]) =>
    apply.mutate({ comment: c, planId }, { onSuccess: (plan) => onRevised(plan) });

  return (
    <section aria-labelledby="comments-heading" className="rounded-lg border border-border p-4">
      <h2 id="comments-heading" className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
        Comments · {comments.length}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Pinned to the playhead.{" "}
        {isDemoMode() ? "Saved on this device in the demo workspace." : "Shared with everyone on this video."}
      </p>

      <div className="mt-3 flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add(); }}
          rows={2}
          placeholder={`Comment at ${formatTimecode(currentTime)}…`}
          aria-label="New comment"
          className="resize-y"
        />
        <Button onClick={add} disabled={!text.trim() || addComment.isPending} className="self-end">
          {addComment.isPending && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
          Add
        </Button>
      </div>

      {comments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No comments yet. Pause on a moment and leave a note.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {comments.map((c) => (
            <li key={c.id} className={cn("rounded-md border border-border p-2.5 text-sm", c.applied && "opacity-70")}>
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => onSeek(c.time)} className="rounded bg-muted px-1.5 font-mono hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={`Jump to ${formatTimecode(c.time)}`}>
                  {formatTimecode(c.time)}
                </button>
                <span className="text-muted-foreground">{c.author ?? "Reviewer"}</span>
                {c.applied && <span className="inline-flex items-center gap-0.5 text-success"><Check className="size-3" /> Applied</span>}
                <button onClick={() => remove.mutate(c.id)} aria-label="Delete comment" className="ml-auto text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <p className="mt-1">{c.text}</p>
              {!c.applied && (
                <Button size="sm" variant="secondary" className="mt-2 h-7 text-xs" disabled={disabled || apply.isPending} onClick={() => applyComment(c)}>
                  {apply.isPending && apply.variables?.comment.id === c.id ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                  Apply this feedback with AI
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {apply.isError && <p role="alert" className="mt-2 text-sm text-destructive">{String(apply.error)}</p>}
      {disabled && comments.some((c) => !c.applied) && (
        <p className="mt-2 text-xs text-muted-foreground">Save or discard your edits before applying feedback.</p>
      )}

      <div className="mt-4 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground"><Link2 className="size-3.5" /> Client approval link</p>
        <p className="mt-1">
          Not available yet: a public share link needs a backend endpoint that issues signed review links and records the client's approve / request-changes decision.
        </p>
        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" disabled>Create share link</Button>
      </div>
    </section>
  );
}
