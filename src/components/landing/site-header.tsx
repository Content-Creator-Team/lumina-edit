import { Link } from "@tanstack/react-router";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

import { ThemeToggle } from "@/components/theme-toggle";
import { DemoBadge } from "@/components/demo-badge";
import { Button } from "@/components/ui/button";

const LINKS = [
  { to: "/features", label: "Features" },
  { to: "/templates", label: "Templates" },
  { to: "/pricing", label: "Pricing" },
] as const;

export function BrandMark() {
  return (
    <span className="inline-flex items-center">
      <img src={logoLight} alt="REELZOY" className="h-11 w-auto rounded-md dark:hidden" />
      <img src={logoDark} alt="REELZOY" className="hidden h-10 w-auto rounded-md dark:block" />
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4"
      >
        <Link to="/" className="rounded-sm text-foreground">
          <BrandMark />
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground font-semibold" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <DemoBadge className="hidden lg:inline-flex" />
          <ThemeToggle />
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild size="sm" className="bg-brand-gradient text-primary-foreground hover:opacity-90">
            <Link to="/register">Get Started</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
