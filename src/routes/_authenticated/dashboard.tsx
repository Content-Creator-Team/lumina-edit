import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Clapperboard, Scissors, UploadCloud } from "lucide-react";

import { EmptyState, ErrorState, LoadingState } from "@/components/app/query-states";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { POLL_INTERVAL, formatDate, isTerminal, videoTitle, videosQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your videos — Cutroom" },
      { name: "description", content: "Track uploads, AI processing and renders across your footage." },
      { property: "og:title", content: "Your videos — Cutroom" },
      {
        property: "og:description",
        content: "Track uploads, AI processing and renders across your footage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const query = useQuery({
    ...videosQuery(),
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return false;
      const active = data.some((video) => !isTerminal(video.status));
      return active ? POLL_INTERVAL : false;
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Your videos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload footage, review the AI edit plan, then render the final cut.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/trimmer">
              <Scissors className="size-4" aria-hidden="true" />
              Quick trimmer
            </Link>
          </Button>
          <Button asChild>
            <Link to="/upload">
              <UploadCloud className="size-4" aria-hidden="true" />
              Upload video
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {query.isPending ? (
          <LoadingState label="Loading your videos…" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState
            icon={<Clapperboard className="size-6 text-muted-foreground" aria-hidden="true" />}
            title="No videos yet"
            description="Upload your first clip and Cutroom will detect scenes, transcribe the audio and draft an edit plan for you to review."
            action={
              <Button asChild>
                <Link to="/upload">Upload your first video</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.map((video) => (
              <li key={video.id}>
                <Link
                  to="/videos/$id"
                  params={{ id: video.id }}
                  className="group block h-full rounded-lg border border-border bg-card transition-colors hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <div className="aspect-video overflow-hidden rounded-t-lg bg-muted">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Clapperboard
                          className="size-6 text-muted-foreground"
                          aria-hidden="true"
                          strokeWidth={1.5}
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="truncate text-sm font-medium text-foreground">
                      {videoTitle(video)}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(video.created_at ?? video.uploaded_at)}
                    </p>
                    <div className="mt-3">
                      <StatusBadge status={String(video.status)} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
