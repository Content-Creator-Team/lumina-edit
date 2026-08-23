import type { EditPlan, PlanPatch, RenderJob, Video } from "../api-types";
import { DEMO_USER, demoSeeds, type DemoVideoSeed } from "./fixtures";

/**
 * In-memory backend for the demo workspace. It implements exactly the routes
 * the real FastAPI service exposes — no extra endpoints are invented — so the
 * app code, query keys and typed interfaces are identical in both modes.
 *
 * State lives for the lifetime of the tab: uploads, edits, revisions,
 * approvals and renders all behave, and processing advances over time.
 */

type Store = {
  seeds: DemoVideoSeed[];
  planCounter: number;
};

let store: Store | null = null;

function db(): Store {
  if (!store) store = { seeds: demoSeeds(), planCounter: 100 };
  return store;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function seedFor(videoId: string) {
  const seed = db().seeds.find((entry) => entry.video.id === videoId);
  if (!seed) throw notFound(`Video ${videoId} was not found.`);
  return seed;
}

function seedForPlan(planId: string) {
  for (const seed of db().seeds) {
    const plan = seed.plans.find((entry) => entry.id === planId);
    if (plan) return { seed, plan };
  }
  throw notFound(`Edit plan ${planId} was not found.`);
}

export class DemoNotFound extends Error {
  status = 404;
}

function notFound(message: string) {
  return new DemoNotFound(message);
}

/* ------------------------------------------------------------- lifecycles */

const PROCESSING_MS = 24_000;

/** Advances any video that is mid-pipeline, based on real elapsed time. */
function tick(seed: DemoVideoSeed) {
  const video = seed.video;
  if (video.status !== "processing" && video.status !== "uploading") return;

  const startedAt = new Date(video.created_at ?? new Date().toISOString()).getTime();
  const elapsed = Date.now() - startedAt;
  const ratio = Math.min(1, elapsed / PROCESSING_MS);

  const order = [
    "scene_detection",
    "transcription",
    "timeline_extraction",
    "vision_tagging",
    "plan_generation",
  ] as const;
  const done = Math.floor(ratio * order.length);

  const stages: Record<string, string> = {};
  order.forEach((stage, index) => {
    stages[stage] = index < done ? "complete" : index === done ? "running" : "pending";
  });
  video.stages = stages;
  video.status = ratio >= 1 ? "plan_ready" : "processing";

  if (video.status === "plan_ready" && seed.plans.length === 0) {
    seed.plans.push(generatePlan(seed));
  }
}

function generatePlan(seed: DemoVideoSeed): EditPlan {
  const duration = seed.video.duration || 180;
  const scenes = seed.scenes.length
    ? seed.scenes
    : [
        { id: "scene-1", start: 0, end: duration * 0.35 },
        { id: "scene-2", start: duration * 0.35, end: duration * 0.72 },
        { id: "scene-3", start: duration * 0.72, end: duration },
      ];

  const segments = scenes.flatMap((scene, index) => {
    const mid = scene.start + (scene.end - scene.start) * 0.62;
    return [
      {
        id: `gen-${index}-a`,
        start: Number((scene.start + 0.5).toFixed(1)),
        end: Number(mid.toFixed(1)),
        action: "keep" as const,
        caption: scene.label ? `${scene.label} — main take` : `Shot ${index + 1} — main take`,
        text_overlay: null,
        scene_id: scene.id ?? null,
        thumbnail_url: null,
        reason: "Clear delivery, stable framing",
      },
      {
        id: `gen-${index}-b`,
        start: Number(mid.toFixed(1)),
        end: Number((scene.end - 0.4).toFixed(1)),
        action: (index % 2 === 0 ? "cut" : "keep") as "cut" | "keep",
        caption: index % 2 === 0 ? "Repeated beat — trimmed" : "Supporting detail",
        text_overlay: null,
        scene_id: scene.id ?? null,
        thumbnail_url: null,
        reason: index % 2 === 0 ? "Duplicate of the previous point" : "Adds context",
      },
    ];
  });

  return {
    id: `plan-${db().planCounter++}`,
    video_id: seed.video.id,
    version: 1,
    status: "DRAFT",
    created_at: new Date().toISOString(),
    segments,
    events: scenes.slice(1).map((scene) => ({
      time: scene.start,
      type: "scene",
      label: "Scene change",
      description: scene.label ?? "Detected shot boundary",
    })),
    source: "Automatic generation",
    parent_plan_id: null,
  };
}

function currentPlan(seed: DemoVideoSeed): EditPlan {
  const plans = [...seed.plans].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  const plan = plans[0];
  if (!plan) throw notFound("No edit plan exists for this video yet.");
  return plan;
}

function advanceRenders(seed: DemoVideoSeed) {
  for (const job of seed.renderJobs) {
    if (job.status === "complete" || job.status === "failed") continue;
    const started = new Date(job.created_at ?? new Date().toISOString()).getTime();
    const ratio = Math.min(1, (Date.now() - started) / 30_000);
    job.progress = Math.round(ratio * 100);
    job.status = ratio >= 1 ? "complete" : ratio > 0.08 ? "processing" : "queued";
    if (job.status === "complete") {
      job.completed_at = new Date().toISOString();
      seed.video.status = "complete";
    } else {
      seed.video.status = "rendering";
    }
  }
}

/* ----------------------------------------------------------------- router */

export type DemoRequest = { path: string; method: string; body?: unknown };

/** Routes a request against the demo store using the real API's paths. */
export async function demoRequest<T>({ path, method, body }: DemoRequest): Promise<T> {
  await delay(220 + Math.random() * 260);
  const state = db();
  state.seeds.forEach((seed) => {
    tick(seed);
    advanceRenders(seed);
  });

  const url = path.split("?")[0] ?? path;
  const parts = url.replace(/^\/api\/v1\//, "").split("/");
  const send = (value: unknown) => clone(value) as T;

  // /videos...
  if (parts[0] === "videos") {
    if (parts.length === 1 && method === "GET") {
      const videos = state.seeds
        .map((seed) => seed.video)
        .sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        );
      return send(videos);
    }

    if (parts[1] === "upload" && method === "POST") {
      const input = (body ?? {}) as { filename?: string; size?: number };
      const id = `vid-${Math.random().toString(36).slice(2, 8)}`;
      const video: Video = {
        id,
        filename: input.filename ?? "untitled.mp4",
        name: (input.filename ?? "Untitled clip").replace(/\.[^.]+$/, ""),
        status: "uploading",
        created_at: new Date().toISOString(),
        duration: 168,
        thumbnail_url: null,
        playback_url: null,
        stages: null,
      };
      state.seeds.unshift({ video, scenes: [], transcript: [], plans: [], renderJobs: [] });
      return send({ upload_url: `demo://storage/${id}`, video_id: id });
    }

    const videoId = parts[1] ?? "";
    const seed = seedFor(videoId);
    const tail = parts[2];

    if (!tail && method === "GET") return send(seed.video);

    if (tail === "confirm" && method === "POST") {
      seed.video.status = "processing";
      seed.video.created_at = new Date().toISOString();
      tick(seed);
      return send(seed.video);
    }
    if (tail === "scenes" && method === "GET") return send(seed.scenes);
    if (tail === "transcript" && method === "GET") return send({ segments: seed.transcript });
    if (tail === "edit-plan" && method === "GET") return send(currentPlan(seed));
    if (tail === "edit-plans" && method === "GET" && parts.length === 3) return send(seed.plans);

    // /videos/{id}/edit-plans/{planId}/revise
    if (tail === "edit-plans" && parts[4] === "revise" && method === "POST") {
      const instruction = ((body ?? {}) as { instruction?: string }).instruction ?? "";
      await delay(2_400);
      const base = currentPlan(seed);
      base.status = "SUPERSEDED";
      const revised: EditPlan = {
        ...clone(base),
        id: `plan-${state.planCounter++}`,
        version: (base.version ?? 1) + 1,
        status: "DRAFT",
        created_at: new Date().toISOString(),
        source: "Revision",
        revision_instruction: instruction,
        parent_plan_id: base.id,
        segments: clone(base.segments).map((segmentItem, index) => ({
          ...segmentItem,
          // A revision changes the shape of the cut, not just its labels.
          action: index % 3 === 1 ? "cut" : "keep",
          caption: index % 3 === 1 ? "Trimmed after your revision" : (segmentItem.caption ?? null),
        })),
      };
      seed.plans.push(revised);
      return send(revised);
    }
  }

  // /edit-plans/{id}...
  if (parts[0] === "edit-plans") {
    const planId = parts[1] ?? "";
    const { seed, plan } = seedForPlan(planId);

    if (parts.length === 2 && method === "GET") return send(plan);

    if (parts.length === 2 && method === "PATCH") {
      const patch = (body ?? { segments: [] }) as PlanPatch;
      for (const incoming of patch.segments) {
        const target = plan.segments.find((entry) => entry.id === incoming.id);
        if (!target) continue;
        Object.assign(target, incoming);
      }
      return send(plan);
    }

    if (parts[2] === "approve" && method === "POST") {
      plan.status = "APPROVED";
      const job: RenderJob = {
        id: `render-${Math.random().toString(36).slice(2, 8)}`,
        status: "queued",
        progress: 0,
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        output_url: null,
        video_id: seed.video.id,
      };
      seed.renderJobs.push(job);
      seed.video.status = "rendering";
      return send({ render_job_id: job.id, status: job.status });
    }
  }

  // /render-jobs/{id}
  if (parts[0] === "render-jobs" && method === "GET") {
    const jobId = parts[1];
    for (const seed of state.seeds) {
      const job = seed.renderJobs.find((entry) => entry.id === jobId);
      if (job) return send(job);
    }
    throw notFound(`Render job ${jobId} was not found.`);
  }

  throw notFound(`${method} ${path} is not part of the demo workspace.`);
}

export { DEMO_USER };
