/**
 * Runtime mode detection.
 *
 * The app has two modes and picks one automatically:
 *
 *  - LIVE  — real FastAPI + Keycloak. Selected as soon as `VITE_API_URL`
 *            and the `VITE_KEYCLOAK_*` values are present (or when
 *            `VITE_DEMO_MODE=false` is set explicitly).
 *  - DEMO  — a self-contained local workspace with fixture data, used so the
 *            preview is usable with no environment configuration at all.
 *            Selected when the live configuration is absent, or forced with
 *            `VITE_DEMO_MODE=true`.
 *
 * Demo mode never calls the network: no Keycloak redirect, no FastAPI
 * requests, and no invented production endpoints.
 */
import { isKeycloakConfigured } from "./keycloak-config";

const RAW_FLAG = (import.meta.env["VITE_DEMO_MODE"] as string | undefined)?.trim().toLowerCase();

export const API_BASE_URL = ((import.meta.env["VITE_API_URL"] as string | undefined) ?? "").replace(
  /\/$/,
  "",
);

export function isLiveConfigured() {
  return Boolean(API_BASE_URL) && isKeycloakConfigured();
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
