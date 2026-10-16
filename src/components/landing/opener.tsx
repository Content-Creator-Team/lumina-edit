import { useEffect, useState } from "react";

const LINES = ["Every idea starts raw.", "AI finds the story.", "You make it viral."];
const KEY = "reelzoy.opener_seen";

/** Story-style intro shown once per session. Skippable, respects reduced motion. */
export function Opener() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    const timers = [
      setTimeout(() => setStep(1), 1100),
      setTimeout(() => setStep(2), 2200),
      setTimeout(() => setStep(3), 3300),
      setTimeout(() => setLeaving(true), 4300),
      setTimeout(() => close(), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  function close() {
    sessionStorage.setItem(KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="REELZOY intro"
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background transition-opacity duration-700 ${leaving ? "opacity-0" : "opacity-100"}`}
    >
      <div aria-hidden="true" className="opener-aperture absolute size-[140vmax] rounded-full" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[12vh] bg-foreground/90 opener-bar-top" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[12vh] bg-foreground/90 opener-bar-bottom" />
      <div className="relative text-center" style={{ perspective: "800px" }}>
        {step < 3 ? (
          <p key={step} className="opener-line font-[family-name:var(--font-display)] text-3xl font-bold sm:text-5xl">
            {LINES[step]}
          </p>
        ) : (
          <div className="opener-logo">
            <p className="font-[family-name:var(--font-display)] text-6xl font-extrabold tracking-tight sm:text-8xl">
              <span className="text-brand-gradient">REELZOY</span>
            </p>
            <p className="mt-3 text-sm tracking-[0.3em] text-muted-foreground uppercase">Turn ideas into viral videos</p>
          </div>
        )}
        <div className="mx-auto mt-8 h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div className="bg-brand-gradient opener-progress h-full" />
        </div>
      </div>
      <button
        onClick={close}
        className="absolute right-6 bottom-6 rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Skip intro
      </button>
    </div>
  );
}
