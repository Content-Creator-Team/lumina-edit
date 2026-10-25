import type {
  AnalyticsSummary,
  AppNotification,
  Chapters,
  CreativePlan,
  CreativeTemplate,
  EditPlan,
  GeneratedThumbnail,
  MusicTrack,
  RenderJob,
  TemplateLibrary,
  ThumbnailConcept,
  UserPreferences,
  VideoComment,
  VideoProgress,
} from "../api-types";
import type { DemoVideoSeed } from "./fixtures";

/**
 * Demo implementations of the creative / collab endpoints. Kept separate from
 * demo-api.ts so the core router stays readable. Each handler returns
 * `undefined` when the route is not one of its own.
 */

export const DEMO_TEMPLATES: CreativeTemplate[] = [
  {
    id: "punchy_shorts",
    name: "Punchy Shorts",
    category: "creator",
    description: "Fast hook, tight cuts and bold captions for vertical feeds.",
    creative_direction: "Open on the strongest line, cut every 1–2s, end on a loopable beat.",
    platforms: ["tiktok", "youtube_shorts", "reels"],
    default_aspect: "9:16",
    aspect_ratios: ["9:16", "1:1"],
    target_duration: 30,
    duration_range: [15, 60],
    hook: "Cold-open on the boldest claim",
    ending: "Loop back to the opening frame",
    pacing: { shot_min: 0.8, shot_max: 2.5, cuts_per_minute: 36, rhythm: "staccato" },
    typography: { caption_style: "bold_pop" },
    music: {
      genres: ["electronic", "hip hop"],
      moods: ["energetic"],
      energy: "high",
      bpm_range: [110, 140],
      beat_sync: true,
    },
    intensity: 0.85,
    preview_palette: ["#ff3d7f", "#ffb800"],
  },
  {
    id: "story_vlog",
    name: "Story Vlog",
    category: "creator",
    description: "Warm, personal pacing with room for moments to breathe.",
    creative_direction: "Three-act arc with ambient b-roll between talking beats.",
    platforms: ["youtube"],
    default_aspect: "16:9",
    aspect_ratios: ["16:9"],
    target_duration: 300,
    pacing: { shot_min: 2, shot_max: 8, cuts_per_minute: 12, rhythm: "flowing" },
    music: { genres: ["acoustic", "lofi"], moods: ["warm"], energy: "medium" },
    intensity: 0.45,
    preview_palette: ["#f4a261", "#2a9d8f"],
  },
  {
    id: "beat_montage",
    name: "Beat Montage",
    category: "music",
    description: "Every cut lands on the beat. Built for b-roll and product footage.",
    platforms: ["reels", "tiktok"],
    default_aspect: "9:16",
    aspect_ratios: ["9:16", "4:5", "1:1"],
    target_duration: 20,
    pacing: { shot_min: 0.4, shot_max: 1.6, cuts_per_minute: 48, rhythm: "on-beat" },
    music: {
      genres: ["electronic"],
      moods: ["driving"],
      energy: "high",
      bpm_range: [120, 128],
      beat_sync: true,
    },
    intensity: 0.95,
    preview_palette: ["#7c3aed", "#06b6d4"],
  },
  {
    id: "clean_explainer",
    name: "Clean Explainer",
    category: "professional",
    description: "Clear, calm tutorial edit with chapter titles and lower thirds.",
    platforms: ["youtube", "linkedin"],
    default_aspect: "16:9",
    aspect_ratios: ["16:9", "1:1"],
    target_duration: 180,
    pacing: { shot_min: 3, shot_max: 12, cuts_per_minute: 8, rhythm: "steady" },
    music: { genres: ["ambient"], moods: ["calm"], energy: "low" },
    intensity: 0.3,
    preview_palette: ["#0ea5e9", "#e2e8f0"],
  },
  {
    id: "product_ad",
    name: "Product Ad",
    category: "professional",
    description: "Problem → product → proof → CTA in under 30 seconds.",
    platforms: ["instagram", "youtube"],
    default_aspect: "4:5",
    aspect_ratios: ["4:5", "9:16", "16:9"],
    target_duration: 25,
    pacing: { shot_min: 1, shot_max: 3, cuts_per_minute: 28, rhythm: "building" },
    music: { genres: ["pop"], moods: ["uplifting"], energy: "high" },
    intensity: 0.7,
    preview_palette: ["#111827", "#22c55e"],
  },
];

