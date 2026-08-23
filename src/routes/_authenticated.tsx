import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { Film, LayoutGrid, Loader2, LogOut, Settings, UploadCloud } from "lucide-react";
import { useEffect, useRef } from "react";

import { DemoBadge } from "@/components/demo-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Videos", icon: LayoutGrid },
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthenticatedLayout() {
  const { status, user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Captured once so a redirect never records the login route itself.
  const initialPath = useRef(
    typeof window === "undefined" ? pathname : window.location.pathname,
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate({ to: "/login", search: { redirect: initialPath.current }, replace: true });
    }
  }, [status, navigate]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {status === "loading" ? "Checking your session…" : "Redirecting to sign in…"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-[family-name:var(--font-body)] text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-6 py-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Film className="size-5 text-primary" aria-hidden="true" strokeWidth={1.75} />
            <span className="font-[family-name:var(--font-display)] text-lg">Cutroom</span>
          </Link>

          <DemoBadge className="hidden lg:inline-flex" />

          <nav aria-label="Primary" className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" aria-hidden="true" strokeWidth={1.75} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground md:inline">
              {user?.name ?? user?.email}
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void logout()}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
