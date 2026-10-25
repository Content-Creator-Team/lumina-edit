/**
 * Local, per-browser helpers for the editor: prompt history, style memory and
 * project goals. In live mode these live on the backend (/me/preferences,
 * PATCH /videos/{id}); this localStorage version is the demo-mode fallback.
 */

const PROMPT_HISTORY_KEY = "reelzoy.prompt_history";
const SAVED_PROMPTS_KEY = "reelzoy.saved_prompts";
const STYLE_MEMORY_KEY = "reelzoy.style_memory";
const GOAL_KEY_PREFIX = "reelzoy.goal.";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private browsing etc. — non-fatal */
  }
}

// ---------- Prompt history ----------

export function getPromptHistory(): string[] {
  return readJson<string[]>(PROMPT_HISTORY_KEY, []);
}

export function recordPrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) return;
  const history = [trimmed, ...getPromptHistory().filter((p) => p !== trimmed)].slice(0, 20);
  writeJson(PROMPT_HISTORY_KEY, history);
}

export function getSavedPrompts(): string[] {
  return readJson<string[]>(SAVED_PROMPTS_KEY, []);
}

export function toggleSavedPrompt(prompt: string): string[] {
  const trimmed = prompt.trim();
  const saved = getSavedPrompts();
  const next = saved.includes(trimmed)
    ? saved.filter((p) => p !== trimmed)
    : [trimmed, ...saved].slice(0, 12);
  writeJson(SAVED_PROMPTS_KEY, next);
  return next;
}

// ---------- Style memory ----------
// Counts how often the user rejects AI edits whose reason contains a keyword.
// Surfaced as "You often reject …" hints. Local only — no backend endpoint.

export function getStyleMemory(): Record<string, number> {
  return readJson<Record<string, number>>(STYLE_MEMORY_KEY, {});
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "and", "or", "for", "on", "in", "with", "this",
  "that", "it", "is", "was", "are", "be", "s", "re",
]);

export function recordRejection(reason: string | null | undefined) {
  if (!reason) return;
  const memory = getStyleMemory();
  for (const word of reason.toLowerCase().split(/[^a-z]+/)) {
    if (word.length < 4 || STOPWORDS.has(word)) continue;
    memory[word] = (memory[word] ?? 0) + 1;
  }
  writeJson(STYLE_MEMORY_KEY, memory);
}

/** Top rejected keywords, e.g. ["zoom", "silence"]. Empty until 2+ rejections. */
export function styleMemoryHints(): string[] {
  return Object.entries(getStyleMemory())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => `${word} (rejected ${count}×)`);
}

// ---------- Project goals ----------

export const PROJECT_GOALS = [
  { id: "tutorial", label: "Tutorial", hint: "Clear steps, steady pace, captions on" },
  { id: "ad", label: "Ad / promo", hint: "Fast hook, punchy cuts, strong CTA" },
  { id: "podcast", label: "Podcast clip", hint: "Keep the best exchange, trim filler" },
  { id: "vlog", label: "Vlog", hint: "Natural flow, keep personality" },
  { id: "short", label: "Short / Reel", hint: "Under 60s, vertical, hook in 2s" },
] as const;

export type ProjectGoalId = (typeof PROJECT_GOALS)[number]["id"];

export function getProjectGoal(videoId: string): ProjectGoalId | null {
  const v = readJson<string | null>(GOAL_KEY_PREFIX + videoId, null);
  return PROJECT_GOALS.some((g) => g.id === v) ? (v as ProjectGoalId) : null;
}

export function setProjectGoal(videoId: string, goal: ProjectGoalId | null) {
  writeJson(GOAL_KEY_PREFIX + videoId, goal);
}

export function goalLabel(goal: ProjectGoalId | null): string | null {
  return PROJECT_GOALS.find((g) => g.id === goal)?.label ?? null;
}