export const DEMO_TEMPLATE_LIBRARY: TemplateLibrary = {
  categories: { creator: "Creator", music: "Music", professional: "Professional" },
  auto: {
    id: "auto",
    name: "Auto Edit",
    description: "Let the AI read your footage and pick the best style for it.",
  },
  templates: DEMO_TEMPLATES,
};

const STAGES = [
  "upload",
  "probe",
  "transcription",
  "scene_detection",
  "analysis",
  "creative_plan",
  "thumbnails",
];

type Extra = {
  tracks: MusicTrack[];
  comments: Record<string, VideoComment[]>;
  thumbs: Record<string, GeneratedThumbnail[]>;
  prefs: UserPreferences;
  notifications: AppNotification[];
};

const extra: Extra = {
  tracks: [
    {
      id: "trk-1",
      kind: "music",
      provider: "local",
      title: "Bright Horizons",
      artist: "Demo Library",
      genre: "pop",
      moods: ["uplifting"],
      bpm: 120,
      license_name: "CC BY 4.0",
      license_url: "https://creativecommons.org/licenses/by/4.0/",
      attribution: "Bright Horizons by Demo Library, CC BY 4.0",
      commercial_use: true,
      preview_url: null,
      eligible: true,
    },
    {
      id: "trk-2",
      kind: "music",
      provider: "jamendo",
      title: "Night Drive",
      artist: "Demo Library",
      genre: "electronic",
      moods: ["driving", "energetic"],
      bpm: 124,
      license_name: "CC0",
      commercial_use: true,
      preview_url: null,
      eligible: true,
    },
    {
      id: "trk-3",
      kind: "music",
      provider: "jamendo",
      title: "Pop Anthem",
      artist: "Someone Else",
      genre: "pop",
      moods: ["energetic"],
      bpm: 128,
      license_name: "CC BY-NC",
      commercial_use: false,
      preview_url: null,
      eligible: false,
      ineligible_reason: "Non-commercial licence",
    },
  ],
  comments: {},
  thumbs: {},
  prefs: {
    data: { prompt_history: [], saved_prompts: [], default_template_id: null },
    style_memory: {},
    style_hints: [],
  },
  notifications: [
    {
      id: "n-1",
      kind: "render_complete",
      title: "Render finished",
      detail: "Your latest export is ready to download.",
      at: new Date(Date.now() - 3_600_000).toISOString(),
      unread: true,
      video_id: null,
    },
    {
      id: "n-2",
      kind: "plan_ready",
      title: "Edit plan ready",
      detail: "A new creative plan is waiting for review.",
      at: new Date(Date.now() - 86_400_000).toISOString(),
      unread: false,
      video_id: null,
    },
  ],
};

const rid = () => Math.random().toString(36).slice(2, 8);

export function demoProgress(seed: DemoVideoSeed): VideoProgress {
  const status = String(seed.video.status);
  const busy = status === "processing" || status === "uploading";
  const started = new Date(seed.video.created_at ?? Date.now()).getTime();
  const ratio = busy
    ? Math.min(0.99, (Date.now() - started) / 24_000)
    : status === "failed"
      ? 0.5
      : 1;
  const done = Math.floor(ratio * STAGES.length);
  return {
    status,
    stage: busy ? (STAGES[done] ?? null) : null,
    progress: Math.round(ratio * 100),
    error: seed.video.error ?? null,
    all_stages: STAGES,
    stages: STAGES.map((stage, index) => ({
      stage,
      status:
        index < done
          ? "done"
          : index === done && busy
            ? "running"
            : status === "failed" && index === done
              ? "failed"
              : "pending",
      started_at: index <= done ? new Date(started + index * 3_000).toISOString() : null,
      finished_at: index < done ? new Date(started + (index + 1) * 3_000).toISOString() : null,
      note: index < done ? `${stage.replace(/_/g, " ")} finished` : null,
      error: null,
    })),
  };
}

