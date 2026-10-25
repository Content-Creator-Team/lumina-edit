import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ScanSearch } from "lucide-react";
import { useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatTimecode, videoAnalysisQuery } from "@/lib/queries";

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const level = (v: number | null | undefined) =>
  v == null ? "—" : v < 0.3 ? "Low" : v < 0.6 ? "Medium" : "High";

/** Collapsible summary of GET /videos/{id}/analysis. Fetched only when opened. */
export function FootageAnalysis({ videoId, enabled }: { videoId: string; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({ ...videoAnalysisQuery(videoId), enabled: enabled && open, retry: 1 });
  const a = q.data;
  const shots = a?.shots ?? [];
  const hooks = [...(a?.hook_candidates ?? [])].sort((x, y) => y.score - x.score).slice(0, 6);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mt-8 rounded-xl border border-border"
    >
      <CollapsibleTrigger
        disabled={!enabled}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground disabled:opacity-60"
      >
        <ScanSearch className="size-4 text-primary" aria-hidden="true" />
        Footage analysis
        {!enabled && (
          <span className="text-xs font-normal text-muted-foreground">
            · available after processing
          </span>
        )}
        <ChevronDown
          className={`ml-auto size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-4 py-4">
        {q.isPending ? (
          <p className="text-sm text-muted-foreground">Loading analysis…</p>
        ) : q.isError || !a ? (
          <p className="text-sm text-muted-foreground">
            No analysis is available for this video yet.
          </p>
        ) : (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ["Content", a.content_type?.replace(/_/g, " ") ?? "—"],
                ["Mood", a.mood ?? "—"],
                ["Speech", pct(a.speech_ratio)],
                ["Motion", level(a.motion_mean)],
                ["Faces on screen", pct(a.face_ratio)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted/40 p-2.5">
                  <dt className="text-[11px] text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 text-sm font-medium capitalize text-foreground">{v}</dd>
                </div>
              ))}
            </dl>

            {hooks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground">Hook candidates</p>
                <ul className="mt-2 space-y-1.5">
                  {hooks.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Link
                        to="/editor/$videoId"
                        params={{ videoId }}
                        title="Open in editor"
                        className="shrink-0 rounded bg-muted px-1.5 font-mono text-xs hover:bg-accent"
                      >
                        {formatTimecode(h.start)}
                      </Link>
                      <span className="min-w-0 flex-1 text-muted-foreground">
                        {h.text ? `“${h.text}”` : (h.kind ?? "Moment")}
                        <span className="ml-1 text-xs">
                          · {h.kind ? `${h.kind} · ` : ""}score {Math.round(h.score * 100)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {shots.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground">Shots · {shots.length}</p>
                <div className="mt-2 max-h-72 overflow-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted text-left text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">Time</th>
                        <th className="px-2 py-1.5 font-medium">Role</th>
                        <th className="px-2 py-1.5 font-medium">Motion</th>
                        <th className="px-2 py-1.5 font-medium">Quality</th>
                        <th className="px-2 py-1.5 font-medium">Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shots.map((s) => (
                        <tr key={s.id} className="border-t border-border">
                          <td className="px-2 py-1 font-mono whitespace-nowrap">
                            {formatTimecode(s.start)}–{formatTimecode(s.end)}
                          </td>
                          <td className="px-2 py-1 capitalize">{s.role_hint ?? "—"}</td>
                          <td className="px-2 py-1">{pct(s.motion)}</td>
                          <td className="px-2 py-1">{pct(s.quality)}</td>
                          <td className="px-2 py-1 text-muted-foreground">
                            {s.flags?.length ? s.flags.join(", ").replace(/_/g, " ") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
