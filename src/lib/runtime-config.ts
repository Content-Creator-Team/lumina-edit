/**
 * Runtime mode detection.
 *
 *  - LIVE  — real FastAPI. Selected when `VITE_API_URL` is set (or when
 *            `VITE_DEMO_MODE=false` is set explicitly).
 *  - DEMO  — local fixture workspace when live config is absent, or forced
 *            with `VITE_DEMO_MODE=true`.
 */
const RAW_FLAG = (import.meta.env["VITE_DEMO_MODE"] as string | undefined)?.trim().toLowerCase();

export const API_BASE_URL = ((import.meta.env["VITE_API_URL"] as string | undefined) ?? "").replace(
  /\/$/,
  "",
);

export function isLiveConfigured() {
  return Boolean(API_BASE_URL);
}

export function isDemoMode() {
  if (RAW_FLAG === "true" || RAW_FLAG === "1") return true;
  if (RAW_FLAG === "false" || RAW_FLAG === "0") return false;
  return !isLiveConfigured();
}

/** True when demo mode is active only because nothing is configured yet. */
export function isImplicitDemoMode() {
  return isDemoMode() && RAW_FLAG !== "true" && RAW_FLAG !== "1";
}