export function demoCreative(
  seed: DemoVideoSeed,
  templateId: string | null | undefined,
): CreativePlan {
  const template = DEMO_TEMPLATES.find((t) => t.id === templateId) ?? DEMO_TEMPLATES[0]!;
  const duration = seed.video.duration ?? 120;
  return {
    template_name: template.name,
    template_reason:
      templateId && templateId !== "auto"
        ? "You picked this template."
        : "High speech ratio and close framing suit a punchy, caption-led edit.",
    planner: "demo",
    llm_generated: false,
    creative_direction: template.creative_direction ?? template.description,
    adaptation_notes: [
      "Shortened the intro to keep the hook under 3s",
      "Kept dialogue intact over music peaks",
    ],
    hook: {
      strategy: "bold_claim",
      description: "Open on the strongest line of the interview",
      source_start: 30.2,
      source_end: 34.0,
      reason: "Highest energy and clearest statement in the first minute",
    },
    narrative: [
      { beat: "Hook", description: "Bold opening claim" },
      { beat: "Context", description: "Who, where and why it matters" },
      { beat: "Payoff", description: "The result and what's next" },
    ],
    pacing_notes: `About ${template.pacing?.cuts_per_minute ?? 20} cuts per minute, ${template.pacing?.rhythm ?? "steady"} rhythm.`,
    music: {
      genres: template.music?.genres ?? [],
      moods: template.music?.moods ?? [],
      energy: template.music?.energy ?? null,
      rationale: "Matches the template's energy without fighting the dialogue.",
      choice: {
        status: "selected",
        title: "Bright Horizons",
        artist: "Demo Library",
        license_name: "CC BY 4.0",
        license_url: "https://creativecommons.org/licenses/by/4.0/",
        attribution: '"Bright Horizons" by Demo Library, CC BY 4.0',
        bpm: 120,
        reason: "Best BPM and mood match among commercially usable tracks",
        ranking: [
          {
            title: "Bright Horizons",
            score: 0.91,
            reasons: ["mood match", "bpm in range"],
            eligible: true,
            license_name: "CC BY 4.0",
          },
          {
            title: "Night Drive",
            score: 0.74,
            reasons: ["genre match"],
            eligible: true,
            license_name: "CC0",
          },
          {
            title: "Pop Anthem",
            score: 0.62,
            reasons: ["energy match"],
            eligible: false,
            ineligible_reason: "Non-commercial licence",
            license_name: "CC BY-NC",
          },
        ],
      },
    },
    beat_sync: {
      strength: 0.6,
      aligned_cuts: 9,
      total_cuts: 14,
      skipped_for_speech: 3,
      notes: "Cuts inside speech were left unsnapped.",
    },
    sound_design: [
      { time: 0.2, kind: "whoosh", reason: "Hook entrance" },
      { time: Math.min(duration, 12), kind: "riser", reason: "Lead into the payoff" },
    ],
    typography: { caption_style: template.typography?.caption_style ?? "clean", events: [] },
    visual: { grade: template.grade ?? "natural", notes: "Slight warmth, lifted shadows" },
    storytelling_devices: ["callback ending"],
    ending: { strategy: "cta", description: "End on the product hero shot with a call to action" },
    thumbnail_concepts: [
      {
        id: "tc-1",
        style: "bold_creator",
        headline: "ONE BROKEN LATHE",
        frame_time: 31,
        rationale: "Curiosity gap",
      },
    ],
    output: {
      aspect: template.default_aspect ?? "16:9",
      target_duration: template.target_duration ?? 60,
    },
    validation: {
      fixed: ["Clamped one clip that ran past the source end"],
      warnings: [],
      duration: template.target_duration ?? 60,
    },
  };
}

