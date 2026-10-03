import {
  getAccessToken,
  notifyUnauthorized,
  refreshAccessToken,
} from "./auth-store";
import { isDemoMode } from "./runtime-config";
import { demoRequest } from "./demo/demo-api";
import type {
  AgentEditResponse,
  ApproveResponse,
  BrandKit,
  BrandKitCreate,
  EditPlan,
  EngagementResponse,
  ExportOptions,
  ExportPreset,
  GeneratedThumbnail,
  PlanPatch,
  RenderJob,
  Scene,
  SilenceDetection,
  SmartClipsResponse,
  Transcript,
  TranslateJob,
  Video,
} from "./api-types";

export const API_BASE_URL = ((import.meta.env["VITE_API_URL"] as string | undefined) ?? "").replace(
  /\/$/,
  "",
);

export function isApiConfigured() {
  return Boolean(API_BASE_URL);
}

export class ApiError extends Error {
  status: number;
  detail: string;
  retryAfterSeconds: number | null;

  constructor(status: number, detail: string, retryAfterSeconds: number | null = null) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  get isRateLimited() {
    return this.status === 429;
  }

  get isPlanningError() {
    return this.status === 422 || /planning/i.test(this.detail);
  }
}

function friendlyRateLimit(detail: string, retryAfter: number | null) {
  const wait = retryAfter
    ? ` Try again in about ${retryAfter < 60 ? `${retryAfter} seconds` : `${Math.ceil(retryAfter / 60)} minutes`}.`
    : " Try again shortly.";
  return `${detail || "You've reached the usage limit for this action."}${wait}`;
}

async function readError(response: Response): Promise<ApiError> {
  let detail = "";
  try {
    const body = await response.clone().json();
    const raw = (body as { detail?: unknown; message?: unknown }).detail ?? (body as { message?: unknown }).message;
    if (typeof raw === "string") detail = raw;
    else if (Array.isArray(raw)) {
      detail = raw
        .map((item) =>
          typeof item === "string"
            ? item
            : ((item as { msg?: string }).msg ?? JSON.stringify(item)),
        )
        .join("; ");
    } else if (raw) detail = JSON.stringify(raw);
  } catch {
    detail = (await response.text().catch(() => "")).slice(0, 400);
  }

  const retryHeader = response.headers.get("retry-after");
  const retryAfter = retryHeader ? Number.parseInt(retryHeader, 10) : null;

  if (response.status === 429) {
    return new ApiError(
      429,
      friendlyRateLimit(detail, Number.isFinite(retryAfter) ? retryAfter : null),
      Number.isFinite(retryAfter) ? retryAfter : null,
    );
  }
  return new ApiError(
    response.status,
    detail || `Request failed with status ${response.status}.`,
    null,
  );
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  retryOn401?: boolean;
  formData?: FormData;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (isDemoMode()) {
    return demoRequest<T>({ path, method: options.method ?? "GET", body: options.body });
  }

  if (!isApiConfigured()) {
    throw new ApiError(
      0,
      "The API base URL is not configured. Set VITE_API_URL to point at the FastAPI service.",
    );
  }

  const { method = "GET", body, signal, retryOn401 = true, formData } = options;
  const token = getAccessToken();

  const headers: Record<string, string> = { accept: "application/json" };
  if (token) headers["authorization"] = `Bearer ${token}`;
  if (body !== undefined && !formData) headers["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      ...(signal ? { signal } : {}),
      ...(formData
        ? { body: formData }
        : body === undefined
          ? {}
          : { body: JSON.stringify(body) }),
    });
  } catch (cause) {
    if ((cause as Error)?.name === "AbortError") throw cause;
    throw new ApiError(0, "Could not reach the API. Check your connection and try again.");
  }

  if (response.status === 401 && retryOn401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest<T>(path, { ...options, retryOn401: false });
    notifyUnauthorized();
    throw new ApiError(401, "Your session expired. Redirecting you to sign in again…");
  }

  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/* ---------------------------------------------------------------- endpoints */

