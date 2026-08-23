/**
 * Browser-visible Keycloak configuration.
 *
 * Vite exposes only `VITE_`-prefixed variables to the client bundle, so the
 * spec's NEXT_PUBLIC_* names map 1:1 onto these:
 *   NEXT_PUBLIC_KEYCLOAK_URL       -> VITE_KEYCLOAK_URL
 *   NEXT_PUBLIC_KEYCLOAK_REALM     -> VITE_KEYCLOAK_REALM
 *   NEXT_PUBLIC_KEYCLOAK_CLIENT_ID -> VITE_KEYCLOAK_CLIENT_ID
 *   NEXT_PUBLIC_API_URL            -> VITE_API_URL
 */
export const keycloakConfig = {
  url: (import.meta.env["VITE_KEYCLOAK_URL"] as string | undefined) ?? "",
  realm: (import.meta.env["VITE_KEYCLOAK_REALM"] as string | undefined) ?? "",
  clientId: (import.meta.env["VITE_KEYCLOAK_CLIENT_ID"] as string | undefined) ?? "",
};

export function isKeycloakConfigured() {
  return Boolean(keycloakConfig.url && keycloakConfig.realm && keycloakConfig.clientId);
}

export function keycloakRealmBase() {
  return `${keycloakConfig.url.replace(/\/$/, "")}/realms/${keycloakConfig.realm}`;
}

export function keycloakAuthorizationEndpoint() {
  return `${keycloakRealmBase()}/protocol/openid-connect/auth`;
}

export function keycloakAccountConsoleUrl() {
  return `${keycloakRealmBase()}/account`;
}
