import { isKeycloakConfigured, keycloakAuthorizationEndpoint, keycloakConfig } from "./keycloak-config";

const VERIFIER_KEY = "cutroom.pkce_verifier";
const STATE_KEY = "cutroom.oauth_state";

function randomString(bytes = 48) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer);
}

function base64UrlEncode(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(digest);
}

/**
 * Kicks off the hosted Keycloak authorization-code-with-PKCE flow. No
 * credentials are ever collected in-app; Keycloak owns the login and any
 * MFA/TOTP step, then redirects back to /auth/callback.
 */
export async function startKeycloakLogin(returnTo?: string) {
  if (!isKeycloakConfigured()) {
    throw new Error("Keycloak is not configured. Set the VITE_KEYCLOAK_* environment variables.");
  }

  const verifier = randomString();
  const state = randomString(16);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: keycloakConfig.clientId,
    redirect_uri: `${window.location.origin}/auth/callback`,
    response_type: "code",
    scope: "openid profile email",
    state,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: "S256",
  });
  if (returnTo) params.set("return_to", returnTo);

  window.location.assign(`${keycloakAuthorizationEndpoint()}?${params.toString()}`);
}

export function consumePkceVerifier() {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  return verifier;
}

export function consumeOAuthState() {
  const state = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return state;
}
