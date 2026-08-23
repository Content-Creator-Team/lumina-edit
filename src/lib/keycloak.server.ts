/**
 * Server-only Keycloak helpers. Token exchange and refresh happen here so the
 * refresh token never reaches the browser; both tokens live in httpOnly
 * cookies.
 */

export type KeycloakServerConfig = {
  url: string;
  realm: string;
  clientId: string;
  clientSecret?: string;
};

export function serverKeycloakConfig(): KeycloakServerConfig {
  return {
    url: (process.env["KEYCLOAK_URL"] ?? "").replace(/\/$/, ""),
    realm: process.env["KEYCLOAK_REALM"] ?? "",
    clientId: process.env["KEYCLOAK_CLIENT_ID"] ?? "",
    clientSecret: process.env["KEYCLOAK_CLIENT_SECRET"] || undefined,
  };
}

export function isServerKeycloakConfigured(config = serverKeycloakConfig()) {
  return Boolean(config.url && config.realm && config.clientId);
}

export function realmBase(config = serverKeycloakConfig()) {
  return `${config.url}/realms/${config.realm}`;
}

export function tokenEndpoint(config = serverKeycloakConfig()) {
  return `${realmBase(config)}/protocol/openid-connect/token`;
}

export function endSessionEndpoint(config = serverKeycloakConfig()) {
  return `${realmBase(config)}/protocol/openid-connect/logout`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
};

export async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const config = serverKeycloakConfig();
  if (!isServerKeycloakConfigured(config)) {
    throw new Error("Keycloak is not configured on the server (KEYCLOAK_URL/REALM/CLIENT_ID).");
  }
  const params = new URLSearchParams({ client_id: config.clientId, ...body });
  if (config.clientSecret) params.set("client_secret", config.clientSecret);

  const response = await fetch(tokenEndpoint(config), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Identity provider rejected the request (${response.status}). ${detail.slice(0, 300)}`,
    );
  }
  return (await response.json()) as TokenResponse;
}

export type SessionUser = {
  sub: string;
  name: string | null;
  email: string | null;
  org: string | null;
  roles: string[];
};

/** Decodes a JWT payload. The token is only ever obtained directly from Keycloak over TLS. */
export function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = atob(padded);
    const bytes = Uint8Array.from(json, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function userFromToken(token: string): SessionUser | null {
  const claims = decodeJwt(token);
  if (!claims || typeof claims["sub"] !== "string") return null;

  const realmAccess = claims["realm_access"] as { roles?: string[] } | undefined;
  const org =
    (claims["organization"] as string | undefined) ??
    (claims["org"] as string | undefined) ??
    (claims["org_name"] as string | undefined) ??
    null;

  return {
    sub: claims["sub"],
    name: (claims["name"] as string | undefined) ?? (claims["preferred_username"] as string) ?? null,
    email: (claims["email"] as string | undefined) ?? null,
    org: typeof org === "string" ? org : null,
    roles: Array.isArray(realmAccess?.roles) ? realmAccess.roles : [],
  };
}

export function tokenExpiry(token: string): number | null {
  const claims = decodeJwt(token);
  const exp = claims?.["exp"];
  return typeof exp === "number" ? exp * 1000 : null;
}
