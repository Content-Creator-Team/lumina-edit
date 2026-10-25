/**
 * Typed contracts for the FastAPI backend.
 */

export type VideoStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed"
  | "uploading"
  | "plan_ready"
  | "approved"
  | "rendering"
  | "complete";

export const TERMINAL_VIDEO_STATUSES: VideoStatus[] = ["ready", "failed", "complete"];

export type Video = {
  id: string;
  filename?: string | null;
  name?: string | null;
  title?: string | null;
  status: VideoStatus | string;
  created_at?: string | null;
  uploaded_at?: string | null;
  duration?: number | null;
  error?: string | null;
  thumbnail_url?: string | null;
  playback_url?: string | null;
  progress?: number | null;
  stages?: Record<string, string> | null;
} & VideoExtras;

export type UploadTicket = {
  upload_url: string;
  video_id: string;
};

export type Scene = {
  id?: string;
  index?: number;
  scene_number?: number;
  start: number;
  end: number;
  start_time?: number;
  end_time?: number;
  label?: string | null;
  thumbnail_url?: string | null;
};

export type TranscriptWord = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptSegment = {
  id?: string;
  start: number;
  end: number;
  start_time?: number;
  end_time?: number;
  text: string;
  speaker?: string | null;
  words?: TranscriptWord[] | null;
};

export type Transcript = {
  segments?: TranscriptSegment[] | null;
  language?: string | null;
  text?: string | null;
};

export type PlanSegmentAction = "keep" | "cut";

export type PlanSegment = {
  id: string;
  start: number;
  end: number;
  start_ts?: number | null;
  end_ts?: number | null;
  action: PlanSegmentAction | string;
  scene_id?: string | null;
  caption?: string | null;
  text_overlay?: string | null;
  thumbnail_url?: string | null;
  reason?: string | null;
  /** Model confidence 0–1, when the backend reports it. */
  confidence?: number | null;
  category?: string | null;
  order?: number | null;
  brightness?: number | null;
  contrast?: number | null;
  saturation?: number | null;
  fade_in?: number | null;
  fade_out?: number | null;
  effect?: string | null;
};

export type PlanEvent = {
  time: number;
  type?: string | null;
  label?: string | null;
  description?: string | null;
};

export type PlanStatus =
  | "draft" | "DRAFT"
  | "approved" | "APPROVED"
  | "rendering" | "RENDERING"
  | "complete" | "COMPLETE"
  | "failed" | "FAILED"
  | string;

export type EditPlan = {
  id: string;
  video_id?: string;
  version?: number | null;
  status: PlanStatus;
  created_at?: string | null;
  segments: PlanSegment[];
  events?: PlanEvent[] | null;
  source?: string | null;
  revision_instruction?: string | null;
  parent_plan_id?: string | null;
  parent_version_id?: string | null;
} & EditPlanExtras;

export type RenderJob = {
  id: string;
  status: "pending" | "queued" | "processing" | "complete" | "failed" | string;
  progress?: number | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  output_url?: string | null;
  error?: string | null;
  error_message?: string | null;
  video_id?: string | null;
  edit_plan_id?: string | null;
  preset_id?: string | null;
  aspect_ratio?: string | null;
  stage?: string | null;
  cancel_requested?: boolean;
  report?: RenderReport | null;
};

export type ApproveResponse = {
  render_job_id?: string | null;
  job_id?: string | null;
  id?: string | null;
  status?: string | null;
};

export type ExportOptions = {
  preset_id?: string;
  aspect_ratio?: string | null;
  burn_captions?: boolean;
  brand_kit_id?: string | null;
  prefer_faces?: boolean;
  resolution?: string | null;
};

export type PlanSegmentCreate = {
  scene_id: string;
  action?: PlanSegmentAction;
  start_ts: number;
  end_ts: number;
  caption?: string | null;
  text_overlay?: string | null;
  order?: number;
  brightness?: number | null;
  contrast?: number | null;
  saturation?: number | null;
  fade_in?: number | null;
  fade_out?: number | null;
  effect?: string | null;
};

export type PlanPatch = {
  segments?: Array<{
    id: string;
    start_ts?: number;
    end_ts?: number;
    action?: PlanSegmentAction;
    caption?: string | null;
    text_overlay?: string | null;
    order?: number;
    brightness?: number | null;
    contrast?: number | null;
    saturation?: number | null;
    fade_in?: number | null;
    fade_out?: number | null;
    effect?: string | null;
  }>;
  create?: PlanSegmentCreate[];
  delete_ids?: string[];
};

