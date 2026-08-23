/**
 * In-memory access-token holder. Tokens are persisted only in httpOnly
 * cookies; this mirror exists so the API client can attach an Authorization
 * header without a round-trip, and is cleared on logout or refresh failure.
 */
let accessToken: string | null = null;
let expiresAt = 0;
let refreshHandler: (() => Promise<string | null>) | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null, expiry = 0) {
  accessToken = token;
  expiresAt = expiry;
}

export function getAccessToken() {
  return accessToken;
}

export function getAccessTokenExpiry() {
  return expiresAt;
}

export function registerRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler;
}

export function registerUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function refreshAccessToken() {
  if (!refreshHandler) return null;
  return refreshHandler();
}

export function notifyUnauthorized() {
  unauthorizedHandler?.();
}
