import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import type { SessionUser } from "./keycloak.server";

const ACCESS_COOKIE = "cutroom_at";
const REFRESH_COOKIE = "cutroom_rt";

export type SessionPayload = {
  user: SessionUser;
  accessToken: string;
  expiresAt: number;
};

export type MfaChallenge = {
  mfa_required: true;
  session_token: string;
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge,
  };
}

function apiUrl() {
  return (process.env["API_URL"] ?? "http://localhost:8000").replace(/\/$/, "");
}

async function apiFetch(path: string, init: RequestInit) {
  const resp = await fetch(`${apiUrl()}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ detail: "Request failed" }));
    throw new Error((body as { detail?: string }).detail ?? "Request failed");
  }
  return resp.json() as Promise<Record<string, unknown>>;
}

/** Email + password login. Returns a full session or an MFA challenge. */
export const loginWithPassword = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { email: string; password: string; remember_me?: boolean }) => data,
  )
  .handler(async ({ data }): Promise<SessionPayload | MfaChallenge> => {
    const { userFromToken, tokenExpiry } = await import("./keycloak.server");
    const result = await apiFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: data.email, password: data.password, remember_me: data.remember_me ?? false }),
    });
    if (result["mfa_required"]) {
      return { mfa_required: true, session_token: result["session_token"] as string } satisfies MfaChallenge;
    }
    const accessToken = result["access_token"] as string;
    const refreshToken = result["refresh_token"] as string;
    const expiresIn = result["expires_in"] as number;
    const user = userFromToken(accessToken);
    if (!user) throw new Error("Could not read the token returned by the server.");
    setCookie(ACCESS_COOKIE, accessToken, cookieOptions(expiresIn));
    setCookie(REFRESH_COOKIE, refreshToken, cookieOptions(30 * 24 * 60 * 60));
    return {
      user,
      accessToken,
      expiresAt: tokenExpiry(accessToken) ?? Date.now() + expiresIn * 1000,
    };
  });

/** Complete MFA login with a TOTP code or recovery code. */
export const verifyMfa = createServerFn({ method: "POST" })
  .inputValidator((data: { session_token: string; code: string }) => data)
  .handler(async ({ data }): Promise<SessionPayload> => {
    const { userFromToken, tokenExpiry } = await import("./keycloak.server");
    const result = await apiFetch("/api/v1/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const accessToken = result["access_token"] as string;
    const refreshToken = result["refresh_token"] as string;
    const expiresIn = result["expires_in"] as number;
    const user = userFromToken(accessToken);
    if (!user) throw new Error("Could not read the MFA token.");
    setCookie(ACCESS_COOKIE, accessToken, cookieOptions(expiresIn));
    setCookie(REFRESH_COOKIE, refreshToken, cookieOptions(30 * 24 * 60 * 60));
    return {
      user,
      accessToken,
      expiresAt: tokenExpiry(accessToken) ?? Date.now() + expiresIn * 1000,
    };
  });

/** Register a new account. Returns the email so the UI can show a confirmation. */
export const registerUser = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { email: string; password: string; confirm_password: string; full_name?: string; invitation_token?: string }) => data,
  )
  .handler(async ({ data }): Promise<{ email: string }> => {
    await apiFetch("/api/v1/auth/register", { method: "POST", body: JSON.stringify(data) });
    return { email: data.email };
  });

/** Verify email address via token from the verification link. */
export const verifyEmailToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    await apiFetch("/api/v1/auth/verify-email", { method: "POST", body: JSON.stringify(data) });
  });

/** Request a password reset email. Always succeeds server-side. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    await apiFetch("/api/v1/auth/forgot-password", { method: "POST", body: JSON.stringify(data) }).catch(() => undefined);
  });

/** Reset password with the token from the reset email. */
export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; password: string; confirm_password: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    await apiFetch("/api/v1/auth/reset-password", { method: "POST", body: JSON.stringify(data) });
  });

/** Reads the current session from the httpOnly access-token cookie. */
export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionPayload | null> => {
    const { userFromToken, tokenExpiry } = await import("./keycloak.server");
    const token = getCookie(ACCESS_COOKIE);
    if (!token) return null;
    const user = userFromToken(token);
    const expiresAt = tokenExpiry(token);
    if (!user || !expiresAt || expiresAt <= Date.now()) return null;
    return { user, accessToken: token, expiresAt };
  },
);

/** Silent refresh using the httpOnly refresh-token cookie. */
export const refreshSession = createServerFn({ method: "POST" }).handler(
  async (): Promise<SessionPayload | null> => {
    const { userFromToken, tokenExpiry } = await import("./keycloak.server");
    const refreshToken = getCookie(REFRESH_COOKIE);
    if (!refreshToken) return null;
    try {
      const result = await apiFetch("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const accessToken = result["access_token"] as string;
      const newRefreshToken = result["refresh_token"] as string;
      const expiresIn = result["expires_in"] as number;
      const user = userFromToken(accessToken);
      if (!user) return null;
      setCookie(ACCESS_COOKIE, accessToken, cookieOptions(expiresIn));
      setCookie(REFRESH_COOKIE, newRefreshToken, cookieOptions(30 * 24 * 60 * 60));
      return {
        user,
        accessToken,
        expiresAt: tokenExpiry(accessToken) ?? Date.now() + expiresIn * 1000,
      };
    } catch {
      deleteCookie(ACCESS_COOKIE, { path: "/" });
      deleteCookie(REFRESH_COOKIE, { path: "/" });
      return null;
    }
  },
);

/** Clears session cookies and notifies the backend to revoke the session. */
export const endSession = createServerFn({ method: "POST" }).handler(
  async (): Promise<void> => {
    const token = getCookie(ACCESS_COOKIE);
    if (token) {
      await fetch(`${apiUrl()}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    deleteCookie(ACCESS_COOKIE, { path: "/" });
    deleteCookie(REFRESH_COOKIE, { path: "/" });
  },
);
