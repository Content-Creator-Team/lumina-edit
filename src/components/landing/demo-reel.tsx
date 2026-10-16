import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

import heroImg from "@/assets/hero-reelzoy-3d.jpg";
import { Reveal } from "./reveal";

const SCENES = [
  { label: "1. Upload raw footage", cap: "Analyzing 12:04 of footage…", pos: "20% 40%" },
  { label: "2. AI finds highlights", cap: "3 viral moments detected", pos: "50% 45%" },
  { label: "3. Captions & hooks", cap: "“You won't believe this view…”", pos: "85% 35%" },
  { label: "4. Export for every platform", cap: "TikTok · Reels · Shorts", pos: "15% 75%" },
];

/** Animated product walkthrough built from the hero render (no fake playback data). */
export function DemoReel() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setI((v) => (v + 1) % SCENES.length), 3000);
    return () => clearInterval(t);
  }, [playing]);

  const s = SCENES[i] ?? SCENES[0]!;

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-20" aria-labelledby="demo-heading">
      <Reveal>
        <h2 id="demo-heading" className="text-center font-[family-name:var(--font-display)] text-4xl font-bold">
          See REELZOY <span className="text-brand-gradient">in action</span>
        </h2>
        <p className="mt-2 text-center text-muted-foreground">A 12-second walkthrough of the editing flow.</p>
      </Reveal>
      <Reveal delay={150}>
        <div className="mt-10" style={{ perspective: "1600px" }}>
          <div className="demo-screen relative mx-auto aspect-video overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
            <img
              key={i}
              src={heroImg}
              alt=""
              aria-hidden="true"
              className="demo-kenburns absolute inset-0 size-full object-cover"
              style={{ objectPosition: s.pos }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/30" />
            <div className="absolute top-4 left-4 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold backdrop-blur">
              {s.label}
            </div>
            <p key={`c${i}`} className="opener-line absolute inset-x-0 bottom-16 text-center font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl" aria-live="polite">
              {s.cap}
            </p>
            <div className="absolute inset-x-4 bottom-4 flex items-center gap-3">
              <button
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause demo" : "Play demo"}
                className="bg-brand-gradient flex size-9 items-center justify-center rounded-full text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <div className="flex flex-1 gap-1.5">
                {SCENES.map((sc, n) => (
                  <button
                    key={sc.label}
                    onClick={() => setI(n)}
                    aria-label={`Go to ${sc.label}`}
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                  >
                    <span
                      className={`bg-brand-gradient block h-full ${n === i && playing ? "demo-progress" : ""}`}
                      style={{ width: n < i || (n === i && !playing) ? "100%" : n === i ? undefined : "0%" }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