export const api = {
  listVideos: () => apiRequest<Video[]>("/api/v1/videos"),
  getVideo: (videoId: string) => apiRequest<Video>(`/api/v1/videos/${videoId}`),
  getScenes: (videoId: string) =>
    apiRequest<Scene[] | { scenes: Scene[] }>(`/api/v1/videos/${videoId}/scenes`),
  getTranscript: (videoId: string) =>
    apiRequest<Transcript | { segments: Transcript["segments"] }>(
      `/api/v1/videos/${videoId}/transcript`,
    ),
  getEditPlan: (videoId: string) => apiRequest<EditPlan>(`/api/v1/videos/${videoId}/edit-plan`),
  listEditPlans: (videoId: string) =>
    apiRequest<EditPlan[] | { items: EditPlan[] }>(`/api/v1/videos/${videoId}/edit-plans`),
  getPlan: (planId: string) => apiRequest<EditPlan>(`/api/v1/edit-plans/${planId}`),
  patchPlan: (planId: string, patch: PlanPatch) =>
    apiRequest<EditPlan>(`/api/v1/edit-plans/${planId}`, { method: "PATCH", body: patch }),
  approvePlan: (planId: string, options?: ExportOptions) =>
    apiRequest<ApproveResponse>(`/api/v1/edit-plans/${planId}/approve`, {
      method: "POST",
      body: options ?? {},
    }),
  revisePlan: (videoId: string, planId: string, instruction: string) =>
    apiRequest<EditPlan>(`/api/v1/videos/${videoId}/edit-plans/${planId}/revise`, {
      method: "POST",
      body: { instruction },
    }),
  getRenderJob: (jobId: string) => apiRequest<RenderJob>(`/api/v1/render-jobs/${jobId}`),
  listRenderJobs: (videoId: string) =>
    apiRequest<RenderJob[]>(`/api/v1/videos/${videoId}/render-jobs`),

  getSmartClips: (videoId: string, targetDuration = 30, maxClips = 5) =>
    apiRequest<SmartClipsResponse>(
      `/api/v1/videos/${videoId}/smart-clips?target_duration=${targetDuration}&max_clips=${maxClips}`,
    ),
  getEngagement: (videoId: string) =>
    apiRequest<EngagementResponse>(`/api/v1/videos/${videoId}/engagement`),
  getSilenceDetection: (videoId: string, silenceThreshold = 1.5) =>
    apiRequest<SilenceDetection>(
      `/api/v1/videos/${videoId}/silence-detection?silence_threshold=${silenceThreshold}`,
    ),

  agentEdit: (videoId: string, instruction: string) =>
    apiRequest<AgentEditResponse>("/api/v1/agent/edit", {
      method: "POST",
      body: { video_id: videoId, instruction },
    }),

  listExportPresets: () => apiRequest<{ presets: ExportPreset[] }>("/api/v1/export-presets"),
  getExportPreset: (presetId: string) =>
    apiRequest<ExportPreset>(`/api/v1/export-presets/${presetId}`),

  listThumbnails: (videoId: string) =>
    apiRequest<GeneratedThumbnail[]>(`/api/v1/videos/${videoId}/thumbnails`),
  regenerateThumbnails: (videoId: string, count = 4, timestamps?: number[]) =>
    apiRequest<GeneratedThumbnail[]>(`/api/v1/videos/${videoId}/thumbnails/regenerate`, {
      method: "POST",
      body: { count, timestamps: timestamps ?? null },
    }),

  listBrandKits: () => apiRequest<BrandKit[]>("/api/v1/brand-kits"),
  createBrandKit: (body: BrandKitCreate) =>
    apiRequest<BrandKit>("/api/v1/brand-kits", { method: "POST", body }),
  updateBrandKit: (kitId: string, body: Partial<BrandKitCreate>) =>
    apiRequest<BrandKit>(`/api/v1/brand-kits/${kitId}`, { method: "PATCH", body }),
  deleteBrandKit: (kitId: string) =>
    apiRequest<void>(`/api/v1/brand-kits/${kitId}`, { method: "DELETE" }),
  uploadBrandLogo: (kitId: string, file: File) => {
    const form = new FormData();
    form.append("file", file, file.name);
    return apiRequest<BrandKit>(`/api/v1/brand-kits/${kitId}/logo`, {
      method: "POST",
      formData: form,
    });
  },

  translateVideo: (videoId: string, targetLanguage: string, sourceLanguage = "auto") =>
    apiRequest<TranslateJob>(`/api/v1/videos/${videoId}/translate`, {
      method: "POST",
      body: {
        target_language: targetLanguage,
        source_language: sourceLanguage,
        review_before_dub: true,
      },
    }),
  dubVideo: (
    videoId: string,
    targetLanguage: string,
    opts?: { voice_clone?: boolean; voice_clone_consent?: boolean; translate_job_id?: string },
  ) =>
    apiRequest<TranslateJob>(`/api/v1/videos/${videoId}/dub`, {
      method: "POST",
      body: {
        target_language: targetLanguage,
        voice_clone: opts?.voice_clone ?? false,
        voice_clone_consent: opts?.voice_clone_consent ?? false,
        translate_job_id: opts?.translate_job_id ?? null,
      },
    }),

  exportCaptions: (videoId: string, format: "srt" | "vtt" = "srt") =>
    apiDownload(`/api/v1/videos/${videoId}/captions/export?format=${format}`),
};

