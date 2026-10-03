import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";

let posthogLogsSdk: NodeSDK | null | undefined;
let posthogLogsLogger: ReturnType<typeof logs.getLogger> | null | undefined;

function getPostHogLogsLogger() {
  if (posthogLogsSdk !== undefined) return posthogLogsLogger ?? null;

  const apiKey = process.env["VITE_PUBLIC_POSTHOG_PROJECT_TOKEN"];
  if (!apiKey) {
    if (import.meta.env.DEV) {
      throw new Error(
        "VITE_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
      );
    }
    posthogLogsSdk = null;
    posthogLogsLogger = null;
    return posthogLogsLogger;
  }

  const host = process.env["VITE_PUBLIC_POSTHOG_HOST"];
  if (!host) {
    if (import.meta.env.DEV) {
      throw new Error(
        "VITE_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_HOST is configured",
      );
    }
    posthogLogsSdk = null;
    posthogLogsLogger = null;
    return posthogLogsLogger;
  }

  posthogLogsSdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": "cutroom-server",
      "deployment.environment": process.env["NODE_ENV"] ?? "development",
    }),
    logRecordProcessors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: `${host.replace(/\/$/, "")}/i/v1/logs`,
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      ),
    ],
  });
  posthogLogsSdk.start();
  posthogLogsLogger = logs.getLogger("posthog-exporter");
  return posthogLogsLogger;
}

export function emitPostHogLog(
  severityText: "info" | "error",
  body: string,
  attributes: Record<string, string | number | boolean>,
) {
  getPostHogLogsLogger()?.emit({ severityText, body, attributes });
}
