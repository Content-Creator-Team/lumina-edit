import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * AI highlight detection. The video is sent to Lovable AI Gateway and the model
 * returns candidate highlight moments with timecodes, which the UI turns into
 * editable clip suggestions. No project backend endpoint is involved.
 */

const Input = z.object({
  dataUrl: z.string().min(32),
  mimeType: z.string().min(3),
  durationSeconds: z.number().nonnegative().optional(),
  filename: z.string().optional(),
  goal: z.string().max(400).optional(),
});

export type HighlightSuggestion = {
  title: string;
  start: number;
  end: number;
  reason: string;
  score: number;
  caption?: string | undefined;
};

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("The model did not return usable highlight data.");
  return JSON.parse(raw.slice(first, last + 1));
}

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3.8-flash";

async function readStream(response: Response, startedAt: number) {
  const reader = response.body?.getReader();
  if (!reader) return { text: "", timeToFirstToken: null };
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let timeToFirstToken: number | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
        };
        const content = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? "";
        if (content && timeToFirstToken === null) {
          timeToFirstToken = (performance.now() - startedAt) / 1_000;
        }
        text += content;
      } catch {
        /* partial frame — ignored, the next chunk completes it */
      }
    }
  }
  return { text, timeToFirstToken };
}

export const findHighlights = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<{ highlights: HighlightSuggestion[]; summary: string }> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this project.");

    const known = data.durationSeconds && data.durationSeconds > 0 ? data.durationSeconds : null;
    const prompt = [
      known
        ? `You are an expert video editor reviewing a ${Math.round(known)} second clip.`
        : "You are an expert video editor reviewing the attached clip.",
      data.goal ? `Editor's goal: ${data.goal}` : "",
      "Identify the strongest highlight moments worth cutting into short clips.",
      "Return ONLY json in this exact shape:",
      `{"summary":"one sentence about the footage","highlights":[{"title":"short clip name","start":0,"end":6.5,"reason":"why this moment lands","caption":"suggested on-screen caption","score":0.87}]}`,
      `Rules: between 2 and 8 highlights; start/end are seconds${known ? ` within 0 and ${known.toFixed(1)}` : " measured from the start of the clip"}; keep each clip short; no overlaps; score between 0 and 1; titles under 6 words.`,
    ]
      .filter(Boolean)
      .join("\n");

    const [{ captureAiGeneration }, { emitPostHogLog }] = await Promise.all([
      import("./posthog-ai.server"),
      import("./posthog-logs.server"),
    ]);
    const aiSessionId = crypto.randomUUID();
    const aiTraceId = crypto.randomUUID();
    const startedAt = performance.now();
    const captureGeneration = (properties: Record<string, unknown>) =>
      captureAiGeneration(
        {
          $ai_trace_id: aiTraceId,
          $ai_session_id: aiSessionId,
          $ai_span_name: "find_highlights",
          $ai_model: AI_MODEL,
          $ai_provider: "google",
          $ai_input: [{ role: "user", content: prompt }],
          $ai_stream: true,
          $ai_base_url: new URL(AI_GATEWAY_URL).origin,
          $ai_request_url: AI_GATEWAY_URL,
          ...properties,
        },
        aiSessionId,
      );

    emitPostHogLog("info", "highlight_analysis_started", {
      has_goal: Boolean(data.goal),
      ...(known === null ? {} : { video_duration_seconds: Math.round(known) }),
    });

    let response: Response;
    try {
      response = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Lovable-API-Key": key,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          stream: true,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "video_url", video_url: { url: data.dataUrl } },
              ],
            },
          ],
        }),
      });
    } catch (error) {
      await captureGeneration({
        $ai_latency: (performance.now() - startedAt) / 1_000,
        $ai_is_error: true,
        $ai_error: error instanceof Error ? error.message : "AI gateway request failed",
      });
      emitPostHogLog("error", "highlight_analysis_gateway_request_failed", {
        failure_stage: "request",
      });
      throw error;
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      await captureGeneration({
        $ai_latency: (performance.now() - startedAt) / 1_000,
        $ai_http_status: response.status,
        $ai_is_error: true,
        $ai_error: `HTTP ${response.status}`,
      });
      emitPostHogLog("error", "highlight_analysis_gateway_request_failed", {
        failure_stage: "response",
        http_status: response.status,
      });
      if (response.status === 429) {
        throw new Error("AI is busy right now. Wait a moment and run the analysis again.");
      }
      if (response.status === 402) {
        throw new Error("AI credits are exhausted. Add credits in workspace settings to continue.");
      }
      throw new Error(
        `Highlight analysis failed (${response.status}). ${detail.slice(0, 200)}`.trim(),
      );
    }

    const { text, timeToFirstToken } = await readStream(response, startedAt);
    await captureGeneration({
      $ai_latency: (performance.now() - startedAt) / 1_000,
      $ai_http_status: response.status,
      $ai_output_choices: [{ role: "assistant", content: text }],
      ...(timeToFirstToken === null ? {} : { $ai_time_to_first_token: timeToFirstToken }),
    });
    const parsed = extractJson(text) as {
      summary?: string;
      highlights?: Array<Partial<HighlightSuggestion>>;
    };

    const max = known ?? Number.POSITIVE_INFINITY;
    const highlights: HighlightSuggestion[] = (parsed.highlights ?? [])
      .map((item, index) => {
        const start = Math.max(0, Math.min(max, Number(item.start ?? 0)));
        const end = Math.max(start + 0.5, Math.min(max, Number(item.end ?? start + 5)));
        return {
          title: String(item.title ?? `Highlight ${index + 1}`).slice(0, 80),
          start,
          end,
          reason: String(item.reason ?? "").slice(0, 400),
          caption: item.caption ? String(item.caption).slice(0, 120) : undefined,
          score: Math.max(0, Math.min(1, Number(item.score ?? 0.5))),
        };
      })
      .sort((a, b) => a.start - b.start);

    if (highlights.length === 0) {
      throw new Error("The model found no highlight moments in this footage.");
    }

    emitPostHogLog("info", "highlight_analysis_completed", {
      highlight_count: highlights.length,
      latency_ms: Math.round(performance.now() - startedAt),
    });

    return { highlights, summary: String(parsed.summary ?? "") };
  });
