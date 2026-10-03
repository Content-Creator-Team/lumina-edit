import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ImageIcon, Loader2, RefreshCw } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/app/query-states";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { videoQuery, videoTitle } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/videos/$id/thumbnails")({
  head: () => ({
    meta: [
      { title: "Thumbnail Studio — Cutroom" },
      { name: "description", content: "Browse and regenerate AI thumbnail options." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThumbnailStudioPage,
});

function ThumbnailStudioPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const videoQ = useQuery(videoQuery(id));
  const thumbsQ = useQuery({
    queryKey: ["thumbnails", id],
    queryFn: () => api.listThumbnails(id),
  });

  const regen = useMutation({
    mutationFn: () => api.regenerateThumbnails(id, 4),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["thumbnails", id] });
    },
  });

  if (videoQ.isPending) return <LoadingState label="Loading video…" />;
  if (videoQ.isError) return <ErrorState error={videoQ.error} onRetry={() => void videoQ.refetch()} />;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/videos/$id"
        params={{ id }}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to video
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Thumbnail Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">{videoTitle(videoQ.data)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/editor/$videoId" params={{ videoId: id }}>Open editor</Link>
          </Button>
          <Button size="sm" disabled={regen.isPending} onClick={() => regen.mutate()}>
            {regen.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 size-3.5" />}
            Regenerate
          </Button>
        </div>
      </div>

      {thumbsQ.isPending && (
        <div className="mt-10 flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      )}
      {thumbsQ.isError && (
        <ErrorState error={thumbsQ.error} onRetry={() => void thumbsQ.refetch()} />
      )}

      {thumbsQ.data && thumbsQ.data.length === 0 && (
        <div className="mt-10 rounded-lg border border-dashed border-border p-10 text-center">
          <ImageIcon className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No thumbnails yet. Regenerate to extract highlight frames, or wait for the ingest pipeline.
          </p>
          <Button className="mt-4" disabled={regen.isPending} onClick={() => regen.mutate()}>
            Generate thumbnails
          </Button>
        </div>
      )}

      {thumbsQ.data && thumbsQ.data.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {thumbsQ.data.map((thumb) => (
            <figure key={thumb.id} className="overflow-hidden rounded-lg border border-border bg-muted/20">
              <img
                src={thumb.url}
                alt={thumb.label ?? "Thumbnail"}
                className="aspect-video w-full object-cover"
              />
              <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground">
                <span className="truncate">{thumb.label ?? thumb.variant}</span>
                {thumb.timestamp != null && (
                  <span className="tabular-nums">{thumb.timestamp.toFixed(1)}s</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {regen.isError && (
        <p className="mt-4 text-sm text-red-400">{String(regen.error)}</p>
      )}
    </div>
  );
}
