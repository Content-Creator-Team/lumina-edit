/** Browser-visible OIDC client config (legacy unused env vars). */
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
