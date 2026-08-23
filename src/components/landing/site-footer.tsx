import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-cinema-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-lg text-cinema-ink">Cutroom</p>
          <p className="mt-1 text-sm text-cinema-muted">
            AI-assisted video editing for teams who still care about the cut.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <a
            href="#journey"
            className="rounded-sm text-cinema-muted transition-colors hover:text-cinema-ink focus-visible:ring-2 focus-visible:ring-cinema-ember focus-visible:outline-none"
          >
            The journey
          </a>
          <Link
            to="/login"
            className="rounded-sm text-cinema-ink underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-cinema-ember focus-visible:outline-none"
          >
            Log in
          </Link>
        </div>
      </div>
    </footer>
  );
}
