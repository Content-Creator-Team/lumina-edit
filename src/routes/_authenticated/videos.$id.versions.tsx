import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { History, Info } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/app/query-states";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { editPlansQuery, formatDate, formatTimecode } from "@/lib/queries";
import type { EditPlan } from "@/lib/api-types";

export const Route = createFileRoute("/_authenticated/videos/$id/versions")({
  head: () => ({
    meta: [
      { title: "Plan versions — Cutroom" },
      { name: "description", content: "Read-only history of every AI edit plan for this video." },
      { property: "og:title", content: "Plan versions — Cutroom" },
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
    <div className="mx-auto max-w-4xl">
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
            description="Once Cutroom finishes analysing this video, the first edit plan will appear here."
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
