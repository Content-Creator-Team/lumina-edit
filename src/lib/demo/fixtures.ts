import type {
  EditPlan,
  PlanEvent,
  PlanSegment,
  RenderJob,
  Scene,
  TranscriptSegment,
  Video,
} from "../api-types";

/**
 * Cohesive fixture data for the demo workspace: one production company
 * editing three real-feeling projects. Nothing here is sent anywhere.
 */

const HOUR = 60 * 60 * 1000;

export const demoNow = Date.now();

export function isoAgo(ms: number) {
  return new Date(demoNow - ms).toISOString();
}

function scenesFor(bounds: Array<[number, number, string]>): Scene[] {
  return bounds.map(([start, end, label], index) => ({
    id: `scene-${index + 1}`,
    index,
    start,
    end,
    label,
  }));
}

function segment(
  id: string,
  start: number,
  end: number,
  action: "keep" | "cut",
  caption: string,
  overlay?: string,
  sceneId?: string,
): PlanSegment {
  return {
    id,
    start,
    end,
    action,
    caption,
    text_overlay: overlay ?? null,
    scene_id: sceneId ?? null,
    thumbnail_url: null,
    reason: action === "cut" ? "Low energy / repeated point" : "Strongest delivery of this beat",
  };
}

export type DemoVideoSeed = {
  video: Video;
  scenes: Scene[];
  transcript: TranscriptSegment[];
  plans: EditPlan[];
  renderJobs: RenderJob[];
};

/* ------------------------------------------------------------ project one */

const founderScenes = scenesFor([
  [0, 28, "Cold open — workshop b-roll"],
  [28, 96, "Interview: origin story"],
  [96, 168, "Interview: the hard year"],
  [168, 232, "Product close-ups"],
  [232, 296, "Interview: what's next"],
]);

const founderSegments: PlanSegment[] = [
  segment("seg-1", 2.4, 11.8, "keep", "Sparks and lathe close-up over ambient sound", "SOMERSET, UK", "scene-1"),
  segment("seg-2", 11.8, 27.5, "cut", "Second b-roll pass repeats the first", undefined, "scene-1"),
  segment("seg-3", 30.2, 62.0, "keep", "“We started in a garage with one broken lathe.”", undefined, "scene-2"),
  segment("seg-4", 62.0, 95.4, "cut", "Tangent about the old supplier contract", undefined, "scene-2"),
  segment("seg-5", 99.5, 141.2, "keep", "The hard year — strongest emotional beat", "2021", "scene-3"),
  segment("seg-6", 141.2, 167.0, "cut", "Restates the previous point", undefined, "scene-3"),
  segment("seg-7", 170.0, 199.6, "keep", "Product macro shots, no dialogue", undefined, "scene-4"),
  segment("seg-8", 236.0, 288.0, "keep", "Closing thought and call to action", "MADE TO LAST", "scene-5"),
];

const founderEvents: PlanEvent[] = [
  { time: 11.8, type: "scene", label: "Scene change", description: "Cut from b-roll to interview" },
  { time: 54.0, type: "laughter", label: "Laughter", description: "Natural laugh — good breathing point" },
  { time: 118.5, type: "emphasis", label: "Emphasis", description: "Volume and pace peak" },
  { time: 168.0, type: "silence", label: "Long pause", description: "3.1s of silence" },
  { time: 236.0, type: "music", label: "Music cue", description: "Score enters under the close" },
];

const founderTranscript: TranscriptSegment[] = [
  [30.2, 36.4, "We started in a garage with one broken lathe and a lot of optimism."],
  [36.4, 43.1, "The first six months, honestly, we made nothing anybody wanted to buy."],
  [43.1, 51.8, "But we kept turning up. Every morning, same bench, same bad coffee."],
  [51.8, 58.6, "And then one customer came back — and she brought her father with her."],
  [58.6, 66.9, "That was the moment it stopped being a hobby."],
  [99.5, 108.2, "2021 nearly finished us. Our supplier folded three weeks before Christmas."],
  [108.2, 118.4, "We had four hundred orders and no steel."],
  [118.4, 129.0, "So we drove to Sheffield, and we bought it ourselves, out of the back of a van."],
  [129.0, 141.2, "Every single order shipped. Late, but it shipped."],
  [236.0, 246.5, "What's next is the part I'm actually excited about."],
  [246.5, 259.8, "We're teaching it. Ten apprentices a year, paid, from around here."],
  [259.8, 271.2, "Because the skill doesn't survive if it only lives in one workshop."],
  [271.2, 288.0, "That's the whole thing, really. Make it well, then pass it on."],
].map(([start, end, text], index) => ({
  id: `t-${index}`,
  start: start as number,
  end: end as number,
  text: text as string,
  speaker: "Marguerite Ellis",
}));

const founderPlanV1: EditPlan = {
  id: "plan-founder-1",
  video_id: "vid-founder",
  version: 1,
  status: "SUPERSEDED",
  created_at: isoAgo(20 * HOUR),
  segments: founderSegments.map((s) => ({ ...s })),
  events: founderEvents,
  source: "Automatic generation",
  parent_plan_id: null,
};

const founderPlanV2: EditPlan = {
  id: "plan-founder-2",
  video_id: "vid-founder",
  version: 2,
  status: "DRAFT",
  created_at: isoAgo(3 * HOUR),
  segments: founderSegments.map((s) =>
    s.id === "seg-7" ? { ...s, action: "cut", caption: "Product macro shots — trimmed for pace" } : { ...s },
  ),
  events: founderEvents,
  source: "Revision",
  revision_instruction: "Tighten the middle and lose the product montage — keep the emotional beats.",
  parent_plan_id: "plan-founder-1",
};