function thumbsFor(seed: DemoVideoSeed): GeneratedThumbnail[] {
  const id = seed.video.id;
  if (!extra.thumbs[id]) {
    extra.thumbs[id] = [
      {
        id: "thumb-1",
        video_id: id,
        url: "https://placehold.co/640x360/png?text=Frame",
        variant: "ai",
        timestamp: 5,
        label: "Option @ 5.0s",
      },
      ...(["bold_creator", "clean_editorial"] as const).map((style, i) =>
        designed(
          id,
          { style, headline: i ? "The hard year" : "ONE BROKEN LATHE" },
          "youtube",
          i === 0,
        ),
      ),
    ];
  }
  return extra.thumbs[id]!;
}

const FORMAT_SIZE = { youtube: [1280, 720], vertical: [1080, 1920], square: [1080, 1080] } as const;

function designed(
  videoId: string,
  concept: ThumbnailConcept,
  format: keyof typeof FORMAT_SIZE,
  selected = false,
): GeneratedThumbnail {
  const [w, h] = FORMAT_SIZE[format];
  const bg = (concept.accent ?? "#7c3aed").replace("#", "");
  return {
    id: `dthumb-${rid()}`,
    video_id: videoId,
    url: `https://placehold.co/${Math.round(w / 2)}x${Math.round(h / 2)}/${bg}/ffffff/png?text=${encodeURIComponent(concept.headline || "Thumbnail")}`,
    variant: "designed",
    timestamp: concept.frame_time ?? 5,
    label: concept.headline,
    style: concept.style,
    headline: concept.headline,
    format,
    width: w,
    height: h,
    selected,
    meta: { position: concept.position ?? "auto", accent: concept.accent ?? null },
  };
}

function chaptersFor(plan: EditPlan): Chapters {
  const kept = plan.segments.filter((s) => s.action !== "cut");
  let t = 0;
  const chapters = kept.slice(0, 6).map((s, i) => {
    const start = t;
    t += Math.max(0, s.end - s.start);
    const m = Math.floor(start / 60);
    const sec = Math.floor(start % 60);
    return {
      start,
      timestamp: `${m}:${String(sec).padStart(2, "0")}`,
      title: (s.caption ?? `Part ${i + 1}`).replace(/[“”"]/g, "").slice(0, 48),
    };
  });
  const text = chapters.map((c) => `${c.timestamp} ${c.title}`).join("\n");
  const description = "A short edit generated in the demo workspace.";
  return {
    chapters,
    valid: chapters.length >= 3,
    problems: chapters.length >= 3 ? [] : ["YouTube needs at least three chapters."],
    description,
    description_source: "template",
    text: `${description}\n\n${text}`,
  };
}

function analytics(seeds: DemoVideoSeed[]): AnalyticsSummary {
  const by_status: Record<string, number> = {};
  seeds.forEach(
    (s) => (by_status[String(s.video.status)] = (by_status[String(s.video.status)] ?? 0) + 1),
  );
  const jobs = seeds.flatMap((s) => s.renderJobs);
  const completed = jobs.filter((j) => j.status === "complete").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  return {
    videos: {
      total: seeds.length,
      by_status,
      minutes_uploaded: Math.round(seeds.reduce((a, s) => a + (s.video.duration ?? 0), 0) / 6) / 10,
      avg_processing_seconds: 24,
      content_types: { talking_head: Math.max(1, seeds.length - 1), b_roll: 1 },
    },
    plans: {
      total: seeds.reduce((a, s) => a + s.plans.length, 0),
      revisions: seeds.reduce((a, s) => a + Math.max(0, s.plans.length - 1), 0),
      templates: { auto: 2, punchy_shorts: 1 },
    },
    renders: {
      total: jobs.length,
      completed,
      failed,
      success_rate: jobs.length ? completed / jobs.length : null,
      avg_render_seconds: 30,
      minutes_rendered: completed * 1.5,
    },
    uploads_by_day: Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (13 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        date: key,
        count: seeds.filter((x) => (x.video.created_at ?? "").slice(0, 10) === key).length,
      };
    }),
  };
}

