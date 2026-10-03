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
};

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
};

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
};

export type SmartClip = {
  start: number;
  end: number;
  score: number;
  hook: string;
  reason: string;
  tags: string[];
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