export type ExportPreset = {
  id: string;
  label: string;
  platform: string;
  aspect_ratio: string;
  width: number;
  height: number;
  max_duration_s: number | null;
  fps: number;
  video_bitrate: string;
  audio_bitrate: string;
  caption_safe_margin: number;
  description: string;
};

export type BrandKit = {
  id: string;
  name: string;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  font_family?: string | null;
  logo_url?: string | null;
  watermark_url?: string | null;
  caption_preset?: string | null;
  is_default?: boolean;
  extras?: Record<string, unknown> | null;
  created_at?: string;
};

export type BrandKitCreate = {
  name: string;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  font_family?: string | null;
  caption_preset?: string | null;
  is_default?: boolean;
  extras?: Record<string, unknown> | null;
};

export type GeneratedThumbnail = {
  id: string;
  video_id: string;
  url: string;
  variant: string;
  timestamp?: number | null;
  label?: string | null;
  style?: string | null;
  headline?: string | null;
  format?: string | null;
  width?: number | null;
  height?: number | null;
  selected?: boolean;
  meta?: Record<string, unknown> | null;
};

export type SmartClip = {
  start: number;
  end: number;
  score: number;
  hook: string;
  reason: string;
  tags: string[];
  /** Predicted share of viewers who stay to the end, 0–100, when reported. */
  retention?: number | null;
};

export type SmartClipsResponse = {
  video_id: string;
  total_analyzed: number;
  clips: SmartClip[];
};

export type EngagementSignal = {
  name: string;
  score: number;
  weight?: number;
  explanation: string;
};

export type EngagementResponse = {
  video_id: string;
  total_score: number;
  grade: string;
  signals: EngagementSignal[];
  suggestions: string[];
  strong_hooks?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
};

export type SilenceRange = {
  start: number;
  end: number;
  duration: number;
  severity?: string;
};

export type FillerWord = {
  start: number;
  end: number;
  text: string;
  word?: string;
  segment_id?: string;
  duration?: number;
};

export type SilenceDetection = {
  video_id: string;
  silences: SilenceRange[];
  fillers: FillerWord[];
  total_silence_s: number;
  total_filler_s: number;
  saveable_s: number;
  wpm_before: number;
  wpm_after: number;
};

export type AgentCutOperation = {
  type: string;
  start_time: number;
  end_time: number;
  reason: string;
};

export type AgentEditResponse = {
  video_id: string;
  edit_plan: {
    video_id: string;
    instruction: string;
    operations: AgentCutOperation[];
    summary: string;
    estimated_duration_seconds?: number | null;
  };
  llm_available: boolean;
};

export type TranslateJob = {
  job_id: string;
  video_id: string;
  status: string;
  target_language: string;
  message: string;
  preview_segments: Array<{
    start?: number;
    end?: number;
    source_text?: string;
    translated_text?: string;
    status?: string;
  }>;
};

/* ------------------------------------------------------------ creative API */

export type VideoGoal = "tutorial" | "ad" | "podcast" | "vlog" | "short";
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";
export type ThumbnailStyle = "bold_creator" | "clean_editorial" | "cinematic";

export type EditOptions = {
  target_duration?: number | null;
  aspect_ratio?: AspectRatio | null;
  platform?: string | null;
  music_preference?: string | null;
  captions?: boolean;
  intensity?: number;
  keep_original_audio?: boolean;
  thumbnail_style?: ThumbnailStyle | null;
  instructions?: string | null;
  auto_render?: boolean;
  cta_text?: string | null;
  /** Set by the backend for combined videos. */
  combined_from?: string[];
  combined_parts?: Array<{ index: number; name: string; start: number; end: number }>;
};

export type UploadOptions = {
  title?: string;
  goal?: VideoGoal | null;
  template_id?: string | null;
  options?: EditOptions;
};

export type VideoExtras = {
  goal?: VideoGoal | string | null;
  template_id?: string | null;
  edit_options?: EditOptions | null;
  processing_stage?: string | null;
  content_type?: string | null;
  original_url?: string | null;
};

export type VideoPatch = {
  title?: string;
  goal?: VideoGoal | string | null;
  template_id?: string | null;
  edit_options?: EditOptions | null;
};

export type StageRecord = {
  stage: string;
  status: string;
  started_at?: string | null;
  finished_at?: string | null;
  note?: string | null;
  error?: string | null;
};

