import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clapperboard,
  FileText,
  Film,
  History,
  Image as ImageIcon,
  ListChecks,
  PlayCircle,
  Wand2,
} from "lucide-react";

import { StatusBadge } from "@/components/app/status-badge";
import { VideoActionsMenu } from "@/components/app/video-actions-menu";
import { videoQuery, videoTitle } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/videos/$id")({
  component: VideoWorkspaceLayout,
});

const TABS = [
  { to: "/videos/$id", label: "Overview", icon: Clapperboard, exact: true },
  { to: "/videos/$id/plan", label: "AI plan", icon: ListChecks },
  { to: "/videos/$id/review", label: "Review", icon: FileText },
  { to: "/videos/$id/thumbnails", label: "Thumbnails", icon: ImageIcon },
  { to: "/videos/$id/versions", label: "Versions", icon: History },
  { to: "/videos/$id/render", label: "Render", icon: PlayCircle },
] as const;

/** One workspace per video: every per-video screen is a tab under a shared header. */
function VideoWorkspaceLayout() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const video = useQuery(videoQuery(id));
  const base = `/videos/${id}`;

  return (
    <div className="space-y-6">
      <div className="workspace-head glass-panel scene-tilt rounded-2xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Film className="size-4 text-primary" aria-hidden="true" />
          <span className="eyebrow">Video workspace</span>
          <h1 className="min-w-0 truncate font-[family-name:var(--font-display)] text-base">
            {video.data ? videoTitle(video.data) : "Loading…"}
          </h1>
          {video.data && <StatusBadge status={video.data.status} />}
          {video.data && (
            <span className="ml-auto">
              <VideoActionsMenu video={video.data} />
            </span>
          )}
        </div>
        <nav aria-label="Video sections" className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-0.5">
          {TABS.map((tab) => {
            const href = tab.to.replace("/videos/$id", base);
            const active = "exact" in tab ? pathname === base || pathname === `${base}/` : pathname.startsWith(href);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                params={{ id }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "bg-primary/15 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <tab.icon className="size-4" aria-hidden="true" strokeWidth={1.75} />
                {tab.label}
                {active && (
                  <span aria-hidden="true" className="bg-brand-gradient absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full" />
                )}
              </Link>
            );
          })}
          <Link
            to="/editor/$videoId"
            params={{ videoId: id }}
            className="bg-brand-gradient ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Wand2 className="size-4" aria-hidden="true" />
            Open editor
          </Link>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
