import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Film, Gauge, ShieldCheck } from "lucide-react";

import { Journey } from "@/components/landing/journey";
import { ParallaxStage } from "@/components/landing/parallax-stage";
import { Reveal } from "@/components/landing/reveal";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { TimelineShowcase } from "@/components/landing/timeline-showcase";
import { Button } from "@/components/ui/button";

const TITLE = "Cutroom — AI video editing you can actually direct";
const DESCRIPTION =
  "Upload footage, watch scene detection, transcription and vision tagging build an edit plan, then review every keep and cut before you render.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const CRAFT = [
  {
    icon: Film,
    title: "Plans, not black boxes",
    body: "Every proposed cut arrives as a versioned, inspectable edit plan. Revise it in plain language; history is never overwritten.",
  },
  {
    icon: Gauge,
    title: "Pipeline you can watch",
    body: "Scene detection, transcription, timeline extraction, vision tagging and plan generation each report their own state, live.",
  },
  {
    icon: ShieldCheck,
    title: "Single sign-on, properly",
    body: "Hosted identity with MFA support, tokens held in httpOnly cookies, and silent refresh long before anything expires.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-cinema-void font-[family-name:var(--font-body)] text-cinema-ink antialiased">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section
          aria-labelledby="hero-heading"
          className="cinema-grain relative flex min-h-[92vh] items-center overflow-hidden"
        >
          <ParallaxStage />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(90% 60% at 50% 10%, transparent, oklch(0.16 0.03 275 / 92%) 78%)",
            }}
          />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-32 pb-24">
            <Reveal>
              <p className="text-xs tracking-[0.45em] text-cinema-ember uppercase">
                AI video editing platform
              </p>
            </Reveal>
            <Reveal delay={120}>
              <h1
                id="hero-heading"
                className="mt-7 max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-[0.98] text-balance sm:text-7xl lg:text-8xl"
              >
                The machine finds the cut. You still call it.
              </h1>
            </Reveal>
            <Reveal delay={240}>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-cinema-muted">
                Cutroom watches your footage end to end — scenes, speech, faces, motion — and hands
                back an edit plan you can interrogate frame by frame before a single pixel renders.
              </p>
            </Reveal>
            <Reveal delay={340}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="group bg-cinema-ember text-cinema-void hover:bg-cinema-ember/90"
                >
                  <Link to="/login">
                    Enter the cutroom
                    <ArrowRight
                      className="ml-1 size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
                <a
                  href="#journey"
                  className="rounded-sm border-b border-cinema-line pb-1 text-sm text-cinema-muted transition-colors hover:text-cinema-ink focus-visible:ring-2 focus-visible:ring-cinema-ember focus-visible:outline-none"
                >
                  See how the pipeline works
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <Journey />
        <TimelineShowcase />

        {/* Craft */}
        <section
          id="craft"
          aria-labelledby="craft-heading"
          className="mx-auto w-full max-w-6xl px-6 py-24 lg:py-32"
        >
          <Reveal>
            <h2
              id="craft-heading"
              className="max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-[1.08] text-balance sm:text-5xl"
            >
              Built like production software, not a demo reel.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {CRAFT.map((item, index) => (
              <Reveal key={item.title} delay={index * 90}>
                <item.icon
                  className="size-6 text-cinema-ember"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <h3 className="mt-5 font-[family-name:var(--font-display)] text-xl text-cinema-ink">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-cinema-muted">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section aria-labelledby="cta-heading" className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 120% at 50% 120%, oklch(0.63 0.17 45 / 32%), transparent 70%)",
            }}
          />
          <div className="relative mx-auto w-full max-w-3xl px-6 py-32 text-center">
            <Reveal>
              <h2
                id="cta-heading"
                className="font-[family-name:var(--font-display)] text-4xl leading-[1.05] text-balance sm:text-6xl"
              >
                Bring the footage. Keep the final say.
              </h2>
              <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-cinema-muted">
                Sign in with your organisation account to upload your first video.
              </p>
              <div className="mt-10">
                <Button
                  asChild
                  size="lg"
                  className="bg-cinema-ember text-cinema-void hover:bg-cinema-ember/90"
                >
                  <Link to="/login">Log in</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
