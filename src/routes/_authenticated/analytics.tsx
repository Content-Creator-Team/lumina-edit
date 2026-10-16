import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Film, XCircle } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/app/query-states";
import { Reveal } from "@/components/landing/reveal";
import { videosQuery } from "@/lib/queries";

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
  const q = useQuery(videosQuery());
  if (q.isPending) return <LoadingState label="Loading analytics…" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;

  const videos = q.data;
  const by: Record<string, number> = {};
  for (const v of videos) by[String(v.status).toLowerCase()] = (by[String(v.status).toLowerCase()] ?? 0) + 1;
  const done = (by.complete ?? 0) + (by.approved ?? 0) + (by.plan_ready ?? 0) + (by.ready ?? 0);
  const failed = by.failed ?? 0;
  const minutes = Math.round(videos.reduce((a, v) => a + (v.duration ?? 0), 0) / 60);

  // Uploads per day, last 14 days, from real created_at values.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (13 - i));
    return d;
  });
  const perDay = days.map((d) =>
    videos.filter((v) => {
      const t = new Date(v.created_at ?? v.uploaded_at ?? 0);
      return t >= d && t.getTime() < d.getTime() + 864e5;
    }).length,
  );
  const max = Math.max(...perDay, 1);
  const statuses = Object.entries(by).sort((a, b) => b[1] - a[1]);

  const kpis = [
    { icon: Film, label: "Videos", value: videos.length },
    { icon: Clock, label: "Footage (min)", value: minutes },
    { icon: CheckCircle2, label: "Plans ready or done", value: done },
    { icon: XCircle, label: "Failed", value: failed },
  ];

  return (
    <div>
      <Reveal>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">
          Workspace <span className="text-brand-gradient">analytics</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Calculated from the videos in your workspace. Views and engagement need a publishing integration.</p>
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
          <div className="surface-card h-full rounded-2xl p-6">
            <p className="text-sm font-semibold">By status</p>
            {statuses.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No videos yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {statuses.map(([s, n]) => (
                  <li key={s}>
                    <div className="flex justify-between text-sm"><span className="capitalize">{s.replace("_", " ")}</span><span>{n}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${(n / videos.length) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
