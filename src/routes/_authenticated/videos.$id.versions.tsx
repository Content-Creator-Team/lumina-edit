import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, GitCompareArrows, History, Info } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/app/query-states";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { editPlansQuery, formatDate, formatTimecode } from "@/lib/queries";
import type { EditPlan, PlanSegment } from "@/lib/api-types";
import { VariantCuts } from "@/components/app/variant-cuts";

/** Segment-level diff between two plan versions: added, removed and changed. */
function diffPlans(older: EditPlan, newer: EditPlan) {
  const key = (s: PlanSegment) => `${(s.start_ts ?? s.start).toFixed(1)}-${(s.end_ts ?? s.end).toFixed(1)}`;
  const oldMap = new Map(older.segments.map((s) => [key(s), s]));
  const newMap = new Map(newer.segments.map((s) => [key(s), s]));
  const added = newer.segments.filter((s) => !oldMap.has(key(s)));
  const removed = older.segments.filter((s) => !newMap.has(key(s)));
  const changed = newer.segments.filter((s) => {
    const prev = oldMap.get(key(s));
    return prev && (prev.action !== s.action || prev.caption !== s.caption);
  });
  return { added, removed, changed };
}

function ComparePlans({ plans }: { plans: EditPlan[] }) {
  const [aId, setAId] = useState(plans[1]?.id ?? plans[0]!.id);
  const [bId, setBId] = useState(plans[0]!.id);
  const a = plans.find((p) => p.id === aId);
  const b = plans.find((p) => p.id === bId);
  const diff = useMemo(() => (a && b && a.id !== b.id ? diffPlans(a, b) : null), [a, b]);

  const selectCls = "rounded-md border border-border bg-background px-2 py-1.5 text-xs";

  return (
    <section aria-labelledby="compare-heading" className="mt-10 rounded-lg border border-border p-4">
      <h2 id="compare-heading" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl">
        <GitCompareArrows className="size-5 text-primary" aria-hidden="true" />
        Compare versions
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label className="sr-only" htmlFor="compare-from">Older version</label>
        <select id="compare-from" className={selectCls} value={aId} onChange={(e) => setAId(e.target.value)}>
          {plans.map((p) => <option key={p.id} value={p.id}>v{p.version ?? "?"}</option>)}
        </select>
        <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <label className="sr-only" htmlFor="compare-to">Newer version</label>
        <select id="compare-to" className={selectCls} value={bId} onChange={(e) => setBId(e.target.value)}>
          {plans.map((p) => <option key={p.id} value={p.id}>v{p.version ?? "?"}</option>)}
        </select>
      </div>
      {a?.id === b?.id ? (
        <p className="mt-3 text-sm text-muted-foreground">Pick two different versions to compare.</p>
      ) : diff && (
        <div className="mt-4 space-y-3 text-sm">
          {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 && (
            <p className="text-muted-foreground">No segment differences between these versions.</p>
          )}
          {diff.changed.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Changed ({diff.changed.length})</p>
              <ul className="mt-1 space-y-1">
                {diff.changed.map((s) => {
                  const prev = a!.segments.find((p) => p.id !== s.id && `${(p.start_ts ?? p.start).toFixed(1)}-${(p.end_ts ?? p.end).toFixed(1)}` === `${(s.start_ts ?? s.start).toFixed(1)}-${(s.end_ts ?? s.end).toFixed(1)}`);
                  return (
                    <li key={s.id} className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs">
                      <span className="font-mono text-primary">{formatTimecode(s.start_ts ?? s.start)}</span>{" "}
                      {prev?.action !== s.action && <span className="font-medium">{prev?.action === "cut" ? "Cut → Kept" : "Kept → Cut"}</span>}
                      {prev?.caption !== s.caption && <span className="text-muted-foreground"> caption: “{prev?.caption ?? "—"}” → “{s.caption ?? "—"}”</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {diff.added.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-success">Added ({diff.added.length})</p>
              <ul className="mt-1 space-y-1">
                {diff.added.map((s) => (
                  <li key={s.id} className="rounded-md border border-success/30 bg-success/5 px-2 py-1.5 text-xs">
                    <span className="font-mono text-primary">{formatTimecode(s.start_ts ?? s.start)}–{formatTimecode(s.end_ts ?? s.end)}</span>{" "}
                    {s.action === "cut" ? "Cut" : "Keep"} · {s.caption ?? s.reason ?? "—"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {diff.removed.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-destructive">Removed ({diff.removed.length})</p>
              <ul className="mt-1 space-y-1">
                {diff.removed.map((s) => (
                  <li key={s.id} className="rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs">
                    <span className="font-mono text-primary">{formatTimecode(s.start_ts ?? s.start)}–{formatTimecode(s.end_ts ?? s.end)}</span>{" "}
                    {s.action === "cut" ? "Cut" : "Keep"} · {s.caption ?? s.reason ?? "—"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export const Route = createFileRoute("/_authenticated/videos/$id/versions")({
  head: () => ({
    meta: [
      { title: "Plan versions — REELZOY" },
      { name: "description", content: "Read-only history of every AI edit plan for this video." },
      { property: "og:title", content: "Plan versions — REELZOY" },
      {
        property: "og:description",
        content: "Read-only history of every AI edit plan for this video.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VersionsPage,
});

function planSource(plan: EditPlan) {
  if (plan.revision_instruction) return `Revision: “${plan.revision_instruction}”`;
  if (plan.source) return plan.source;
  return "Automatic generation";
}

function VersionsPage() {
  const { id } = Route.useParams();
  const query = useQuery(editPlansQuery(id));
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);

  if (query.isPending) return <LoadingState label="Loading plan versions…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const plans = [...query.data].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/videos/$id"
        params={{ id }}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        ← Back to video
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl">Plan versions</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every plan version is kept exactly as it was. History is never rewritten.
      </p>

      <VariantCuts videoId={id} />

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl">Plan history</h2>
      <p className="mt-6 flex items-start gap-2 rounded-md border border-border p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Restoring an older version isn't available: the API has no restore endpoint, and creating a
        new version out of an old one would require it. To move back toward an earlier cut, describe
        the change in the revision prompt on the review screen — that produces a new version and
        leaves this history untouched.
      </p>

      {plans.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<History className="size-6 text-muted-foreground" aria-hidden="true" />}
            title="No plan versions yet"
            description="Once REELZOY finishes analysing this video, the first edit plan will appear here."
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {plans.map((plan) => {
            const open = openPlanId === plan.id;
            return (
              <li key={plan.id} className="rounded-lg border border-border">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <span className="font-[family-name:var(--font-display)] text-lg">
                    v{plan.version ?? "?"}
                  </span>
                  <StatusBadge status={String(plan.status).toLowerCase()} />
                  <span className="text-sm text-muted-foreground">{formatDate(plan.created_at)}</span>
                  <span className="w-full text-sm text-muted-foreground sm:w-auto sm:flex-1 sm:truncate">
                    {planSource(plan)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-expanded={open}
                    onClick={() => setOpenPlanId(open ? null : plan.id)}
                  >
                    {open ? "Hide segments" : "View read-only"}
                  </Button>
                </div>

                {open && (
                  <div className="border-t border-border p-4">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">Segments in plan version {plan.version}</caption>
                      <thead className="text-xs text-muted-foreground">
                        <tr>
                          <th scope="col" className="py-1 pr-4 font-medium">Start</th>
                          <th scope="col" className="py-1 pr-4 font-medium">End</th>
                          <th scope="col" className="py-1 pr-4 font-medium">Action</th>
                          <th scope="col" className="py-1 font-medium">Caption</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.segments.map((segment) => (
                          <tr key={segment.id} className="border-t border-border/60">
                            <td className="py-2 pr-4 font-mono text-xs">{formatTimecode(segment.start)}</td>
                            <td className="py-2 pr-4 font-mono text-xs">{formatTimecode(segment.end)}</td>
                            <td className="py-2 pr-4">{segment.action === "cut" ? "Cut" : "Keep"}</td>
                            <td className="py-2 text-muted-foreground">{segment.caption ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
