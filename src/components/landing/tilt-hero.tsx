import { useEffect, useRef } from "react";

/** Pointer-driven 3D tilt with scroll parallax and floating depth chips. */
export function TiltHero({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, frame = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      const s = Math.min(window.scrollY, 800);
      el.style.setProperty("--rx", `${(-cy * 8 + s * 0.012).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(cx * 12).toFixed(2)}deg`);
      el.style.setProperty("--sy", `${(s * -0.12).toFixed(1)}px`);
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const chips = [
    { t: "Auto captions", c: "top-[8%] -left-4", z: 90, d: 0 },
    { t: "Hook score 92", c: "top-[40%] -right-6", z: 130, d: 1.2 },
    { t: "9:16 ready", c: "bottom-[10%] left-[12%]", z: 70, d: 2.1 },
  ];

  return (
    <div style={{ perspective: "1400px" }}>
      <div
        ref={ref}
        className="relative"
        style={{
          transformStyle: "preserve-3d",
          transform: "translateY(var(--sy,0)) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
        }}
      >
        <div aria-hidden="true" className="bg-brand-gradient absolute inset-6 rounded-3xl opacity-40 blur-3xl" style={{ transform: "translateZ(-80px)" }} />
        <img
          src={src}
          alt={alt}
          width={1152}
          height={928}
          className="relative w-full rounded-3xl border border-border shadow-[var(--shadow-card)]"
          style={{ transform: "translateZ(0)" }}
        />
        {chips.map((ch) => (
          <span
            key={ch.t}
            aria-hidden="true"
            data-cinema-motion
            className={`glass-panel absolute ${ch.c} rounded-full px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-card)]`}
            style={{ transform: `translateZ(${ch.z}px)`, animation: `cinema-float 7s ease-in-out ${ch.d}s infinite` }}
          >
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />
            {ch.t}
          </span>
        ))}
      </div>
    </div>
  );
}
