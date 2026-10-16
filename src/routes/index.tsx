import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Play, Sparkles, Upload, Wand2, MonitorSmartphone, Eye, Share2, Check } from "lucide-react";

import heroImg from "@/assets/hero-reelzoy.jpg";
import { FEATURES } from "@/components/landing/features-data";
import { Journey } from "@/components/landing/journey";
import { Reveal } from "@/components/landing/reveal";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { TimelineShowcase } from "@/components/landing/timeline-showcase";
import { Button } from "@/components/ui/button";

const TITLE = "REELZOY — Turn Your Ideas Into Viral Videos";
const DESCRIPTION =
  "Create, edit and optimize videos with AI. From long videos to short clips, captions, thumbnails and an editable AI edit plan.";

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

const STEPS = [
  { icon: Upload, title: "Upload Video", sub: "or multiple parts" },
  { icon: Wand2, title: "Let AI Do Magic", sub: "analyze & plan" },
  { icon: MonitorSmartphone, title: "Choose Platform", sub: "& settings" },
  { icon: Eye, title: "Preview & Edit", sub: "if needed" },
  { icon: Share2, title: "Download & Share", sub: "your video" },
];

const FAQ = [
  { q: "Do I need editing experience?", a: "No. Upload footage, review the AI plan in plain language, and approve. You can fine-tune every cut if you want." },
  { q: "Is the AI plan editable?", a: "Yes. Every segment, caption and trim can be changed before you render, and every revision is kept as a version." },
  { q: "Which features need extra setup?", a: "Translation, reference-link analysis and copyright checks need extra services connected. The Features page marks each one." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 60% at 80% 30%, color-mix(in oklab, var(--tint-1) 30%, transparent), transparent 70%), radial-gradient(50% 50% at 10% 90%, color-mix(in oklab, var(--tint-2) 22%, transparent), transparent 70%)",
            }}
          />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <Reveal>
                <span className="glass-panel inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                  <Sparkles className="size-3.5 text-primary" /> AI-Powered Video Editor
                </span>
              </Reveal>
              <Reveal delay={100}>
                <h1 className="mt-6 font-[family-name:var(--font-display)] text-5xl leading-[1.02] font-extrabold sm:text-6xl">
                  Turn Your Ideas Into <span className="text-brand-gradient">Viral Videos</span>
                </h1>
              </Reveal>
              <Reveal delay={200}>
                <p className="mt-6 max-w-lg text-lg text-muted-foreground">
                  Create, edit and optimize videos with AI. From long videos to short clips, captions,
                  thumbnails and more — all in one place.
                </p>
              </Reveal>
              <Reveal delay={300}>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="bg-brand-gradient text-primary-foreground hover:opacity-90">
                    <Link to="/register">Start Creating Free <ArrowRight className="ml-1 size-4" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/login"><Play className="mr-1 size-4" /> Explore Editor</Link>
                  </Button>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">No credit card required.</p>
              </Reveal>
            </div>
            <Reveal delay={150}>
              <img
                src={heroImg}
                alt="REELZOY editor on a phone surrounded by short-form video clips"
                width={1280}
                height={1024}
                className="w-full rounded-3xl border border-border shadow-[var(--shadow-card)]"
              />
            </Reveal>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="max-w-2xl font-[family-name:var(--font-display)] text-4xl font-bold">
            Everything You Need to Create <span className="text-brand-gradient">Amazing Videos</span>
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Powerful AI tools to help you create, edit and optimize your videos for every platform.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <div className="surface-card h-full rounded-2xl p-5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                  {f.status === "integration" && (
                    <p className="mt-3 text-xs font-medium text-warning">Requires integration</p>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
          <Link to="/features" className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-primary">
            See all features <ArrowRight className="size-4" />
          </Link>
        </section>

        <section className="bg-card/50 py-20">
          <div className="mx-auto w-full max-w-6xl px-6 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold">Create Content in Just a Few Clicks</h2>
            <p className="mt-2 text-muted-foreground">Simple steps. Powerful results.</p>
            <ol className="mt-12 grid gap-8 sm:grid-cols-5">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex flex-col items-center">
                  <span className="bg-brand-gradient flex size-12 items-center justify-center rounded-full font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <s.icon className="mt-4 size-5 text-primary" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <Journey />
        <TimelineShowcase />

        <section className="mx-auto w-full max-w-3xl px-6 py-20">
          <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-bold">Frequently asked</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="surface-card rounded-xl p-5">
                <summary className="cursor-pointer font-semibold">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto mb-20 w-full max-w-6xl px-6">
          <div className="bg-brand-gradient rounded-3xl px-8 py-14 text-primary-foreground">
            <h2 className="max-w-xl font-[family-name:var(--font-display)] text-4xl font-bold">
              More Than Just Editing. It's Your AI Creative Partner.
            </h2>
            <ul className="mt-6 space-y-2 text-sm">
              {["Smart editing plans you approve", "Better engagement with hooks & captions", "Exports for every platform"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="size-4" /> {t}</li>
              ))}
            </ul>
            <Button asChild size="lg" variant="secondary" className="mt-8">
              <Link to="/register">Start Creating Free <ArrowRight className="ml-1 size-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
