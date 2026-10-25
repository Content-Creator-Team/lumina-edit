import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  AudioLines,
  BookOpen,
  CheckCircle2,
  Loader2,
  Music,
  Palette,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { TemplateLibrary } from "@/components/app/template-library";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, api } from "@/lib/api-client";
import type { CreativePlan, EditPlan, RenderReport } from "@/lib/api-types";
import { formatTimecode } from "@/lib/queries";

const asList = (v: string | string[] | null | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </p>
      <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

/** Read-only view of plan.creative (template, hook, narrative, music, beat sync…). */
export function CreativePlanPanel({
  creative,
  renderReport,
}: {
  creative: CreativePlan;
  /** Report of the latest completed render, for real beat-alignment numbers. */
  renderReport?: RenderReport | null;
}) {
  const choice = creative.music?.choice;
  const beat = creative.beat_sync;
  const fixed = creative.validation?.fixed ?? [];
  const warnings = creative.validation?.warnings ?? [];

  return (
    <section aria-labelledby="creative-heading" className="surface-card mt-6 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="creative-heading" className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" aria-hidden="true" /> Creative plan
            {creative.template_name && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                {creative.template_name}
              </span>
            )}
          </h2>
          {creative.template_reason && (
            <p className="mt-1 text-xs text-muted-foreground">{creative.template_reason}</p>
          )}
        </div>
        {creative.planner && (
          <span className="text-[11px] text-muted-foreground">
            Planner: {creative.planner}
            {creative.llm_generated ? " · AI" : ""}
          </span>
        )}
      </div>
      {creative.creative_direction && (
        <p className="mt-3 text-sm text-foreground">{creative.creative_direction}</p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {creative.hook && (
          <Block icon={<Zap className="size-4 text-primary" aria-hidden="true" />} title="Hook">
            <p className="text-foreground">{creative.hook.description ?? creative.hook.strategy}</p>
            {creative.hook.source_start != null && (
              <p className="font-mono text-xs">
                {formatTimecode(creative.hook.source_start)}–
                {formatTimecode(creative.hook.source_end)}
                {creative.hook.strategy ? ` · ${creative.hook.strategy.replace(/_/g, " ")}` : ""}
              </p>
            )}
            {creative.hook.reason && <p className="text-xs">{creative.hook.reason}</p>}
          </Block>
        )}

        {!!creative.narrative?.length && (
          <Block
            icon={<BookOpen className="size-4 text-primary" aria-hidden="true" />}
            title="Narrative"
          >
            <ol className="space-y-1">
              {creative.narrative.map((b, i) => (
                <li key={`${b.beat}-${i}`}>
                  <span className="font-medium text-foreground">
                    {i + 1}. {b.beat}
                  </span>
                  {b.description ? ` — ${b.description}` : ""}
                </li>
              ))}
            </ol>
          </Block>
        )}

        {(asList(creative.pacing_notes).length > 0 ||
          creative.visual?.grade ||
          creative.ending) && (
          <Block
            icon={<Palette className="size-4 text-primary" aria-hidden="true" />}
            title="Pacing & look"
          >
            {asList(creative.pacing_notes).map((n) => (
              <p key={n}>{n}</p>
            ))}
            {creative.visual?.grade && <p>Grade: {creative.visual.grade}</p>}
            {asList(creative.visual?.notes).map((n) => (
              <p key={n} className="text-xs">
                {n}
              </p>
            ))}
            {creative.ending && (
              <p>Ending: {creative.ending.description ?? creative.ending.strategy}</p>
            )}
          </Block>
        )}

        {creative.music && (
          <Block icon={<Music className="size-4 text-primary" aria-hidden="true" />} title="Music">
            {choice && (choice.status === "selected" || choice.status === "generated") ? (
              <>
                <p className="text-foreground">
                  {choice.title ?? "Untitled"}
                  {choice.artist ? ` — ${choice.artist}` : ""}
                  {choice.bpm ? ` · ${Math.round(choice.bpm)} BPM` : ""}
                </p>
                {choice.license_name && (
                  <p className="text-xs">
                    Licence:{" "}
                    {choice.license_url ? (
                      <a
                        href={choice.license_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {choice.license_name}
                      </a>
                    ) : (
                      choice.license_name
                    )}
                  </p>
                )}
                {choice.attribution && <p className="text-xs italic">{choice.attribution}</p>}
              </>
            ) : (
              <p>
                {choice?.status === "disabled"
                  ? "Music is turned off for this edit."
                  : choice?.status === "pending"
                    ? "Music is chosen at render time."
                    : "No suitable licensed track was found."}
              </p>
            )}
            {(choice?.reason || creative.music.rationale) && (
              <p className="text-xs">{choice?.reason ?? creative.music.rationale}</p>
            )}
            {!!choice?.ranking?.length && (
              <details className="text-xs">
                <summary className="cursor-pointer text-foreground">
                  Why this track ({choice.ranking.length} considered)
                </summary>
                <ul className="mt-1.5 space-y-1">
                  {choice.ranking.slice(0, 6).map((r) => (
                    <li key={r.title} className={r.eligible === false ? "opacity-60" : ""}>
                      <span className="font-medium text-foreground">{r.title}</span> ·{" "}
                      {Math.round(r.score * 100)}
                      {r.license_name ? ` · ${r.license_name}` : ""}
                      {r.reasons?.length ? ` — ${r.reasons.join(", ")}` : ""}
                      {r.eligible === false && r.ineligible_reason
                        ? ` (excluded: ${r.ineligible_reason})`
                        : ""}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Block>
        )}

        {(beat || !!creative.sound_design?.length) && (
          <Block
            icon={<AudioLines className="size-4 text-primary" aria-hidden="true" />}
            title="Beat sync & sound design"
          >
            {beat &&
              (!beat.strength ? (
                <p>Beat sync off for this template (speech-led pacing).</p>
              ) : (
                <p>
                  Cuts are aligned to the beat at render time
                  {(() => {
                    const aligned =
                      renderReport?.beat_sync?.aligned_cuts ?? renderReport?.render?.beat_aligned_cuts;
                    const total = renderReport?.beat_sync?.total_cuts;
                    if (aligned == null) return "";
                    return total
                      ? ` · last render: ${aligned} of ${total} cuts on the beat`
                      : ` · last render: ${aligned} cuts on the beat`;
                  })()}
                  {` · strength ${Math.round(beat.strength * 100)}%`}
                  {beat.skipped_for_speech ? ` · ${beat.skipped_for_speech} left alone for speech` : ""}
                </p>
              ))}
            {asList(beat?.notes).map((n) => (
              <p key={n} className="text-xs">
                {n}
              </p>
            ))}
            {!!creative.sound_design?.length && (
              <ul className="text-xs">
                {creative.sound_design.slice(0, 8).map((c, i) => (
                  <li key={i}>
                    <span className="font-mono">{formatTimecode(c.time)}</span> {c.kind}
                    {c.reason ? ` — ${c.reason}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </Block>
        )}
      </div>

      {(!!creative.adaptation_notes?.length || fixed.length > 0 || warnings.length > 0) && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {!!creative.adaptation_notes?.length && (
            <Block
              icon={<Wand2 className="size-4 text-primary" aria-hidden="true" />}
              title="Adapted to your footage"
            >
              <ul className="list-disc space-y-0.5 pl-4 text-xs">
                {creative.adaptation_notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Block>
          )}
          {(fixed.length > 0 || warnings.length > 0) && (
            <Block
              icon={<CheckCircle2 className="size-4 text-primary" aria-hidden="true" />}
              title="Validation"
            >
              {fixed.map((n) => (
                <p key={n} className="text-xs">
                  Fixed: {n}
                </p>
              ))}
              {warnings.map((n) => (
                <p key={n} className="flex items-start gap-1.5 text-xs text-foreground">
                  <AlertTriangle
                    className="mt-0.5 size-3 shrink-0 text-destructive"
                    aria-hidden="true"
                  />{" "}
                  {n}
                </p>
              ))}
            </Block>
          )}
        </div>
      )}
    </section>
  );
}

/** "Change template" — opens the library and creates a new creative plan version. */
export function ChangeTemplateButton({
  videoId,
  currentTemplateId,
  onCreated,
}: {
  videoId: string;
  currentTemplateId?: string | null;
  onCreated?: (plan: EditPlan) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(currentTemplateId ?? "auto");
  const create = useMutation({
    mutationFn: () => api.createCreativePlan(videoId, { template_id: templateId }),
    onSuccess: (plan) => {
      qc.setQueryData(["edit-plan", videoId], plan);
      void qc.invalidateQueries({ queryKey: ["edit-plans", videoId] });
      void qc.invalidateQueries({ queryKey: ["video", videoId] });
      setOpen(false);
      onCreated?.(plan);
    },
  });

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Palette className="mr-1.5 size-4" aria-hidden="true" /> Change template
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Change template</DialogTitle>
            <DialogDescription>
              A new plan version is created with the chosen style. Your current version stays in
              history.
            </DialogDescription>
          </DialogHeader>
          <TemplateLibrary
            value={templateId}
            onChange={(id) => setTemplateId(id)}
            gridClassName="max-h-[50vh]"
          />
          {create.isError && (
            <p role="alert" className="text-xs text-destructive">
              {create.error instanceof ApiError ? create.error.detail : String(create.error)}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending && (
                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
              )}
              {create.isPending ? "Planning…" : "Create new plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
