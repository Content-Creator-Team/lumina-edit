import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — REELZOY" },
      { name: "description", content: "Free, Creator Pro and Business plans with clear limits, export quality and processing quotas." },
      { property: "og:title", content: "Pricing — REELZOY" },
      { property: "og:description", content: "Compare REELZOY plans: Free, Creator Pro and Business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

const PLANS = [
  { name: "Free", price: "$0", blurb: "Try the AI editor", items: ["3 projects / month", "720p export", "30 min processing", "AI edit plan & highlights"], missing: ["Watermark-free export", "Team seats"], hl: false },
  { name: "Creator Pro", price: "$19", blurb: "For growing creators", items: ["Unlimited projects", "1080p & 4K export", "10 h processing / month", "Captions, thumbnails, versions", "No watermark"], missing: ["Team seats"], hl: true },
  { name: "Business", price: "$59", blurb: "For teams & brands", items: ["Everything in Pro", "40 h processing / month", "Team seats & roles", "Priority rendering", "SSO via your identity provider"], missing: [], hl: false },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <h1 className="text-center font-[family-name:var(--font-display)] text-5xl font-extrabold">Simple, <span className="text-brand-gradient">honest</span> pricing</h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
          Translation, reference-link analysis and copyright checks need extra integrations and are not included in any plan yet.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <section key={p.name} className={`surface-card flex flex-col rounded-2xl p-7 ${p.hl ? "ring-2 ring-primary" : ""}`}>
              {p.hl && <span className="bg-brand-gradient mb-3 self-start rounded-full px-3 py-0.5 text-xs text-primary-foreground">Most popular</span>}
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <p className="text-sm text-muted-foreground">{p.blurb}</p>
              <p className="mt-5 font-[family-name:var(--font-display)] text-4xl font-bold">{p.price}<span className="text-sm font-normal text-muted-foreground"> / month</span></p>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {p.items.map((i) => <li key={i} className="flex gap-2"><Check className="size-4 text-success" />{i}</li>)}
                {p.missing.map((i) => <li key={i} className="flex gap-2 text-muted-foreground"><Minus className="size-4" />{i} (not included)</li>)}
              </ul>
              <Button asChild className={`mt-8 ${p.hl ? "bg-brand-gradient text-primary-foreground" : ""}`} variant={p.hl ? "default" : "outline"}>
                <Link to="/register">{p.name === "Free" ? "Start Creating Free" : `Choose ${p.name}`}</Link>
              </Button>
            </section>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">Billing isn't connected yet — paid plans can't be purchased in this preview.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
