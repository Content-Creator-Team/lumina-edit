import { BrandMark } from "@/components/landing/site-header";
import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  LayoutGrid,
  Loader2,
  LogOut,
  Palette,
  Scissors,
  Settings,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { DemoBadge } from "@/components/demo-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { isDemoMode } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Videos", icon: LayoutGrid },
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/trimmer", label: "Trimmer", icon: Scissors },
  { to: "/highlights", label: "Highlights", icon: Sparkles },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/brand", label: "Brand", icon: Palette },
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

  // Pointer-driven 3D tilt for every card in the app (skipped for reduced motion).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let current: HTMLElement | null = null;
    const reset = (el: HTMLElement) => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--lift", "0px");
      el.style.setProperty("--glare", "0");
    };
    const onMove = (e: PointerEvent) => {
      // Tilt only showcase cards; forms, tables and inputs stay still.
      const hit = (e.target as HTMLElement | null)?.closest?.<HTMLElement>("main .surface-card");
      const card = hit && !hit.matches("form, :has(input, textarea, select, table)") ? hit : null;
      if (current && current !== card) reset(current);
      current = card ?? null;
      if (!card) return;
      card.classList.add("tilt-3d");
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const strength = r.width > 600 ? 1.5 : 4;
      card.style.setProperty("--ry", `${(x - 0.5) * strength}deg`);
      card.style.setProperty("--rx", `${(0.5 - y) * strength}deg`);
      card.style.setProperty("--lift", "-3px");
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
      card.style.setProperty("--glare", "1");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

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
    <div className="app-ambient relative min-h-screen bg-background font-[family-name:var(--font-body)] text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-6 py-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <BrandMark />
          </Link>

          <DemoBadge className="hidden lg:inline-flex" />

          {isDemoMode() && (
            <Link
              to="/pricing"
              className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground lg:inline-flex"
              title="Demo workspace: usage limits from the pricing page aren't enforced here."
            >
              <Sparkles className="size-3 text-primary" aria-hidden="true" />
              Demo plan · unlimited credits
            </Link>
          )}

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

      <div className="app-depth" aria-hidden="true">
        <div className="app-depth-grid" />
        <span className="app-depth-orb" style={{ width: 220, height: 220, top: "12%", left: "-4%" }} />
        <span className="app-depth-orb" style={{ width: 160, height: 160, top: "58%", right: "-3%", animationDelay: "-5s" }} />
        <span className="app-depth-ring" style={{ width: 340, height: 340, top: "-8%", right: "8%" }} />
      </div>

      <main key={pathname} className="page-enter relative mx-auto w-full max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