/* ------------------------------------------------------------ project two */

const launchScenes = scenesFor([
  [0, 18, "Title card"],
  [18, 74, "Demo walkthrough"],
  [74, 132, "Customer quote"],
  [132, 176, "Outro"],
]);

const launchSegments: PlanSegment[] = [
  segment("l-1", 0.8, 16.4, "keep", "Title card and logo sting", "ATLAS 2.0", "scene-1"),
  segment("l-2", 20.0, 58.2, "keep", "Walkthrough of the new planner view", undefined, "scene-2"),
  segment("l-3", 58.2, 73.0, "cut", "Repeated menu navigation", undefined, "scene-2"),
  segment("l-4", 78.5, 120.4, "keep", "Customer quote — best take", "NORDLYS STUDIO", "scene-3"),
  segment("l-5", 136.0, 170.0, "keep", "Outro with availability date", undefined, "scene-4"),
];

const launchTranscript: TranscriptSegment[] = [
  [20.0, 29.4, "This is the planner, and it's the part the whole release is built around."],
  [29.4, 41.2, "Everything you drag here writes straight back to the shared timeline."],
  [41.2, 58.2, "No exports, no version numbers in file names, no Friday afternoon panic."],
  [78.5, 91.0, "We cut our review cycle from nine days to two."],
  [91.0, 104.6, "That's not a productivity stat to us — that's two more projects a quarter."],
  [104.6, 120.4, "And the team stopped dreading handover day, which I didn't expect."],
  [136.0, 152.0, "Atlas 2.0 is available from the fourteenth."],
  [152.0, 170.0, "Existing workspaces upgrade automatically, no migration needed."],
].map(([start, end, text], index) => ({
  id: `lt-${index}`,
  start: start as number,
  end: end as number,
  text: text as string,
  speaker: index < 3 ? "Narrator" : "Ingrid Sund",
}));

const launchPlan: EditPlan = {
  id: "plan-launch-1",
  video_id: "vid-launch",
  version: 1,
  status: "APPROVED",
  created_at: isoAgo(30 * HOUR),
  segments: launchSegments,
  events: [
    { time: 18.0, type: "scene", label: "Scene change", description: "Title card ends" },
    { time: 58.2, type: "repetition", label: "Repetition", description: "Menu shown twice" },
    { time: 78.5, type: "speaker", label: "Speaker change", description: "Customer interview begins" },
  ],
  source: "Automatic generation",
  parent_plan_id: null,
};

const launchRender: RenderJob = {
  id: "render-launch-1",
  status: "complete",
  progress: 100,
  created_at: isoAgo(26 * HOUR),
  started_at: isoAgo(26 * HOUR),
  completed_at: isoAgo(25 * HOUR),
  output_url: null,
  video_id: "vid-launch",
};

/* ---------------------------------------------------------- project three */

const fieldScenes = scenesFor([
  [0, 44, "Drone establishing"],
  [44, 130, "Ranger interview"],
  [130, 190, "Trail walk"],
]);

/* -------------------------------------------------------------- the seeds */

export function demoSeeds(): DemoVideoSeed[] {
  return [
    {
      video: {
        id: "vid-founder",
        filename: "ellis-workshop-founder-cut.mov",
        name: "Ellis & Co — founder story",
        status: "plan_ready",
        created_at: isoAgo(22 * HOUR),
        duration: 296,
        thumbnail_url: null,
        playback_url: null,
        stages: {
          scene_detection: "complete",
          transcription: "complete",
          timeline_extraction: "complete",
          vision_tagging: "complete",
          plan_generation: "complete",
        },
      },
      scenes: founderScenes,
      transcript: founderTranscript,
      plans: [founderPlanV1, founderPlanV2],
      renderJobs: [],
    },
    {
      video: {
        id: "vid-launch",
        filename: "atlas-2-launch-master.mp4",
        name: "Atlas 2.0 — launch film",
        status: "complete",
        created_at: isoAgo(32 * HOUR),
        duration: 176,
        thumbnail_url: null,
        playback_url: null,
        stages: {
          scene_detection: "complete",
          transcription: "complete",
          timeline_extraction: "complete",
          vision_tagging: "complete",
          plan_generation: "complete",
        },
      },
      scenes: launchScenes,
      transcript: launchTranscript,
      plans: [launchPlan],
      renderJobs: [launchRender],
    },
    {
      video: {
        id: "vid-field",
        filename: "northwood-rangers-raw.mkv",
        name: "Northwood Rangers — field notes",
        status: "processing",
        created_at: isoAgo(0.05 * HOUR),
        duration: 190,
        thumbnail_url: null,
        playback_url: null,
        stages: {
          scene_detection: "complete",
          transcription: "running",
          timeline_extraction: "pending",
          vision_tagging: "pending",
          plan_generation: "pending",
        },
      },
      scenes: fieldScenes,
      transcript: [],
      plans: [],
      renderJobs: [],
    },
    {
      video: {
        id: "vid-gala",
        filename: "harbour-gala-multicam.mp4",
        name: "Harbour gala — multicam",
        status: "failed",
        created_at: isoAgo(50 * HOUR),
        duration: 0,
        thumbnail_url: null,
        playback_url: null,
        error: "Audio track 2 was corrupt from 00:14:22 onward. Re-export and upload again.",
        stages: null,
      },
      scenes: [],
      transcript: [],
      plans: [],
      renderJobs: [],
    },
  ];
}

export const DEMO_USER = {
  sub: "demo-user",
  name: "Alex Rowan",
  email: "alex@demo.cutroom.app",
  org: "Demo workspace",
  roles: ["editor", "admin"],
};
