import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api } from "./api-client";
import type { EditPlan, VideoComment } from "./api-types";
import { POLL_INTERVAL, commentsQuery, formatTimecode } from "./queries";
import { isDemoMode } from "./runtime-config";

/**
 * Timestamped review comments. Live mode uses /videos/{id}/comments; demo mode
 * keeps them in localStorage (key shared with the editor timeline markers).
 */
const KEY = (videoId: string) => `reelzoy.comments.${videoId}`;

type LocalComment = {
  id: string;
  time: number;
  text: string;
  author: string;
  createdAt?: string;
  applied?: boolean;
};

function loadLocal(videoId: string): VideoComment[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(videoId)) ?? "[]") as LocalComment[];
    return raw.map((c) => ({ ...c, created_at: c.createdAt ?? null }));
  } catch {
    return [];
  }
}

function saveLocal(videoId: string, list: VideoComment[]) {
  try {
    localStorage.setItem(
      KEY(videoId),
      JSON.stringify(
        list.map((c) => ({ ...c, author: c.author ?? "You", createdAt: c.created_at })),
      ),
    );
  } catch {
    /* storage blocked */
  }
}

export function useVideoComments(
  videoId: string | null | undefined,
  opts: { poll?: boolean } = {},
) {
  const demo = isDemoMode();
  const qc = useQueryClient();
  const live = useQuery({
    ...commentsQuery(videoId ?? ""),
    enabled: !demo && !!videoId,
    refetchInterval: opts.poll ? POLL_INTERVAL * 2 : false,
  });
  const [local, setLocal] = useState<VideoComment[]>([]);

  useEffect(() => {
    if (!demo || !videoId) return;
    const read = () => setLocal(loadLocal(videoId));
    read();
    if (!opts.poll) return;
    window.addEventListener("storage", read);
    const timer = setInterval(read, 5000);
    return () => {
      window.removeEventListener("storage", read);
      clearInterval(timer);
    };
  }, [demo, videoId, opts.poll]);

  const persist = (next: VideoComment[]) => {
    setLocal(next);
    if (videoId) saveLocal(videoId, next);
  };
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: commentsQuery(videoId ?? "").queryKey });

  const add = useMutation({
    mutationFn: async (input: { time: number; text: string; author?: string }) => {
      if (!demo) return api.createComment(videoId!, { time: input.time, text: input.text });
      const c: VideoComment = {
        id: crypto.randomUUID(),
        time: input.time,
        text: input.text,
        author: input.author ?? "You",
        created_at: new Date().toISOString(),
      };
      persist([...local, c].sort((a, b) => a.time - b.time));
      return c;
    },
    onSuccess: () => void (demo ? undefined : invalidate()),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!demo) return api.deleteComment(id);
      persist(local.filter((c) => c.id !== id));
    },
    onSuccess: () => void (demo ? undefined : invalidate()),
  });

  const apply = useMutation({
    mutationFn: async ({
      comment,
      planId,
    }: {
      comment: VideoComment;
      planId: string;
    }): Promise<EditPlan> => {
      if (!demo) return api.applyComment(comment.id);
      const plan = await api.revisePlan(
        videoId!,
        planId,
        `At ${formatTimecode(comment.time)}: ${comment.text}`,
      );
      persist(
        local.map((c) =>
          c.id === comment.id ? { ...c, applied: true, applied_plan_id: plan.id } : c,
        ),
      );
      return plan;
    },
    onSuccess: () => void (demo ? undefined : invalidate()),
  });

  return {
    comments: demo ? local : (live.data ?? []),
    isLoading: !demo && live.isPending && !!videoId,
    add,
    remove,
    apply,
  };
}
