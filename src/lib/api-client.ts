import {
  getAccessToken,
  notifyUnauthorized,
  refreshAccessToken,
} from "./auth-store";
import type {
  ApproveResponse,
  EditPlan,
  PlanPatch,
  RenderJob,
  Scene,
  Transcript,
  UploadTicket,
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
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured()) {
    throw new ApiError(
      0,
      "The API base URL is not configured. Set VITE_API_URL to point at the FastAPI service.",
    );
  }

  const { method = "GET", body, signal, retryOn401 = true } = options;
  const token = getAccessToken();

  const headers: Record<string, string> = { accept: "application/json" };
  if (token) headers["authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
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
  listVideos: () => apiRequest<Video[] | { items: Video[] }>("/api/v1/videos"),
  createUpload: (input: { filename: string; content_type: string; size: number }) =>
    apiRequest<UploadTicket>("/api/v1/videos/upload", { method: "POST", body: input }),
  confirmUpload: (videoId: string) =>
    apiRequest<Video>(`/api/v1/videos/${videoId}/confirm`, { method: "POST" }),
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
  approvePlan: (planId: string) =>
    apiRequest<ApproveResponse>(`/api/v1/edit-plans/${planId}/approve`, { method: "POST" }),
  revisePlan: (videoId: string, planId: string, instruction: string) =>
    apiRequest<EditPlan>(`/api/v1/videos/${videoId}/edit-plans/${planId}/revise`, {
      method: "POST",
      body: { instruction },
    }),
  getRenderJob: (jobId: string) => apiRequest<RenderJob>(`/api/v1/render-jobs/${jobId}`),
};

/** Normalises list responses that may be bare arrays or `{ items: [...] }`. */
export function toArray<T>(value: T[] | { items?: T[] } | { scenes?: T[] } | undefined | null): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const record = value as { items?: T[]; scenes?: T[] };
  return record.items ?? record.scenes ?? [];
}

/** Direct presigned upload with real progress. Uses XHR because fetch has no upload progress. */
export function uploadToPresignedUrl(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
) {
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
