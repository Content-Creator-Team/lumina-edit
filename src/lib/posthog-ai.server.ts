import { getCookie } from "@tanstack/react-start/server";
import { PostHog } from "posthog-node";

import { userFromToken } from "./keycloak.server";

const ACCESS_COOKIE = "cutroom_at";

let posthogClient: PostHog | null | undefined;

function getPostHogClient() {
  if (posthogClient !== undefined) return posthogClient;

  const apiKey = process.env["VITE_PUBLIC_POSTHOG_PROJECT_TOKEN"];
  if (!apiKey) {
    if (import.meta.env.DEV) {
      throw new Error(
        "VITE_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
      );
    }
    posthogClient = null;
    return posthogClient;
  }

  const host = process.env["VITE_PUBLIC_POSTHOG_HOST"];
  if (!host) {
    if (import.meta.env.DEV) {
      throw new Error(
        "VITE_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_HOST is configured",
      );
    }
    posthogClient = null;
    return posthogClient;
  }

  posthogClient = new PostHog(apiKey, {
    host,
    flushAt: 1,
    flushInterval: 0,
    privacyMode: false,
  });
  return posthogClient;
}

export async function captureAiGeneration(
  properties: Record<string, unknown>,
  aiSessionId: string,
) {
  const client = getPostHogClient();
  if (!client) return;

  const token = getCookie(ACCESS_COOKIE);
  const user = token ? userFromToken(token) : null;

  try {
    client.capture({
      distinctId: user?.sub ?? aiSessionId,
      event: "$ai_generation",
      properties,
    });
    await client.flush();
  } catch (error) {
    console.error("PostHog AI Observability capture failed", error);
  }
}