export type VideoProgress = {
  status: string;
  stage?: string | null;
  progress: number;
  error?: string | null;
  stages: StageRecord[];
  all_stages?: string[];
};

export type AnalysisShot = {
  id: string;
  index?: number;
  start: number;
  end: number;
  duration?: number;
  motion?: number;
  quality?: number;
  faces?: number | null;
  speech_coverage?: number;
  flags?: string[];
  role_hint?: string;
  description?: string;
  [key: string]: unknown;
};

export type HookCandidate = {
  start: number;
  end: number;
  score: number;
  kind?: string;
  text?: string;
  shot_id?: string;
  [key: string]: unknown;
};

export type VideoAnalysis = {
  shots?: AnalysisShot[];
  hook_candidates?: HookCandidate[];
  speech_ratio?: number | null;
  motion_mean?: number | null;
  face_ratio?: number | null;
  energy_mean?: number | null;
  content_type?: string | null;
  mood?: string | null;
  [key: string]: unknown;
};

export type CreativeTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  creative_direction?: string;
  platforms?: string[];
  default_aspect?: string;
  aspect_ratios?: string[];
  target_duration?: number | null;
  duration_range?: number[] | null;
  hook?: string;
  ending?: string;
  dialogue_policy?: string;
  grade?: string;
  pacing?: { shot_min?: number; shot_max?: number; cuts_per_minute?: number; rhythm?: string };
  transitions?: { allowed?: string[]; [key: string]: unknown };
  motion?: Record<string, unknown>;
  typography?: { caption_style?: string; [key: string]: unknown };
  music?: {
    genres?: string[];
    moods?: string[];
    energy?: string | number;
    bpm_range?: number[];
    beat_sync?: boolean | number;
  };
  sfx?: { level?: string; kinds?: string[] };
  thumbnail?: { concepts?: string[]; accent?: string };
  intensity?: number;
  preview_palette?: string[];
  adaptation_rules?: unknown;
};

export type TemplateLibrary = {
  categories: Record<string, string>;
  auto: { id: string; name: string; description: string };
  templates: CreativeTemplate[];
};

export type MusicStyles = {
  styles: Array<{ id: string; label: string }>;
  providers?: Record<string, unknown>;
  require_commercial_license?: boolean;
};

export type MusicTrack = {
  id?: string;
  kind?: string;
  provider?: string;
  title: string;
  energy?: number | null;
  duration_seconds?: number | null;
  instrumental?: boolean | null;
  commercial_use?: boolean;
  source_url?: string | null;
  preview_url?: string | null;
  eligible?: boolean;
  ineligible_reason?: string | null;
  artist?: string | null;
  genre?: string | null;
  moods?: string[] | null;
  bpm?: number | null;
  license_name?: string | null;
  license_url?: string | null;
  attribution?: string | null;
  url?: string | null;
  [key: string]: unknown;
};

export type MusicRanking = {
  title: string;
  score: number;
  reasons?: string[];
  eligible?: boolean;
  ineligible_reason?: string | null;
  license_name?: string | null;
};

export type CreativeTimelineItem = {
  id: string;
  shot_id?: string | null;
  source_start: number;
  source_end: number;
  speed?: number;
  role?: string;
  reason?: string;
  transition_in?: string | null;
  transition_duration?: number | null;
  motion?: string | null;
  text_overlay?: string | null;
  emphasis_words?: string[];
  beat_aligned?: boolean;
  confidence?: number | null;
  segment_id?: string | null;
  timeline_start?: number;
  timeline_end?: number;
};

export type MusicChoice = {
  status: string;
  title?: string | null;
  artist?: string | null;
  license_name?: string | null;
  license_url?: string | null;
  attribution?: string | null;
  bpm?: number | null;
  reason?: string | null;
  ranking?: MusicRanking[];
};

