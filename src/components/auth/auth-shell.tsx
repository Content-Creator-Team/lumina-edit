import { useEffect, useState, type ReactNode } from "react";

import { AppIconBadge } from "@/components/app-icon-badge";
import { BrandMark } from "@/components/landing/site-header";

const CAPTIONS = [
  "Beat-synced cuts",
  "Designed thumbnails",
  "Auto highlights",
  "Captions in seconds",
];

const CLIPS = [
  { w: "28%", tone: "var(--tint-1)" },
  { w: "18%", tone: "var(--primary)" },
  { w: "24%", tone: "var(--tint-2)" },
  { w: "20%", tone: "var(--signal)" },
];

const BARS = Array.from(
  { length: 36 },
  (_, i) => 30 + Math.round(Math.abs(Math.sin(i * 1.7)) * 70),
);

function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="auth-backdrop pointer-events-none fixed inset-0 overflow-hidden"
    >
      <div className="auth-blob auth-blob-a" />
      <div className="auth-blob auth-blob-b" />
      <div className="auth-blob auth-blob-c" />
      <div className="auth-grid absolute inset-0" />
      {/* floating motifs */}
      <svg className="auth-motif left-[6%] top-[14%] w-24" viewBox="0 0 96 64" fill="none">
        <rect x="2" y="2" width="92" height="60" rx="6" stroke="currentColor" strokeWidth="2" />
        {[10, 30, 50, 70].map((x) => (
          <rect key={x} x={x} y="8" width="10" height="6" rx="1" fill="currentColor" />
        ))}
        {[10, 30, 50, 70].map((x) => (
          <rect key={`b${x}`} x={x} y="50" width="10" height="6" rx="1" fill="currentColor" />
        ))}
      </svg>
      <svg
        className="auth-motif auth-motif-slow right-[8%] top-[68%] w-32"
        viewBox="0 0 128 24"
        fill="none"
      >
        {Array.from({ length: 16 }, (_, i) => (
          <rect
            key={i}
            x={i * 8}
            y={12 - ((i * 5) % 10)}
            width="4"
            height={4 + ((i * 5) % 10) * 2}
            rx="2"
            fill="currentColor"
          />
        ))}
      </svg>
      <svg
        className="auth-motif auth-motif-rev bottom-[10%] left-[14%] w-36"
        viewBox="0 0 144 20"
        fill="none"
      >
        <rect x="1" y="1" width="142" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
        <rect x="6" y="5" width="40" height="10" rx="2" fill="currentColor" />
        <rect x="50" y="5" width="28" height="10" rx="2" fill="currentColor" opacity=".6" />
        <rect x="82" y="5" width="56" height="10" rx="2" fill="currentColor" opacity=".8" />
      </svg>
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="auth-particle"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            animationDelay: `${(i % 7) * -1.3}s`,
            animationDuration: `${9 + (i % 5) * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

function Showcase() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % CAPTIONS.length), 2800);
    return () => window.clearInterval(t);
  }, []);

  return (
    <section
      aria-label="REELZOY AI editing preview"
      className="auth-showcase relative hidden flex-col justify-between gap-10 p-10 lg:flex"
    >
      <BrandMark />
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cinema-muted">
          AI video editor
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight text-cinema-ink">
          Raw footage in.
          <br />
          Scroll-stopping edits out.
        </h2>
        <p className="mt-3 max-w-sm text-sm text-cinema-muted">
          REELZOY plans, cuts and packages your videos so you can review instead of scrub.
        </p>

        <div className="auth-preview mt-8 rounded-2xl border border-white/10 bg-black/40 p-4 text-white shadow-2xl">
          <div className="mb-3 flex items-center justify-between text-[11px] text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <span className="auth-rec size-2 rounded-full bg-red-500" /> AI editing
            </span>
            <span className="relative h-4 min-w-36 overflow-hidden text-right" aria-live="polite">
              <span key={idx} className="auth-caption block font-medium text-white">
                {CAPTIONS[idx]}
              </span>
            </span>
          </div>
          {/* timeline */}
          <div className="relative space-y-2">
            {[0, 1].map((row) => (
              <div key={row} className="flex h-7 gap-1.5 rounded-md bg-white/5 p-1">
                {CLIPS.map((c, i) => (
                  <span
                    key={i}
                    className="auth-clip rounded"
                    style={{
                      width: row ? `calc(${c.w} - 4%)` : c.w,
                      background: `color-mix(in oklab, ${c.tone} 75%, white 10%)`,
                      animationDelay: `${300 + (row * 4 + i) * 140}ms`,
                    }}
                  />
                ))}
              </div>
            ))}
            {[18, 41, 63, 84].map((x, i) => (
              <span
                key={x}
                className="auth-beat absolute top-0 h-full w-px bg-white/70"
                style={{ left: `${x}%`, animationDelay: `${i * 0.5}s` }}
              />
            ))}
            <span className="auth-playhead absolute -top-1 h-[calc(100%+8px)] w-0.5 rounded bg-white" />
          </div>
          {/* waveform */}
          <div className="mt-3 flex h-10 items-center gap-[3px]">
            {BARS.map((h, i) => (
              <span
                key={i}
                className="auth-bar flex-1 rounded-full bg-white/60"
                style={{ height: `${h}%`, animationDelay: `${(i % 9) * -0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-cinema-muted">© {new Date().getFullYear()} REELZOY</p>
    </section>
  );
}

/** Shared layout for all auth screens: animated backdrop, showcase panel, glass card. */
export function AuthShell({ subtitle, children }: { subtitle: ReactNode; children: ReactNode }) {
  return (
    <main className="auth-shell relative min-h-screen overflow-hidden bg-cinema-void font-[family-name:var(--font-body)] text-cinema-ink">
      <Backdrop />
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <Showcase />
        <div className="flex justify-center">
          <div className="auth-card w-full max-w-sm rounded-2xl p-6 sm:p-8">
            <div className="auth-stagger text-center">
              <AppIconBadge />
              <h1 className="sr-only">REELZOY</h1>
              <p className="mt-4 text-sm text-cinema-muted">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
