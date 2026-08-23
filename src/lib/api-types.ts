/**
 * Typed contracts for the FastAPI backend. Only endpoints that exist in the
 * documented API are represented here — nothing is invented.
 */

export type VideoStatus =
  | "uploading"
  | "processing"
  | "plan_ready"
  | "approved"
  | "rendering"
  | "complete"
  | "failed";

export const TERMINAL_VIDEO_STATUSES: VideoStatus[] = ["complete", "failed"];

export type Video = {
  id: string;
  filename?: string | null;
  name?: string | null;
  title?: string | null;
  status: VideoStatus | string;
  created_at?: string | null;
  uploaded_at?: string | null;
  duration?: number | null;
  thumbnail_url?: string | null;
  playback_url?: string | null;
  error?: string | null;
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
  start: number;
  end: number;
  label?: string | null;
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
  action: PlanSegmentAction | string;
  scene_id?: string | null;
  caption?: string | null;
  text_overlay?: string | null;
  thumbnail_url?: string | null;
  reason?: string | null;
};

export type PlanEvent = {
  time: number;
  type?: string | null;
  label?: string | null;
  description?: string | null;
};

export type PlanStatus = "DRAFT" | "APPROVED" | "SUPERSEDED" | string;

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
};

export type RenderJob = {
  id: string;
  status: "queued" | "processing" | "complete" | "failed" | string;
  progress?: number | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  output_url?: string | null;
  error?: string | null;
  video_id?: string | null;
};

export type ApproveResponse = {
  render_job_id?: string | null;
  job_id?: string | null;
  id?: string | null;
  status?: string | null;
};

export type PlanPatch = {
  segments: Array<{
    id: string;
    start?: number;
    end?: number;
    action?: PlanSegmentAction;
    caption?: string | null;
    text_overlay?: string | null;
  }>;
};
