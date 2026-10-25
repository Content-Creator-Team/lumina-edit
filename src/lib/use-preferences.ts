import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "./api-client";
import type { UserPreferences, Video } from "./api-types";
import {
  PROJECT_GOALS,
  getProjectGoal,
  getPromptHistory,
  getSavedPrompts,
  recordPrompt as recordPromptLocal,
  setProjectGoal,
  styleMemoryHints,
  toggleSavedPrompt as toggleSavedLocal,
  type ProjectGoalId,
} from "./editor-extras";
import { preferencesQuery, videoQuery } from "./queries";
import { isDemoMode } from "./runtime-config";

/**
 * Prompt history, saved prompts and style-memory hints. Live mode reads and
 * writes /me/preferences; demo mode keeps the localStorage fallback.
 */
export function usePromptPreferences() {
  const demo = isDemoMode();
  const queryClient = useQueryClient();
  const prefs = useQuery({ ...preferencesQuery(), enabled: !demo });
  const [local, setLocal] = useState(() => ({
    history: demo ? getPromptHistory() : [],
    saved: demo ? getSavedPrompts() : [],
  }));

  const setCache = (next: UserPreferences) =>
    queryClient.setQueryData(preferencesQuery().queryKey, next);
  const addPrompt = useMutation({
    mutationFn: (p: string) => api.addPrompt(p),
    onSuccess: setCache,
  });
  const putPrefs = useMutation({
    mutationFn: (saved: string[]) => api.putPreferences({ saved_prompts: saved }),
    onSuccess: setCache,
  });
  const clearMemory = useMutation({
    mutationFn: () => api.clearStyleMemory(),
    onSuccess: setCache,
  });

  const history = demo ? local.history : (prefs.data?.data.prompt_history ?? []);
  const saved = demo ? local.saved : (prefs.data?.data.saved_prompts ?? []);
  const hints = demo ? styleMemoryHints() : (prefs.data?.style_hints ?? []);

  return {
    history,
    saved,
    hints,
    recordPrompt(prompt: string) {
      const p = prompt.trim();
      if (!p) return;
      if (demo) {
        recordPromptLocal(p);
        setLocal((s) => ({ ...s, history: getPromptHistory() }));
      } else addPrompt.mutate(p);
    },
    toggleSaved(prompt: string) {
      const p = prompt.trim();
      if (demo) {
        const next = toggleSavedLocal(p);
        setLocal((s) => ({ ...s, saved: next }));
        return;
      }
      const next = saved.includes(p) ? saved.filter((x) => x !== p) : [p, ...saved].slice(0, 12);
      putPrefs.mutate(next);
    },
    clearStyleMemory() {
      if (demo) {
        try {
          localStorage.removeItem("reelzoy.style_memory");
        } catch {
          /* non-fatal */
        }
        setLocal((s) => ({ ...s }));
      } else clearMemory.mutate();
    },
  };
}

/** Video goal: PATCH /videos/{id} in live mode, localStorage in demo mode. */
export function useVideoGoal(videoId: string) {
  const demo = isDemoMode();
  const queryClient = useQueryClient();
  const video = useQuery({ ...videoQuery(videoId), enabled: !demo });
  const [localGoal, setLocalGoal] = useState<ProjectGoalId | null>(() =>
    demo ? getProjectGoal(videoId) : null,
  );

  const patch = useMutation({
    mutationFn: (goal: ProjectGoalId | null) => api.updateVideo(videoId, { goal }),
    onMutate: (goal) => {
      queryClient.setQueryData<Video>(videoQuery(videoId).queryKey, (v) =>
        v ? { ...v, goal } : v,
      );
    },
    onSuccess: (v) => queryClient.setQueryData(videoQuery(videoId).queryKey, v),
    onError: () => void queryClient.invalidateQueries({ queryKey: videoQuery(videoId).queryKey }),
  });

  const raw = demo ? localGoal : (video.data?.goal ?? null);
  const goal = PROJECT_GOALS.some((g) => g.id === raw) ? (raw as ProjectGoalId) : null;

  return {
    goal,
    saving: patch.isPending,
    setGoal(next: ProjectGoalId | null) {
      if (demo) {
        setProjectGoal(videoId, next);
        setLocalGoal(next);
      } else patch.mutate(next);
    },
  };
}
