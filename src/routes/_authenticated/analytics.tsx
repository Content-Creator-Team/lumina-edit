import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Film, Gauge, ListChecks, Timer, XCircle } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/app/query-states";
import { Reveal } from "@/components/landing/reveal";
import { analyticsSummaryQuery, videosQuery } from "@/lib/queries";
import { isDemoMode } from "@/lib/runtime-config";

function Breakdown({ title, data, empty }: { title: string; data: Record<string, number>; empty: string }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((a, [, n]) => a + n, 0) || 1;
  return (
    <div className="surface-card h-full rounded-2xl p-6">
      <p className="text-sm font-semibold">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map(([s, n]) => (
            <li key={s}>
              <div className="flex justify-between text-sm"><span className="capitalize">{s.replace(/_/g, " ")}</span><span>{n}</span></div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${(n / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const secs = (v: number | null | undefined) =>
  v == null ? "—" : v < 90 ? `${Math.round(v)}s` : `${Math.round(v / 60)}m`;

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — REELZOY" },
      { name: "description", content: "Your workspace activity: videos, processing status and footage volume." },
      { property: "og:title", content: "Analytics — REELZOY" },
      { property: "og:description", content: "Your workspace activity: videos, processing status and footage volume." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const q = useQuery({ ...videosQuery(), enabled: isDemoMode() });
  const summaryQ = useQuery(analyticsSummaryQuery());
  if (summaryQ.isPending) return <LoadingState label="Loading analytics…" />;
  if (summaryQ.isError) return <ErrorState error={summaryQ.error} onRetry={() => void summaryQ.refetch()} />;

  const summary = summaryQ.data;
  const videos = q.data ?? [];
  const by: Record<string, number> = {};
  for (const [k, n] of Object.entries(summary.videos.by_status)) by[k.toLowerCase()] = (by[k.toLowerCase()] ?? 0) + n;
  const renders = summary.renders;

  // Uploads per day, last 14 days, from real created_at values.
  // Live: server-side daily counts. Demo / older backends: derive from the video list.
  const byDay = !isDemoMode() && summary.uploads_by_day?.length ? summary.uploads_by_day : null;
  const days = byDay
    ? byDay.map((d) => new Date(`${d.date}T00:00:00`))
    : Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (13 - i));
        return d;
      });
  const perDay = byDay
    ? byDay.map((d) => d.count)
    : days.map(
        (d) =>
          videos.filter((v) => {
            const t = new Date(v.created_at ?? v.uploaded_at ?? 0);
            return t >= d && t.getTime() < d.getTime() + 864e5;
          }).length,
      );
  const max = Math.max(...perDay, 1);

  const kpis = [
    { icon: Film, label: "Videos", value: summary.videos.total },
    { icon: Clock, label: "Footage (min)", value: Math.round(summary.videos.minutes_uploaded) },
    { icon: Timer, label: "Avg. processing", value: secs(summary.videos.avg_processing_seconds) },
    { icon: ListChecks, label: `Plans · ${summary.plans.revisions} revisions`, value: summary.plans.total },
    { icon: CheckCircle2, label: `Renders completed of ${renders.total}`, value: renders.completed },
    { icon: XCircle, label: "Renders failed", value: renders.failed },
    {
      icon: Gauge,
      label: "Render success rate",
      value: renders.success_rate == null ? "—" : `${Math.round((renders.success_rate > 1 ? renders.success_rate / 100 : renders.success_rate) * 100)}%`,
    },
    { icon: Clock, label: `Minutes rendered · avg ${secs(renders.avg_render_seconds)}`, value: Math.round(renders.minutes_rendered) },
  ];

  return (
    <div>
      <Reveal>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          Workspace <span className="text-brand-gradient">analytics</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Processing, planning and render activity for your workspace. Views and engagement need a publishing integration.</p>
      </Reveal>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Reveal key={k.label} delay={i * 70}>
            <div className="surface-card rounded-2xl p-5">
              <k.icon className="size-5 text-primary" aria-hidden="true" />
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Reveal delay={120} className="lg:col-span-2">
          <div className="surface-card h-full rounded-2xl p-6">
            <p className="text-sm font-semibold">Uploads — last 14 days</p>
            <div className="mt-6 flex h-48 items-end gap-2" role="img" aria-label={`Uploads per day: ${perDay.join(", ")}`}>
              {perDay.map((n, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{n || ""}</span>
                  <div
                    className="bg-brand-gradient analytics-bar w-full rounded-t-md"
                    style={{ height: `${(n / max) * 100}%`, minHeight: 3, animationDelay: `${i * 40}ms` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{days[i]!.getDate()}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={180}>
          <Breakdown title="Videos by status" data={by} empty="No videos yet." />
        </Reveal>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Reveal delay={220}>
          <Breakdown title="Templates used" data={summary.plans.templates} empty="No plans yet." />
        </Reveal>
        <Reveal delay={260}>
          <Breakdown title="Content types" data={summary.videos.content_types} empty="Nothing analysed yet." />
        </Reveal>
      </div>
    </div>
  );
}
