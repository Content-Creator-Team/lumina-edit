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

async function readStream(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
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
        text += chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? "";
      } catch {
        /* partial frame — ignored, the next chunk completes it */
      }
    }
  }
  return text;
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
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

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
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

    const text = await readStream(response);
    const parsed = extractJson(text) as {
      summary?: string;
      highlights?: Array<Partial<HighlightSuggestion>>;
    };

    const max = data.durationSeconds;
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

    return { highlights, summary: String(parsed.summary ?? "") };
  });
