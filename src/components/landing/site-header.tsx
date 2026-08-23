import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6"
      >
        <Link
          to="/"
          className="flex items-center gap-3 rounded-sm focus-visible:ring-2 focus-visible:ring-cinema-ember focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-md border border-cinema-line"
            style={{
              background: "linear-gradient(140deg, var(--cinema-ember), var(--cinema-ember-deep))",
            }}
          />
          <span className="font-[family-name:var(--font-display)] text-lg tracking-wide text-cinema-ink">
            Cutroom
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-6">
          <a
            href="#journey"
            className="hidden rounded-sm text-sm text-cinema-muted transition-colors hover:text-cinema-ink focus-visible:ring-2 focus-visible:ring-cinema-ember focus-visible:outline-none sm:inline"
          >
            The journey
          </a>
          <a
            href="#craft"
            className="hidden rounded-sm text-sm text-cinema-muted transition-colors hover:text-cinema-ink focus-visible:ring-2 focus-visible:ring-cinema-ember focus-visible:outline-none sm:inline"
          >
            Craft
          </a>
          <Button
            asChild
            variant="outline"
            className="border-cinema-line bg-transparent text-cinema-ink hover:bg-cinema-haze/40 hover:text-cinema-ink"
          >
            <Link to="/login">Log in</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
