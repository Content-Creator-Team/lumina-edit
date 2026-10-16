import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, PlugZap } from "lucide-react";
import { FEATURES } from "@/components/landing/features-data";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — REELZOY AI video editor" },
      { name: "description", content: "Thumbnails, multi-video editing, short clips, captions, reframing, translation and more — with clear availability." },
      { property: "og:title", content: "Features — REELZOY AI video editor" },
      { property: "og:description", content: "Every REELZOY capability, and which ones need extra integrations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-extrabold">
          All the <span className="text-brand-gradient">AI tools</span> in one editor
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          We mark each feature honestly: available now, or waiting for an extra service to be connected.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {FEATURES.map((f) => (
            <section key={f.title} className="surface-card flex gap-5 rounded-2xl p-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <f.icon className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                <p className={`mt-3 inline-flex items-center gap-1.5 text-xs font-medium ${f.status === "available" ? "text-success" : "text-warning"}`}>
                  {f.status === "available" ? <CheckCircle2 className="size-3.5" /> : <PlugZap className="size-3.5" />}
                  {f.status === "available" ? "Available" : "Requires integration"} — {f.note}
                </p>
              </div>
            </section>
          ))}
        </div>
        <Button asChild size="lg" className="bg-brand-gradient mt-12 text-primary-foreground">
          <Link to="/register">Start Creating Free</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
