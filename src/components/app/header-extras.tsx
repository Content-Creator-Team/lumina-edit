import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Gauge, Loader2, MessageSquarePlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api-client";
import type { FeedbackInput } from "@/lib/api-types";
import { formatDate, notificationsQuery, usageQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Bell with unread count; opening the list marks everything seen. */
export function NotificationsBell() {
  const qc = useQueryClient();
  const q = useQuery(notificationsQuery());
  const seen = useMutation({
    mutationFn: () => api.markNotificationsSeen(),
    onSuccess: (data) => qc.setQueryData(notificationsQuery().queryKey, data),
  });
  const unread = q.data?.unread ?? 0;
  const items = q.data?.items ?? [];

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open && unread > 0) seen.mutate();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative rounded-md p-2 text-muted-foreground hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Bell className="size-4" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] leading-4 font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => seen.mutate()}
            >
              Mark all seen
            </button>
          )}
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {q.isPending && (
            <li className="flex justify-center p-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
            </li>
          )}
          {!q.isPending && items.length === 0 && (
            <li className="p-4 text-center text-xs text-muted-foreground">You're all caught up.</li>
          )}
          {items.map((n) => {
            const body = (
              <>
                <p className="flex items-center gap-1.5 text-sm text-foreground">
                  {n.unread && (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-primary"
                      aria-label="Unread"
                    />
                  )}
                  {n.title}
                </p>
                {n.detail && <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>}
                <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(n.at)}</p>
              </>
            );
            return (
              <li
                key={n.id}
                className={cn("border-b border-border last:border-0", n.unread && "bg-accent/30")}
              >
                {n.video_id ? (
                  <Link
                    to="/videos/$id"
                    params={{ id: n.video_id }}
                    className="block px-3 py-2 hover:bg-accent/50"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="px-3 py-2">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Usage pill from /me/usage (live mode). */
export function UsagePill({ className }: { className?: string }) {
  const q = useQuery(usageQuery());
  if (!q.data) return null;
  const u = q.data;
  const limit = u.limits?.["upload_minutes"];
  const label = limit
    ? `${Math.round(u.upload_minutes)} / ${limit} min`
    : `${Math.round(u.upload_minutes)} min uploaded`;
  const title = [
    `${u.uploads} uploads · ${Math.round(u.upload_minutes)} min`,
    `${u.renders} renders · ${Math.round(u.render_minutes)} min`,
    `${u.revisions_today} revisions today${u.limits?.["revisions_per_day"] ? ` of ${u.limits["revisions_per_day"]}` : ""}`,
  ].join("\n");
  return (
    <span
      title={title}
      className={cn(
        "items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground",
        className,
      )}
    >
      <Gauge className="size-3 text-primary" aria-hidden="true" />
      {label} · {u.renders} renders
    </span>
  );
}

/** Small "Send feedback" dialog posting to /feedback. */
export function FeedbackButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackInput["kind"]>("idea");
  const [message, setMessage] = useState("");
  const send = useMutation({
    mutationFn: () => {
      const videoId =
        pathname.match(/\/videos\/([^/]+)/)?.[1] ?? pathname.match(/\/editor\/([^/]+)/)?.[1];
      return api.sendFeedback({
        kind,
        message: message.trim(),
        page: pathname,
        ...(videoId ? { video_id: videoId } : {}),
      });
    },
    onSuccess: () => setMessage(""),
  });

  return (
    <>
      <button
        type="button"
        aria-label="Send feedback"
        title="Send feedback"
        onClick={() => {
          send.reset();
          setOpen(true);
        }}
        className="rounded-md p-2 text-muted-foreground hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <MessageSquarePlus className="size-4" aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>
              Found a bug or have an idea? It goes straight to the team.
            </DialogDescription>
          </DialogHeader>
          {send.isSuccess ? (
            <p role="status" className="text-sm text-muted-foreground">
              Thanks — your feedback was sent.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-1.5" role="radiogroup" aria-label="Feedback type">
                {(["bug", "idea", "other"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={kind === k}
                    onClick={() => setKind(k)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs capitalize",
                      kind === k
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="What happened, or what would help?"
                aria-label="Feedback message"
              />
              {send.isError && (
                <p role="alert" className="text-xs text-destructive">
                  {send.error instanceof ApiError ? send.error.detail : String(send.error)}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {send.isSuccess ? "Close" : "Cancel"}
            </Button>
            {!send.isSuccess && (
              <Button
                disabled={message.trim().length < 3 || send.isPending}
                onClick={() => send.mutate()}
              >
                {send.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Send
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
