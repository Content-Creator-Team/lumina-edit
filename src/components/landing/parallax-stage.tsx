import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Layered 3D hero stage. Pointer + scroll drive a single CSS transform on a
 * rAF-throttled loop, so the whole composition stays on the compositor.
 */
export function ParallaxStage({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  // Purely decorative: render after hydration so the 3D layers never take part
  // in SSR markup (avoids hydration diffs and keeps the first paint cheap).
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (reduced) return;
    const stage = stageRef.current;
    if (!stage) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onPointer = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      stage.style.setProperty("--tilt-x", `${(-currentY * 7).toFixed(3)}deg`);
      stage.style.setProperty("--tilt-y", `${(currentX * 9).toFixed(3)}deg`);
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  const layers = [
    { z: 0, size: "78%", x: "18%", y: "-8%", tint: "oklch(0.5 0.13 288)", blur: "90px", opacity: 0.5 },
    { z: 90, size: "46%", x: "34%", y: "14%", tint: "oklch(0.66 0.18 45)", blur: "80px", opacity: 0.4 },
    { z: 180, size: "34%", x: "8%", y: "22%", tint: "oklch(0.72 0.14 200)", blur: "70px", opacity: 0.3 },
  ];

  if (!mounted) return null;

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      className={cn("scene-3d pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ ["--tilt-x" as string]: "0deg", ["--tilt-y" as string]: "0deg" }}
    >
      <div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(var(--tilt-x)) rotateY(var(--tilt-y))",
        }}
      >
        {/* Depth haze fields */}
        {layers.map((layer) => (
          <div
            key={layer.z}
            data-cinema-motion
            className="absolute top-1/2 left-1/2 rounded-full"
            style={{
              width: layer.size,
              aspectRatio: "1 / 0.62",
              marginLeft: `calc(${layer.size} / -2)`,
              marginTop: layer.y,
              transform: `translate3d(${layer.x}, -50%, ${layer.z}px)`,
              background: `radial-gradient(circle at 50% 45%, ${layer.tint}, transparent 62%)`,
              filter: `blur(${layer.blur})`,
              opacity: layer.opacity,
              animation: "cinema-float 14s ease-in-out infinite",
            }}
          />
        ))}

        {/* Rotating film-reel horizon ring */}
        <div
          data-cinema-motion
          className="absolute top-[58%] left-[68%] h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            borderColor: "oklch(0.75 0.05 260 / 6%)",
            transform: "translate3d(-50%, -50%, 40px) rotateX(58deg)",
            animation: "cinema-drift 48s linear infinite",
            background: "transparent",
            boxShadow: "0 0 120px 20px oklch(0.66 0.16 55 / 8%) inset",
          }}
        />

        {/* Floating filmstrip planes */}
        {[
          { x: "22%", y: "-26%", z: 60, r: -16 },
          { x: "44%", y: "4%", z: 120, r: 12 },
          { x: "14%", y: "30%", z: 20, r: 4 },
        ].map((card, index) => (
          <div
            key={card.z}
            data-cinema-motion
            className="absolute top-1/2 left-1/2 h-40 w-64 rounded-xl border backdrop-blur-sm"
            style={{
              borderColor: "oklch(0.75 0.05 260 / 6%)",
              background:
                "linear-gradient(140deg, oklch(1 0 0 / 10%), oklch(0.22 0.055 278 / 70%) 60%)",
              transform: `translate3d(calc(-50% + ${card.x}), calc(-50% + ${card.y}), ${card.z}px) rotateY(${card.r}deg) rotateX(6deg)`,
              animation: `cinema-float ${9 + index * 2.5}s ease-in-out ${index * 0.8}s infinite`,
              boxShadow: "0 40px 120px -40px oklch(0.16 0.03 275 / 90%)",
            }}
          >
            <div className="flex h-full flex-col justify-between p-3">
              <div className="flex gap-1.5">
                {Array.from({ length: 6 }).map((_, dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--cinema-line)" }}
                  />
                ))}
              </div>
              <div className="space-y-1.5">
                <div
                  className="h-1.5 w-3/4 rounded-full"
                  style={{ background: "var(--cinema-ember)" }}
                />
                <div
                  className="h-1.5 w-1/2 rounded-full"
                  style={{ background: "var(--cinema-line)" }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Light sweep */}
        <div
          data-cinema-motion
          className="absolute top-0 left-0 h-full w-40"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.97 0.01 280 / 12%), transparent)",
            animation: "cinema-sweep 11s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}