export type CreativePlan = {
  template_name?: string | null;
  template_reason?: string | null;
  planner?: string | null;
  llm_generated?: boolean;
  creative_direction?: string | null;
  adaptation_notes?: string[];
  hook?: {
    strategy?: string;
    description?: string;
    source_start?: number;
    source_end?: number;
    reason?: string;
  } | null;
  narrative?: Array<{ beat: string; description?: string; item_ids?: string[] }>;
  timeline?: CreativeTimelineItem[];
  pacing_notes?: string | string[] | null;
  music?: {
    genres?: string[];
    moods?: string[];
    energy?: string | number | null;
    bpm_range?: number[];
    rationale?: string | null;
    choice?: MusicChoice | null;
  } | null;
  beat_sync?: {
    strength?: number;
    aligned_cuts?: number;
    total_cuts?: number;
    skipped_for_speech?: number;
    notes?: string | string[] | null;
  } | null;
  sound_design?: Array<{ time: number; kind: string; reason?: string }>;
  typography?: {
    caption_style?: string;
    events?: Array<{ kind: string; start: number; duration: number; text: string }>;
  } | null;
  visual?: { grade?: string; notes?: string | string[] } | null;
  storytelling_devices?: string[];
  ending?: { strategy?: string; description?: string } | null;
  thumbnail_concepts?: Array<{
    id: string;
    style: string;
    headline: string;
    frame_time?: number;
    rationale?: string;
  }>;
  output?: { aspect?: string; width?: number; height?: number; target_duration?: number } | null;
  validation?: { fixed?: string[]; warnings?: string[]; duration?: number } | null;
};

export type AIDecision = "accepted" | "rejected";

export type EditPlanExtras = {
  template_id?: string | null;
  creative?: CreativePlan | null;
  ai_decisions?: Record<string, AIDecision> | null;
};

export type Chapters = {
  chapters: Array<{ start: number; timestamp: string; title: string }>;
  valid: boolean;
  problems: string[];
  description: string;
  description_source?: string;
  text: string;
};

export type RenderReport = {
  render?: {
    duration?: number;
    clips?: number;
    transitions?: number;
    beat_aligned_cuts?: number;
    warnings?: string[];
  };
  music?: {
    title?: string | null;
    license_name?: string | null;
    attribution?: string | null;
    status?: string | null;
    reason?: string | null;
  } | null;
  credits?: Array<string | { kind: string; text: string }>;
  beat_sync?: { aligned_cuts?: number; total_cuts?: number; [key: string]: unknown } | null;
};

export type ThumbnailPosition = "auto" | "left" | "right" | "top" | "bottom" | "center";

export type ThumbnailConcept = {
  style: string;
  headline: string;
  frame_time?: number | null;
  position?: ThumbnailPosition;
  accent?: string | null;
};

export type ThumbnailFormat = "youtube" | "vertical" | "square";

export type DesignThumbnailsRequest = {
  concepts?: ThumbnailConcept[];
  format?: ThumbnailFormat;
  from_thumbnail_id?: string | null;
};

export type Highlight = {
  title: string;
  start: number;
  end: number;
  reason: string;
  score: number;
  caption?: string | null;
  kind?: string | null;
};

export type TrimRequest = {
  segments: Array<{ start: number; end: number; label?: string }>;
  preset_id?: string | null;
  aspect_ratio?: string | null;
  burn_captions?: boolean;
  render?: boolean;
};

export type TrimResponse = { plan_id: string; render_job?: RenderJob | null };

export type VideoComment = {
  id: string;
  time: number;
  text: string;
  author?: string | null;
  applied?: boolean;
  applied_plan_id?: string | null;
  created_at?: string | null;
};

export type UserPreferencesData = {
  prompt_history?: string[];
  saved_prompts?: string[];
  default_template_id?: string | null;
};

export type UserPreferences = {
  data: UserPreferencesData;
  style_memory?: Record<string, unknown> | null;
  style_hints: string[];
};

export type Usage = {
  uploads: number;
  upload_minutes: number;
  renders: number;
  render_minutes: number;
  revisions_today: number;
  limits?: Record<string, number | null>;
};

export type AppNotification = {
  id: string;
  kind: string;
  title: string;
  detail?: string | null;
  at: string;
  unread: boolean;
  video_id?: string | null;
};

export type NotificationsResponse = { items: AppNotification[]; unread: number };

export type FeedbackInput = {
  kind: "bug" | "idea" | "other";
  message: string;
  page?: string;
  video_id?: string;
};

export type AnalyticsSummary = {
  videos: {
    total: number;
    by_status: Record<string, number>;
    minutes_uploaded: number;
    avg_processing_seconds: number | null;
    content_types: Record<string, number>;
  };
  plans: { total: number; revisions: number; templates: Record<string, number> };
  renders: {
    total: number;
    completed: number;
    failed: number;
    success_rate: number | null;
    avg_render_seconds: number | null;
    minutes_rendered: number;
  };
  uploads_by_day?: Array<{ date: string; count: number }>;
};
