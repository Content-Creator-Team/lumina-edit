import { Scissors, Sparkles, Upload, Wand2, Waves, Clapperboard } from "lucide-react";

import { Reveal } from "./reveal";

const STAGES = [
  {
    id: "ingest",
    step: "01",
    icon: Upload,
    title: "Ingest",
    line: "Drop an mp4, mov or mkv. It streams straight to object storage with real progress — no waiting room.",
  },
  {
    id: "scenes",
    step: "02",
    icon: Scissors,
    title: "Scene detection",
    line: "Every cut, dissolve and hold is mapped into precise scene bounds you can trim against.",
  },
  {
    id: "transcript",
    step: "03",
    icon: Waves,
    title: "Transcription",
    line: "Word-level transcript, aligned to the timeline, clickable all the way down to the syllable.",
  },
  {
    id: "vision",
    step: "04",
    icon: Sparkles,
    title: "Vision tagging",
    line: "Faces, motion, framing and on-screen events become searchable markers on the track.",
  },
  {
    id: "plan",
    step: "05",
    icon: Wand2,
    title: "Edit plan",
    line: "A reviewable plan of keeps and cuts with captions and overlays — proposed, never forced.",
  },
  {
    id: "render",
    step: "06",
    icon: Clapperboard,
    title: "Render",
    line: "Approve the plan and the cut renders out, tracked job by job, ready to download.",
  },
] as const;

export function Journey() {
  return (
    <section
      id="journey"
      aria-labelledby="journey-heading"
      className="relative mx-auto w-full max-w-6xl px-6 py-28 lg:py-36"
    >
      <Reveal>
        <p className="font-[family-name:var(--font-body)] text-xs tracking-[0.4em] text-cinema-ember uppercase">
          The journey
        </p>
        <h2
          id="journey-heading"
          className="mt-5 max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-[1.05] text-balance text-cinema-ink sm:text-5xl lg:text-6xl"
        >
          Six passes between raw footage and a finished cut.
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-cinema-muted">
          Each pass is visible, inspectable and reversible. The system proposes; you stay the editor
          of record.
        </p>
      </Reveal>

      <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-cinema-line bg-cinema-line sm:grid-cols-2 lg:grid-cols-3">
        {STAGES.map((stage, index) => (
          <Reveal as="li" key={stage.id} delay={index * 70}>
            <div className="group relative h-full bg-cinema-deep/80 p-8 transition-colors duration-500 hover:bg-cinema-haze/40">
              <div className="flex items-center justify-between">
                <span
                  className="flex size-11 items-center justify-center rounded-lg border border-cinema-line"
                  style={{ background: "color-mix(in oklab, var(--foreground) 4%, transparent)" }}
                >
                  <stage.icon
                    className="size-5 text-cinema-ember"
                    aria-hidden="true"
                    strokeWidth={1.5}
                  />
                </span>
                <span className="font-[family-name:var(--font-display)] text-2xl text-cinema-muted/50">
                  {stage.step}
                </span>
              </div>
              <h3 className="mt-6 font-[family-name:var(--font-display)] text-2xl text-cinema-ink">
                {stage.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-cinema-muted">{stage.line}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
