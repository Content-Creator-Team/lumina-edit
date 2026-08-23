import { queryOptions } from "@tanstack/react-query";

import { api, toArray } from "./api-client";
import type { EditPlan, Scene, Transcript, Video } from "./api-types";

export const TERMINAL_STATUSES = new Set(["complete", "failed"]);
export const POLL_INTERVAL = 5_000;

export const videosQuery = () =>
  queryOptions({
    queryKey: ["videos"],
    queryFn: async (): Promise<Video[]> => toArray(await api.listVideos()),
  });

export const videoQuery = (videoId: string) =>
  queryOptions({
    queryKey: ["video", videoId],
    queryFn: () => api.getVideo(videoId),
  });

export const scenesQuery = (videoId: string) =>
  queryOptions({
    queryKey: ["scenes", videoId],
    queryFn: async (): Promise<Scene[]> => toArray(await api.getScenes(videoId)),
  });

export const transcriptQuery = (videoId: string) =>
  queryOptions({
    queryKey: ["transcript", videoId],
    queryFn: async (): Promise<Transcript> => {
      const result = await api.getTranscript(videoId);
      return (result ?? {}) as Transcript;
    },
  });

export const editPlanQuery = (videoId: string) =>
  queryOptions({
    queryKey: ["edit-plan", videoId],
    queryFn: () => api.getEditPlan(videoId),
  });

export const editPlansQuery = (videoId: string) =>
  queryOptions({
    queryKey: ["edit-plans", videoId],
    queryFn: async (): Promise<EditPlan[]> => toArray(await api.listEditPlans(videoId)),
  });

export const planQuery = (planId: string) =>
  queryOptions({
    queryKey: ["plan", planId],
    queryFn: () => api.getPlan(planId),
  });

export const renderJobQuery = (jobId: string) =>
  queryOptions({
    queryKey: ["render-job", jobId],
    queryFn: () => api.getRenderJob(jobId),
  });

export function isTerminal(status: string | undefined | null) {
  return TERMINAL_STATUSES.has((status ?? "").toLowerCase());
}

export function formatTimecode(seconds: number | null | undefined) {
  if (seconds == null || Number.isNaN(seconds)) return "--:--";
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const frac = Math.floor((seconds - total) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${frac}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function videoTitle(video: Pick<Video, "name" | "title" | "filename" | "id">) {
  return video.name ?? video.title ?? video.filename ?? `Video ${video.id.slice(0, 8)}`;
}
