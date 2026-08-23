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

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    maxAge,
  };
}

/** Exchanges the authorization code (PKCE) for tokens and stores them in httpOnly cookies. */
export const exchangeCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; codeVerifier: string; redirectUri: string }) => data)
  .handler(async ({ data }): Promise<SessionPayload> => {
    const { requestToken, userFromToken, tokenExpiry } = await import("./keycloak.server");
    const tokens = await requestToken({
      grant_type: "authorization_code",
      code: data.code,
      code_verifier: data.codeVerifier,
      redirect_uri: data.redirectUri,
    });

    const user = userFromToken(tokens.access_token);
    if (!user) throw new Error("The identity provider returned a token we could not read.");

    setCookie(ACCESS_COOKIE, tokens.access_token, cookieOptions(tokens.expires_in));
    if (tokens.refresh_token) {
      setCookie(
        REFRESH_COOKIE,
        tokens.refresh_token,
        cookieOptions(tokens.refresh_expires_in ?? 60 * 60 * 24 * 7),
      );
    }

    return {
      user,
      accessToken: tokens.access_token,
      expiresAt: tokenExpiry(tokens.access_token) ?? Date.now() + tokens.expires_in * 1000,
    };
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
    const { requestToken, userFromToken, tokenExpiry } = await import("./keycloak.server");
    const refreshToken = getCookie(REFRESH_COOKIE);
    if (!refreshToken) return null;

    try {
      const tokens = await requestToken({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });
      const user = userFromToken(tokens.access_token);
      if (!user) return null;

      setCookie(ACCESS_COOKIE, tokens.access_token, cookieOptions(tokens.expires_in));
      if (tokens.refresh_token) {
        setCookie(
          REFRESH_COOKIE,
          tokens.refresh_token,
          cookieOptions(tokens.refresh_expires_in ?? 60 * 60 * 24 * 7),
        );
      }
      return {
        user,
        accessToken: tokens.access_token,
        expiresAt: tokenExpiry(tokens.access_token) ?? Date.now() + tokens.expires_in * 1000,
      };
    } catch {
      deleteCookie(ACCESS_COOKIE, { path: "/" });
      deleteCookie(REFRESH_COOKIE, { path: "/" });
      return null;
    }
  },
);

/** Clears the session cookies and returns the Keycloak end-session URL to visit. */
export const endSession = createServerFn({ method: "POST" })
  .inputValidator((data: { postLogoutRedirectUri: string }) => data)
  .handler(async ({ data }): Promise<{ logoutUrl: string | null }> => {
    const { endSessionEndpoint, isServerKeycloakConfigured, serverKeycloakConfig } =
      await import("./keycloak.server");
    const refreshToken = getCookie(REFRESH_COOKIE);

    const config = serverKeycloakConfig();
    if (refreshToken && isServerKeycloakConfigured(config)) {
      const params = new URLSearchParams({
        client_id: config.clientId,
        refresh_token: refreshToken,
      });
      if (config.clientSecret) params.set("client_secret", config.clientSecret);
      await fetch(endSessionEndpoint(config), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }).catch(() => undefined);
    }

    deleteCookie(ACCESS_COOKIE, { path: "/" });
    deleteCookie(REFRESH_COOKIE, { path: "/" });

    if (!isServerKeycloakConfigured(config)) return { logoutUrl: null };
    const url = new URL(endSessionEndpoint(config));
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("post_logout_redirect_uri", data.postLogoutRedirectUri);
    return { logoutUrl: url.toString() };
  });