type Ctx = {
  parts: string[];
  query: string;
  formData?: FormData | undefined;
  method: string;
  body: unknown;
  seeds: DemoVideoSeed[];
  findSeed: (videoId: string) => DemoVideoSeed;
  findPlan: (planId: string) => { seed: DemoVideoSeed; plan: EditPlan };
  currentPlan: (seed: DemoVideoSeed) => EditPlan;
  nextPlanId: () => string;
};

const NONE = Symbol("none");

/** Returns NONE when the route isn't handled here. */
export function demoCreativeRoute(ctx: Ctx): unknown {
  const { parts, method, seeds } = ctx;
  const body = (ctx.body ?? {}) as Record<string, unknown>;

  if (parts[0] === "templates" && method === "GET") return DEMO_TEMPLATE_LIBRARY;
  if (parts[0] === "music" && parts[1] === "styles") {
    return {
      styles: [
        { id: "auto", label: "Auto (match template)" },
        { id: "none", label: "No music" },
        { id: "lofi", label: "Lo-fi" },
        { id: "electronic", label: "Electronic" },
        { id: "acoustic", label: "Acoustic" },
        { id: "cinematic", label: "Cinematic" },
      ],
      providers: {
        local_library: true,
        jamendo: false,
        freesound: false,
        generated_fallback: true,
      },
    };
  }
  if (parts[0] === "music" && parts[1] === "tracks") {
    if (method === "POST") {
      const form = ctx.formData;
      const get = (k: string) => {
        const v = form?.get(k);
        return typeof v === "string" && v ? v : undefined;
      };
      const file = form?.get("file");
      const track: MusicTrack = {
        id: `trk-${rid()}`,
        kind: "music",
        provider: "user",
        title: get("title") ?? "Uploaded track",
        artist: get("artist") ?? null,
        genre: get("genre") ?? null,
        moods: (get("moods") ?? "")
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
        bpm: get("bpm") ? Number(get("bpm")) : null,
        license_name: get("license_name") ?? "Owned",
        license_url: get("license_url") ?? null,
        attribution: get("attribution") ?? null,
        commercial_use: get("commercial_use") === "true",
        preview_url: file instanceof Blob ? URL.createObjectURL(file) : null,
        eligible: true,
      };
      extra.tracks.unshift(track);
      return track;
    }
    if (method === "DELETE" && parts[2]) {
      extra.tracks = extra.tracks.filter((t) => t.id !== parts[2] || t.provider !== "user");
      return undefined;
    }
    const q = new URLSearchParams(ctx.query);
    const genre = q.get("genre")?.toLowerCase();
    const mood = q.get("mood")?.toLowerCase();
    return extra.tracks.filter(
      (t) =>
        (!genre || (t.genre ?? "").toLowerCase().includes(genre)) &&
        (!mood || (t.moods ?? []).some((m) => m.toLowerCase() === mood)),
    );
  }

  if (parts[0] === "videos" && (parts[1] === "combine" || parts[1] === "upload-batch") && method === "POST") {
    const names =
      parts[1] === "combine"
        ? ((body["video_ids"] as string[]) ?? []).map((id) => {
            const s = seeds.find((x) => x.video.id === id);
            return s ? (s.video.name ?? s.video.filename ?? id) : id;
          })
        : ((body["filenames"] as string[]) ?? []);
    if (names.length < 2) throw new Error("Choose at least two clips to combine.");
    const durations =
      parts[1] === "combine"
        ? ((body["video_ids"] as string[]) ?? []).map((id) => seeds.find((x) => x.video.id === id)?.video.duration ?? 60)
        : names.map(() => 45);
    let t = 0;
    const combined_parts = names.map((name, index) => {
      const start = t;
      t += durations[index] ?? 45;
      return { index, name: String(name), start, end: t };
    });
    const id = `vid-${rid()}`;
    const options = (body["options"] as Record<string, unknown> | undefined) ?? {};
    seeds.unshift({
      video: {
        id,
        name: (body["title"] as string) || `Combined edit (${names.length} clips)`,
        filename: "combined.mp4",
        status: "processing",
        created_at: new Date().toISOString(),
        duration: t,
        goal: (body["goal"] as string) ?? null,
        template_id: (body["template_id"] as string) ?? "auto",
        edit_options: { ...options, combined_from: names.map(String), combined_parts },
        thumbnail_url: null,
        playback_url: null,
        stages: null,
      },
      scenes: [],
      transcript: [],
      plans: [],
      renderJobs: [],
    });
    return { video_id: id, status: "processing", message: `Combining ${names.length} clips` };
  }

  if (parts[0] === "videos" && parts[1] && parts[1] !== "upload") {
    const seed = ctx.findSeed(parts[1]);
    const tail = parts[2];
    if (!tail && method === "PATCH") {
      Object.assign(seed.video, body);
      if (typeof body["title"] === "string") seed.video.name = body["title"] as string;
      return seed.video;
    }
    if (!tail && method === "DELETE") {
      seeds.splice(seeds.indexOf(seed), 1);
      return undefined;
    }
    if (tail === "reprocess" && method === "POST") {
      Object.assign(seed.video, {
        template_id: body["template_id"] ?? seed.video.template_id,
        edit_options: body["edit_options"] ?? seed.video.edit_options,
        goal: body["goal"] ?? seed.video.goal,
        status: "processing",
        created_at: new Date().toISOString(),
      });
      seed.plans = [];
      return seed.video;
    }
    if (tail === "progress" && method === "GET") return demoProgress(seed);
    if (tail === "analysis" && method === "GET") {
      const shots = (
        seed.scenes.length ? seed.scenes : [{ id: "s1", start: 0, end: seed.video.duration ?? 60 }]
      ).map((sc, i) => ({
        id: String(sc.id ?? `shot${i}`),
        index: i + 1,
        start: sc.start,
        end: sc.end,
        duration: sc.end - sc.start,
        motion: [0.2, 0.55, 0.35, 0.7, 0.15][i % 5]!,
        quality: [0.8, 0.65, 0.9, 0.4, 0.75][i % 5]!,
        faces: i % 2 ? 0.6 : null,
        speech_coverage: i % 2 ? 0.85 : 0.1,
        flags: i === 3 ? ["shaky"] : [],
        role_hint: i === 0 ? "establishing" : i % 2 ? "dialogue" : "support",
        description: ("label" in sc ? sc.label : null) ?? "",
      }));
      return {
        shots,
        hook_candidates: [
          {
            start: 30.2,
            end: 34,
            score: 0.82,
            kind: "statement",
            text: "We started in a garage with one broken lathe.",
          },
          { start: 4, end: 7.5, score: 0.64, kind: "action", text: "" },
        ],
        speech_ratio: 0.71,
        motion_mean: 0.32,
        face_ratio: 0.48,
        energy_mean: 0.4,
        content_type: "talking_head",
        mood: "warm",
      };
    }
    if (tail === "creative-plan" && method === "POST") {
      const base = ctx.currentPlan(seed);
      base.status = "SUPERSEDED";
      const templateId = (body["template_id"] as string | undefined) ?? "auto";
      const plan: EditPlan = {
        ...JSON.parse(JSON.stringify(base)),
        id: ctx.nextPlanId(),
        version: Math.max(...seed.plans.map((p) => p.version ?? 1)) + 1,
        status: "DRAFT",
        created_at: new Date().toISOString(),
        source: "Creative plan",
        parent_plan_id: base.id,
        template_id: templateId,
        creative: demoCreative(seed, templateId),
        ai_decisions: {},
      };
      seed.plans.push(plan);
      return plan;
    }
    if (tail === "thumbnails" && method === "GET" && parts.length === 3) return thumbsFor(seed);
    if (tail === "thumbnails" && parts[3] === "design" && method === "POST") {
      const list = thumbsFor(seed);
      const format = ((body["format"] as string) ?? "youtube") as keyof typeof FORMAT_SIZE;
      const from = list.find((t) => t.id === body["from_thumbnail_id"]);
      const concepts = (body["concepts"] as ThumbnailConcept[] | undefined)?.length
        ? (body["concepts"] as ThumbnailConcept[])
        : from
          ? [
              {
                style: from.style ?? "bold_creator",
                headline: from.headline ?? "New take",
                accent: (from.meta?.["accent"] as string) ?? null,
              },
            ]
          : [
              { style: "bold_creator", headline: "YOU WON'T BELIEVE THIS" },
              { style: "clean_editorial", headline: "The full story" },
              { style: "cinematic", headline: "Made by hand" },
            ];
      const made = concepts.map((c) =>
        designed(seed.video.id, c, FORMAT_SIZE[format] ? format : "youtube"),
      );
      list.push(...made);
      return made;
    }
    if (tail === "thumbnails" && parts[4] === "select" && method === "POST") {
      const list = thumbsFor(seed);
      list.forEach((t) => (t.selected = t.id === parts[3]));
      return list;
    }
    if (tail === "highlights" && method === "POST") {
      const total = seed.video.duration ?? 120;
      const count = Number(body["count"] ?? 4);
      const len = Number(body["clip_seconds"] ?? 30);
      return {
        highlights: Array.from({ length: Math.min(count, 6) }, (_, i) => {
          const start = Math.min(Math.max(0, total - len), (total / (count + 1)) * i + 2);
          return {
            title: [
              "The bold opening",
              "Behind the scenes",
              "The turning point",
              "What's next",
              "Quick win",
              "Closing line",
            ][i]!,
            start: Number(start.toFixed(1)),
            end: Number(Math.min(total, start + len).toFixed(1)),
            reason:
              i === 0
                ? "Strongest hook in the first minute"
                : "Self-contained moment with a clear payoff",
            score: Math.round(92 - i * 7) / 100,
            caption: "A moment worth sharing.",
            kind: i === 0 ? "hook" : "moment",
          };
        }),
      };
    }
    if (tail === "trim" && method === "POST") {
      const segs =
        (body["segments"] as Array<{ start: number; end: number; label?: string }>) ?? [];
      const plan: EditPlan = {
        id: ctx.nextPlanId(),
        video_id: seed.video.id,
        version: (seed.plans.length ? Math.max(...seed.plans.map((p) => p.version ?? 1)) : 0) + 1,
        status: "APPROVED",
        created_at: new Date().toISOString(),
        source: "Trim",
        segments: segs.map((s, i) => ({
          id: `trim-${i}`,
          start: s.start,
          end: s.end,
          action: "keep",
          caption: s.label ?? null,
        })),
      };
      seed.plans.push(plan);
      let job: RenderJob | null = null;
      if (body["render"] !== false) {
        job = {
          id: `render-${rid()}`,
          status: "queued",
          progress: 0,
          created_at: new Date().toISOString(),
          video_id: seed.video.id,
          edit_plan_id: plan.id,
          stage: "queued",
        };
        seed.renderJobs.push(job);
      }
      return { plan_id: plan.id, render_job: job };
    }
    if (tail === "comments") {
      const list = (extra.comments[seed.video.id] ??= []);
      if (method === "GET") return list;
      if (method === "POST") {
        const c: VideoComment = {
          id: `c-${rid()}`,
          time: Number(body["time"] ?? 0),
          text: String(body["text"] ?? ""),
          author: "You",
          applied: false,
          applied_plan_id: null,
          created_at: new Date().toISOString(),
        };
        list.push(c);
        list.sort((a, b) => a.time - b.time);
        return c;
      }
    }
  }

  if (parts[0] === "comments" && parts[1]) {
    for (const [videoId, list] of Object.entries(extra.comments)) {
      const c = list.find((x) => x.id === parts[1]);
      if (!c) continue;
      if (method === "PATCH") return Object.assign(c, body);
      if (method === "DELETE") {
        list.splice(list.indexOf(c), 1);
        return undefined;
      }
      if (parts[2] === "apply" && method === "POST") {
        const seed = ctx.findSeed(videoId);
        const base = ctx.currentPlan(seed);
        base.status = "SUPERSEDED";
        const plan: EditPlan = {
          ...JSON.parse(JSON.stringify(base)),
          id: ctx.nextPlanId(),
          version: (base.version ?? 1) + 1,
          status: "DRAFT",
          created_at: new Date().toISOString(),
          source: "Review comment",
          revision_instruction: c.text,
          parent_plan_id: base.id,
        };
        seed.plans.push(plan);
        c.applied = true;
        c.applied_plan_id = plan.id;
        return plan;
      }
    }
  }

  if (parts[0] === "edit-plans" && parts[1]) {
    if (parts[2] === "decisions" && method === "PUT") {
      const { plan } = ctx.findPlan(parts[1]);
      const next = { ...(plan.ai_decisions ?? {}) };
      Object.entries((body["decisions"] ?? {}) as Record<string, string | null>).forEach(
        ([k, v]) => {
          if (v === "accepted" || v === "rejected") next[k] = v;
          else delete next[k];
        },
      );
      plan.ai_decisions = next;
      return plan;
    }
    if (parts[2] === "chapters" && method === "GET")
      return chaptersFor(ctx.findPlan(parts[1]).plan);
  }

  if (
    parts[0] === "render-jobs" &&
    parts[1] &&
    (parts[2] === "cancel" || parts[2] === "retry") &&
    method === "POST"
  ) {
    for (const seed of seeds) {
      const job = seed.renderJobs.find((j) => j.id === parts[1]);
      if (!job) continue;
      if (parts[2] === "cancel") {
        job.cancel_requested = true;
        job.status = "cancelled";
        job.stage = "cancelled";
        seed.video.status = "plan_ready";
        return job;
      }
      const retry: RenderJob = {
        ...job,
        id: `render-${rid()}`,
        status: "queued",
        progress: 0,
        stage: "queued",
        cancel_requested: false,
        error: null,
        created_at: new Date().toISOString(),
      };
      seed.renderJobs.push(retry);
      return retry;
    }
  }

  if (parts[0] === "me") {
    if (parts[1] === "preferences") {
      if (method === "PUT") extra.prefs.data = { ...extra.prefs.data, ...body };
      return extra.prefs;
    }
    if (parts[1] === "prompts" && method === "POST") {
      const p = String(body["prompt"] ?? "").trim();
      const hist = (extra.prefs.data.prompt_history ?? []).filter((x) => x !== p);
      if (p) extra.prefs.data.prompt_history = [p, ...hist].slice(0, 20);
      const words = (extra.prefs.data.prompt_history ?? []).join(" ").toLowerCase();
      extra.prefs.style_hints = [
        ...(/caption/.test(words) ? ["You often ask for captions"] : []),
        ...(/short|tight|faster|pace/.test(words) ? ["You prefer tight pacing"] : []),
      ];
      return extra.prefs;
    }
    if (parts[1] === "style-memory" && method === "DELETE") {
      extra.prefs.style_memory = {};
      extra.prefs.style_hints = [];
      return extra.prefs;
    }
    if (parts[1] === "usage") {
      return {
        uploads: seeds.length,
        upload_minutes: Math.round(seeds.reduce((a, s) => a + (s.video.duration ?? 0), 0) / 60),
        renders: seeds.reduce((a, s) => a + s.renderJobs.length, 0),
        render_minutes: 4,
        revisions_today: 2,
        limits: { upload_minutes: 120, renders: 50, revisions_per_day: 30 },
      };
    }
    if (parts[1] === "notifications") {
      if (parts[2] === "seen" && method === "POST")
        extra.notifications.forEach((n) => (n.unread = false));
      return {
        items: extra.notifications,
        unread: extra.notifications.filter((n) => n.unread).length,
      };
    }
  }

  if (parts[0] === "feedback" && method === "POST") return { ok: true };
  if (parts[0] === "analytics" && parts[1] === "summary") return analytics(seeds);

  return NONE;
}

export function isUnhandled(value: unknown) {
  return value === NONE;
}
