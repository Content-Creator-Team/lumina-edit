import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, TimerReset } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api-client";
import type { EditPlan } from "@/lib/api-types";

type Props = {
  videoId: string;
  planId: string;
  disabled?: boolean;
  onRevised: (plan: EditPlan) => void;
};

/**
 * Chat-like revision field. Revisions take 10–30s, so the waiting state is
 * explicit; on failure the typed instruction and the current plan are kept.
 */
export function RevisionPrompt({ videoId, planId, disabled, onRevised }: Props) {
  const [instruction, setInstruction] = useState("");

  const revise = useMutation({
    mutationFn: (text: string) => api.revisePlan(videoId, planId, text),
    onSuccess: (plan) => {
      setInstruction("");
      onRevised(plan);
    },
  });

  const error = revise.error as ApiError | Error | null;
  const apiError = error instanceof ApiError ? error : null;

  return (
    <section aria-labelledby="revision-heading" className="rounded-lg border border-border p-4">
      <h2 id="revision-heading" className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
        Ask for a revision
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Describe the change in your own words — for example “tighten the intro and keep the
        interview answer about pricing”. This creates a new plan version.
      </p>

      <Textarea
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        disabled={disabled || revise.isPending}
        rows={3}
        placeholder="What should change in this cut?"
        aria-label="Revision instruction"
        className="mt-3 resize-y"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => revise.mutate(instruction.trim())}
          disabled={disabled || revise.isPending || instruction.trim().length < 3}
        >
          {revise.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {revise.isPending ? "AI is revising your plan…" : "Send revision"}
        </Button>
        {revise.isPending && (
          <span role="status" className="text-xs text-muted-foreground">
            This usually takes 10–30 seconds. Your plan stays untouched until the new version
            arrives.
          </span>
        )}
      </div>

      {apiError?.isRateLimited && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground"
        >
          <TimerReset className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {apiError.detail} Your instruction has been kept, so you can resend it once the limit
          resets.
        </p>
      )}

      {error && !apiError?.isRateLimited && (
        <p role="alert" className="mt-3 rounded-md border border-destructive/40 p-3 text-sm">
          {apiError?.isPlanningError
            ? `The AI couldn't turn that into a plan: ${apiError.detail} Try rephrasing with concrete moments or timings — your text and current plan are unchanged.`
            : error.message}
        </p>
      )}
    </section>
  );
}