/** Binary download helper (captions SRT/VTT). */
export async function apiDownload(path: string, signal?: AbortSignal): Promise<Blob> {
  if (isDemoMode()) {
    return new Blob([`1\n00:00:00,000 --> 00:00:02,000\nDemo caption\n`], {
      type: "application/x-subrip",
    });
  }
  if (!isApiConfigured()) {
    throw new ApiError(0, "The API base URL is not configured. Set VITE_API_URL.");
  }
  const token = getAccessToken();
  const headers: Record<string, string> = { accept: "*/*" };
  if (token) headers["authorization"] = `Bearer ${token}`;

  let response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...(signal ? { signal } : {}),
  });
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const t2 = getAccessToken();
      response = await fetch(`${API_BASE_URL}${path}`, {
        headers: { accept: "*/*", ...(t2 ? { authorization: `Bearer ${t2}` } : {}) },
        ...(signal ? { signal } : {}),
      });
    } else {
      notifyUnauthorized();
      throw new ApiError(401, "Your session expired.");
    }
  }
  if (!response.ok) throw await readError(response);
  return response.blob();
}

/** Normalises list responses that may be bare arrays or wrapped objects. */
export function toArray<T>(value: T[] | { items?: T[] } | { scenes?: T[] } | undefined | null): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const record = value as { items?: T[]; scenes?: T[] };
  return record.items ?? record.scenes ?? [];
}

/**
 * Upload a video file to the backend via multipart POST with XHR progress events.
 * Returns the video_id from the 202 response body.
 */
export function uploadVideoFile(
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (isDemoMode()) {
    return new Promise<string>((resolve, reject) => {
      let percent = 0;
      const timer = setInterval(() => {
        percent = Math.min(100, percent + 7 + Math.random() * 9);
        onProgress(Math.round(percent));
        if (percent >= 100) {
          clearInterval(timer);
          demoRequest<{ video_id: string }>({
            path: "/api/v1/videos/upload",
            method: "POST",
            body: { filename: file.name, size: file.size },
          })
            .then((r) => resolve(r.video_id))
            .catch(reject);
        }
      }, 160);
      signal?.addEventListener("abort", () => {
        clearInterval(timer);
        reject(new DOMException("Upload cancelled", "AbortError"));
      });
    });
  }

  if (!isApiConfigured()) {
    return Promise.reject(
      new ApiError(0, "The API base URL is not configured. Set VITE_API_URL."),
    );
  }

  return new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/v1/videos/upload`);

    const token = getAccessToken();
    if (token) xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("accept", "application/json");
    // Do NOT set content-type — the browser sets it with the correct multipart boundary.

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status === 202 || xhr.status === 200) {
        try {
          const body = JSON.parse(xhr.responseText) as { video_id?: string };
          resolve(body.video_id ?? "");
        } catch {
          reject(new ApiError(xhr.status, "Unexpected response from server."));
        }
      } else if (xhr.status === 401) {
        reject(new ApiError(401, "Your session expired. Please sign in again."));
      } else {
        let detail = `Upload failed (${xhr.status}).`;
        try {
          const body = JSON.parse(xhr.responseText) as { detail?: unknown };
          if (body.detail) {
            detail = Array.isArray(body.detail)
              ? (body.detail as { msg?: string }[]).map((e) => e.msg ?? String(e)).join("; ")
              : String(body.detail);
          }
        } catch { /* ignore */ }
        reject(new ApiError(xhr.status, detail));
      }
    };

    xhr.onerror = () => reject(new ApiError(0, "The upload connection dropped."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(formData);
  });
}

/** @deprecated Kept for demo mode. Use uploadVideoFile for real uploads. */
export function uploadToPresignedUrl(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
) {
  if (url.startsWith("demo://")) {
    return new Promise<void>((resolve, reject) => {
      let percent = 0;
      const timer = setInterval(() => {
        percent = Math.min(100, percent + 7 + Math.random() * 9);
        onProgress(Math.round(percent));
        if (percent >= 100) {
          clearInterval(timer);
          resolve();
        }
      }, 160);
      signal?.addEventListener("abort", () => {
        clearInterval(timer);
        reject(new DOMException("Upload cancelled", "AbortError"));
      });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError(xhr.status, `Storage rejected the upload (${xhr.status}).`));
    xhr.onerror = () => reject(new ApiError(0, "The upload connection dropped."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}
