import { Reveal } from "./reveal";

const SEGMENTS = [
  { id: "s1", label: "Cold open", action: "keep", width: 18 },
  { id: "s2", label: "Dead air", action: "cut", width: 8 },
  { id: "s3", label: "Interview A", action: "keep", width: 24 },
  { id: "s4", label: "Filler", action: "cut", width: 6 },
  { id: "s5", label: "B-roll city", action: "keep", width: 20 },
  { id: "s6", label: "Retake", action: "cut", width: 9 },
  { id: "s7", label: "Closing line", action: "keep", width: 15 },
] as const;

export function TimelineShowcase() {
  return (
    <section
      aria-labelledby="timeline-heading"
      className="relative mx-auto w-full max-w-6xl px-6 py-24 lg:py-32"
    >
      <div className="grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr]">
        <Reveal>
          <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.4em] text-cinema-signal uppercase">
            The review room
          </p>
          <h2
            id="timeline-heading"
            className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-[1.08] text-balance text-cinema-ink sm:text-5xl"
          >
            A timeline you can argue with.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-cinema-muted">
            Keeps and cuts are colour-coded <em className="not-italic text-cinema-ink">and</em>{" "}
            labelled with an icon and text, so the decision never depends on colour alone. Drag trim
            handles inside scene bounds, edit captions inline, then save the batch in one explicit
            action.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div
            className="cinema-grain relative overflow-hidden rounded-2xl border border-cinema-line p-6 shadow-2xl"
            style={{
              background:
                "linear-gradient(160deg, var(--surface-raised), var(--surface-sunken))",
            }}
          >
            <div
              className="relative aspect-video w-full overflow-hidden rounded-lg border border-cinema-line"
              style={{
                background:
                  "radial-gradient(120% 90% at 30% 20%, color-mix(in oklab, var(--tint-2) 26%, var(--surface-sunken)), var(--surface-sunken) 72%)",
              }}
            >
              <div
                data-cinema-motion
                aria-hidden="true"
                className="absolute inset-y-0 w-24"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 22%, transparent), transparent)",
                  animation: "cinema-sweep 9s ease-in-out infinite",
                }}
              />
              <span className="absolute bottom-3 left-3 rounded bg-cinema-void/70 px-2 py-1 text-[11px] tracking-wide text-cinema-muted">
                Presigned playback preview
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-[11px] tracking-[0.2em] text-cinema-muted uppercase">
                <span>Plan timeline</span>
                <span>v3 · draft</span>
              </div>
              <div className="flex h-11 w-full gap-1 overflow-hidden rounded-md border border-cinema-line p-1">
                {SEGMENTS.map((segment) => {
                  const keep = segment.action === "keep";
                  return (
                    <div
                      key={segment.id}
                      title={`${segment.label} — ${keep ? "Keep" : "Cut"}`}
                      className="flex items-center justify-center gap-1 rounded-sm px-1 text-[10px] font-medium whitespace-nowrap"
                      style={{
                        flex: `${segment.width} 1 0%`,
                        background: keep
                          ? "color-mix(in oklab, var(--signal) 22%, transparent)"
                          : "color-mix(in oklab, var(--muted-foreground) 18%, transparent)",
                        color: "var(--foreground)",
                        border: `1px solid ${keep ? "color-mix(in oklab, var(--signal) 55%, transparent)" : "color-mix(in oklab, var(--muted-foreground) 42%, transparent)"}`,
                        backgroundImage: keep
                          ? undefined
                          : "repeating-linear-gradient(45deg, color-mix(in oklab, var(--foreground) 10%, transparent) 0 4px, transparent 4px 8px)",
                      }}
                    >
                      <span aria-hidden="true">{keep ? "✓" : "✕"}</span>
                      <span className="hidden sm:inline">{keep ? "Keep" : "Cut"}</span>
                    </div>
                  );
                })}
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-cinema-muted">
                <li className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: "var(--signal)" }}
                    aria-hidden="true"
                  />
                  ✓ Keep segment
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: "var(--primary-deep)" }}
                    aria-hidden="true"
                  />
                  ✕ Cut segment
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: "var(--primary)" }}
                    aria-hidden="true"
                  />
                  ◆ Event marker
                </li>
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
