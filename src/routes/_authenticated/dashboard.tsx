import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clapperboard, Combine, Loader2, Scissors, UploadCloud, X } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/app/query-states";
import { StatusBadge } from "@/components/app/status-badge";
import { TemplateLibrary } from "@/components/app/template-library";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api-client";
import { POLL_INTERVAL, formatDate, isTerminal, videoTitle, videosQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your videos — REELZOY" },
      { name: "description", content: "Track uploads, AI processing and renders across your footage." },
      { property: "og:title", content: "Your videos — REELZOY" },
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

const READY = ["ready", "plan_ready", "approved", "rendering", "complete"];

function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [combining, setCombining] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("auto");
  const combine = useMutation({
    mutationFn: () =>
      api.combineVideos({
        video_ids: selected,
        template_id: templateId,
        ...(title.trim() ? { title: title.trim() } : {}),
      }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["videos"] });
      setDialogOpen(false);
      setCombining(false);
      setSelected([]);
      void navigate({ to: "/videos/$id", params: { id: r.video_id } });
    },
  });
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 20 ? s : [...s, id]));
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
          <Button
            variant={combining ? "secondary" : "outline"}
            onClick={() => {
              setCombining((c) => !c);
              setSelected([]);
            }}
          >
            {combining ? <X className="size-4" aria-hidden="true" /> : <Combine className="size-4" aria-hidden="true" />}
            {combining ? "Cancel combine" : "Combine"}
          </Button>
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

      {combining && (
        <div className="glass-panel sticky top-16 z-20 mt-6 flex flex-wrap items-center gap-3 rounded-xl p-3 text-sm">
          <span className="text-muted-foreground">
            {selected.length === 0
              ? "Select 2–20 ready videos in the order you want them joined."
              : `${selected.length} selected — joined in the order you picked them.`}
          </span>
          <Button
            size="sm"
            className="ml-auto"
            disabled={selected.length < 2}
            onClick={() => {
              combine.reset();
              setDialogOpen(true);
            }}
          >
            Combine {selected.length >= 2 ? selected.length : ""} clips
          </Button>
        </div>
      )}

      <div className="mt-8">
        {query.isPending ? (
          <LoadingState label="Loading your videos…" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <EmptyState
            icon={<Clapperboard className="size-6 text-muted-foreground" aria-hidden="true" />}
            title="No videos yet"
            description="Upload your first clip and REELZOY will detect scenes, transcribe the audio and draft an edit plan for you to review."
            action={
              <Button asChild>
                <Link to="/upload">Upload your first video</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.map((video) => {
              const order = selected.indexOf(video.id);
              const selectable = READY.includes(String(video.status).toLowerCase());
              return (
              <li key={video.id} className="relative">
                {combining && (
                  <label
                    className={`absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-xs shadow ${selectable ? "cursor-pointer" : "opacity-50"}`}
                  >
                    <Checkbox
                      checked={order >= 0}
                      disabled={!selectable}
                      onCheckedChange={() => toggle(video.id)}
                      aria-label={`Select ${videoTitle(video)} to combine`}
                    />
                    {order >= 0 ? `#${order + 1}` : selectable ? "Select" : "Not ready"}
                  </label>
                )}
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
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={String(video.status)} />
                    </div>
                    {["ready", "plan_ready", "approved", "rendering", "complete"].includes(
                      String(video.status).toLowerCase(),
                    ) && (
                      <div
                        className="mt-3 flex flex-wrap gap-2"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Button asChild size="sm" variant="secondary" className="h-7 text-xs">
                          <Link to="/editor/$videoId" params={{ videoId: video.id }}>
                            Editor
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                          <Link to="/videos/$id/review" params={{ id: video.id }}>
                            Review
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                          <Link to="/videos/$id/thumbnails" params={{ id: video.id }}>
                            Thumbs
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Combine {selected.length} clips</DialogTitle>
            <DialogDescription>
              {selected
                .map((id) => query.data?.find((v) => v.id === id))
                .map((v, i) => `${i + 1}. ${v ? videoTitle(v) : "?"}`)
                .join("  ·  ")}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="combine-title" className="text-xs">Title (optional)</Label>
            <Input id="combine-title" className="mt-1" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <TemplateLibrary value={templateId} onChange={(id) => setTemplateId(id)} gridClassName="max-h-[40vh]" />
          {combine.isError && (
            <p role="alert" className="text-xs text-destructive">
              {combine.error instanceof ApiError ? combine.error.detail : String(combine.error)}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={combine.isPending || selected.length < 2} onClick={() => combine.mutate()}>
              {combine.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Combine into one edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
