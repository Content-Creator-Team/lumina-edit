import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Clapperboard, Pencil, RefreshCw, Scissors, Loader2 } from "lucide-react";

import { ChangeTemplateButton, CreativePlanPanel } from "@/components/app/creative-plan-panel";
import { ErrorState, LoadingState } from "@/components/app/query-states";
import { StatusBadge } from "@/components/app/status-badge";
import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { editPlanQuery, videoQuery, videoTitle } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/videos/$id/plan")({
  head: () => ({
    meta: [
      { title: "AI edit plan — REELZOY" },
      { name: "description", content: "Review the AI-generated edit plan before editing or rendering." },
      { property: "og:title", content: "AI edit plan — REELZOY" },
      { property: "og:description", content: "Review the AI-generated edit plan before editing or rendering." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlanPage,
});

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function PlanPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const video = useQuery(videoQuery(id));
  const plan = useQuery(editPlanQuery(id));
  const renderJobs = useQuery({
    queryKey: ["render-jobs", id],
    queryFn: () => api.listRenderJobs(id),
    enabled: Boolean(plan.data?.creative),
  });
  const lastReport =
    [...(renderJobs.data ?? [])]
      .filter((j) => String(j.status).toLowerCase() === "complete" && j.report)
      .sort((a, b) => String(b.completed_at ?? b.created_at ?? "").localeCompare(String(a.completed_at ?? a.created_at ?? "")))[0]
      ?.report ?? null;

  const approve = useMutation({
    mutationFn: () => api.approvePlan(plan.data!.id),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["video", id] });
      const job = r.render_job_id ?? r.job_id ?? r.id ?? undefined;
      navigate({ to: "/videos/$id/render", params: { id }, search: job ? { job } : {} });
    },
  });

  if (plan.isPending) return <LoadingState label="Loading edit plan…" />;
  if (plan.isError)
    return <ErrorState error={plan.error} onRetry={() => void plan.refetch()} />;
  if (!plan.data || !plan.data.segments?.length)
    return (
      <div className="surface-card mx-auto max-w-xl rounded-2xl p-8 text-center">
        <p className="font-semibold">No valid plan exists yet.</p>
        <p className="mt-2 text-sm text-muted-foreground">Generation may still be running or may have failed.</p>
        <Button className="mt-5" onClick={() => void plan.refetch()}>
          <RefreshCw className="mr-1.5 size-4" /> Retry
        </Button>
      </div>
    );

  const p = plan.data;
  const segs = [...p.segments].sort((a, b) => (a.order ?? a.start) - (b.order ?? b.start));
  const total = Math.max(...segs.map((s) => s.end), 1);
  const kept = segs.filter((s) => s.action === "keep");
  const keptDur = kept.reduce((a, s) => a + (s.end - s.start), 0);
  const isDraft = String(p.status).toLowerCase() === "draft";

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/videos/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to video
      </Link>

      <Reveal>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-widest text-primary uppercase">AI edit plan · v{p.version ?? 1}</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold">
              {video.data ? videoTitle(video.data) : "Your video"}
            </h1>
          </div>
          <StatusBadge status={String(p.status).toLowerCase()} />
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["Segments", String(segs.length)],
            ["Kept", `${kept.length} · ${fmt(keptDur)}`],
            ["Removed", `${segs.length - kept.length} · ${fmt(total - keptDur)}`],
          ].map(([k, v]) => (
            <div key={k} className="surface-card rounded-2xl p-5">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {p.creative && <CreativePlanPanel creative={p.creative} renderReport={lastReport} />}

      <Reveal delay={140}>
        <div className="surface-card mt-6 rounded-2xl p-5">
          <p className="text-sm font-semibold">Timeline overview</p>
          <div className="mt-3 flex h-10 overflow-hidden rounded-lg bg-muted" role="img" aria-label={`${kept.length} kept and ${segs.length - kept.length} cut segments`}>
            {segs.map((s) => (
              <div
                key={s.id}
                title={`${s.action} ${fmt(s.start)}–${fmt(s.end)}`}
                className={s.action === "keep" ? "bg-brand-gradient border-r border-background/40" : "border-r border-background/40 bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_4px,var(--border)_4px,var(--border)_8px)]"}
                style={{ width: `${((s.end - s.start) / total) * 100}%` }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Solid = kept · Striped = cut</p>
        </div>
      </Reveal>

      <ol className="mt-6 space-y-2">
        {segs.map((s, i) => (
          <Reveal key={s.id} as="li" delay={Math.min(i * 40, 400)}>
            <div className="surface-card flex items-start gap-4 rounded-xl p-4">
              <span className="font-mono text-xs text-muted-foreground">{fmt(s.start)}–{fmt(s.end)}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.action === "keep" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                {s.action === "keep" ? <Check className="size-3" /> : <Scissors className="size-3" />}
                {s.action === "keep" ? "Keep" : "Cut"}
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p>{s.caption || s.text_overlay || "No caption"}</p>
                {s.reason && <p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>}
              </div>
            </div>
          </Reveal>
        ))}
      </ol>

      <div className="glass-panel sticky bottom-4 mt-8 flex flex-wrap gap-3 rounded-2xl p-4">
        <Button disabled={!isDraft || approve.isPending} onClick={() => approve.mutate()} className="bg-brand-gradient text-primary-foreground">
          {approve.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Check className="mr-1.5 size-4" />}
          Approve and continue
        </Button>
        <Button asChild variant="secondary">
          <Link to="/videos/$id/review" params={{ id }}><Pencil className="mr-1.5 size-4" /> Edit plan</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/editor/$videoId" params={{ videoId: id }}><Clapperboard className="mr-1.5 size-4" /> Open in editor</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/videos/$id/review" params={{ id }}><RefreshCw className="mr-1.5 size-4" /> Regenerate plan</Link>
        </Button>
        <ChangeTemplateButton videoId={id} currentTemplateId={p.template_id ?? video.data?.template_id ?? null} />
        <Button asChild variant="ghost">
          <Link to="/videos/$id/versions" params={{ id }}>All versions</Link>
        </Button>
        {!isDraft && <p className="w-full text-xs text-muted-foreground">This version is locked. Edit or regenerate to create a new version.</p>}
        {approve.isError && <p role="alert" className="w-full text-xs text-destructive">{String(approve.error)}</p>}
      </div>
    </div>
  );
}
