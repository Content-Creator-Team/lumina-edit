import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — REELZOY" },
      { name: "description", content: "Editing presets for travel, education, podcasts, gaming, fitness, business, reviews and lifestyle." },
      { property: "og:title", content: "Templates — REELZOY" },
      { property: "og:description", content: "Searchable editing presets with aspect ratios and caption styles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplatesPage,
});

const CATS = ["All", "Travel", "Education", "Podcasts", "Gaming", "Fitness", "Business", "Product reviews", "Lifestyle"];

const TEMPLATES = [
  { name: "Wanderlust Reel", cat: "Travel", ratio: "9:16", captions: "Bold pop-in", preset: "Fast cuts, upbeat pacing, location titles" },
  { name: "Explainer Classic", cat: "Education", ratio: "16:9", captions: "Clean lower-third", preset: "Chapter markers, slow pacing" },
  { name: "Podcast Clips", cat: "Podcasts", ratio: "1:1", captions: "Word-by-word highlight", preset: "Speaker focus, silence trimming" },
  { name: "Clutch Moments", cat: "Gaming", ratio: "16:9", captions: "Impact titles", preset: "Highlight detection, zoom punches" },
  { name: "Workout Split", cat: "Fitness", ratio: "9:16", captions: "Rep counters", preset: "Beat-synced cuts, timers" },
  { name: "Founder Update", cat: "Business", ratio: "16:9", captions: "Minimal subtitles", preset: "Calm pacing, branded intro" },
  { name: "Unboxing First Look", cat: "Product reviews", ratio: "4:5", captions: "Spec callouts", preset: "Close-up emphasis, verdict end card" },
  { name: "Day in My Life", cat: "Lifestyle", ratio: "9:16", captions: "Handwritten style", preset: "Soft transitions, montage" },
];

const RATIO_CLASS: Record<string, string> = { "9:16": "aspect-[9/16] w-16", "16:9": "aspect-video w-32", "1:1": "aspect-square w-24", "4:5": "aspect-[4/5] w-20" };

function TemplatesPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const list = useMemo(
    () => TEMPLATES.filter((t) => (cat === "All" || t.cat === cat) && (t.name + t.preset).toLowerCase().includes(q.toLowerCase())),
    [q, cat],
  );
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-extrabold">Creator <span className="text-brand-gradient">templates</span></h1>
        <p className="mt-4 text-muted-foreground">Start from an editing preset, then let AI build the plan around your footage.</p>
        <div className="relative mt-8 max-w-md">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search templates" placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div role="group" aria-label="Filter by category" className="mt-4 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</Button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="mt-12 text-muted-foreground">No templates match your search.</p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((t) => (
              <article key={t.name} className="surface-card flex flex-col rounded-2xl p-5">
                <div className="flex h-32 items-center justify-center rounded-xl bg-muted">
                  <div className={`bg-brand-gradient rounded-md ${RATIO_CLASS[t.ratio]}`} aria-hidden="true" />
                </div>
                <p className="mt-4 text-xs text-primary">{t.cat}</p>
                <h2 className="text-base font-semibold">{t.name}</h2>
                <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div><dt className="inline font-medium">Ratio: </dt><dd className="inline">{t.ratio}</dd></div>
                  <div><dt className="inline font-medium">Captions: </dt><dd className="inline">{t.captions}</dd></div>
                  <div><dt className="inline font-medium">Preset: </dt><dd className="inline">{t.preset}</dd></div>
                </dl>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/upload">Use template</Link>
                </Button>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
