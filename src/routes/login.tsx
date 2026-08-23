import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogIn, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { isKeycloakConfigured } from "@/lib/keycloak-config";
import { startKeycloakLogin } from "@/lib/keycloak-login";

const TITLE = "Log in — Cutroom";
const DESCRIPTION =
  "Sign in to Cutroom with your organisation's single sign-on to upload footage and review AI edit plans.";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isKeycloakConfigured();

  useEffect(() => {
    if (isAuthenticated) {
      navigate({
        to: redirect && redirect.startsWith("/") ? redirect : "/dashboard",
        replace: true,
      });
    }
  }, [isAuthenticated, navigate, redirect]);

  async function handleLogin() {
    setError(null);
    setRedirecting(true);
    try {
      await startKeycloakLogin(redirect);
    } catch (cause) {
      setRedirecting(false);
      setError(cause instanceof Error ? cause.message : "Could not start the sign-in flow.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cinema-void px-6 font-[family-name:var(--font-body)] text-cinema-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 0%, oklch(0.32 0.07 285 / 60%), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-sm text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(140deg, var(--cinema-ember), var(--cinema-ember-deep))",
          }}
        />
        <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl">Cutroom</h1>
        <p className="mt-3 text-sm leading-relaxed text-cinema-muted">
          Sign in with your organisation account. You'll complete authentication — including any
          multi-factor step — on your identity provider.
        </p>

        <Button
          onClick={handleLogin}
          disabled={redirecting || !configured}
          size="lg"
          className="mt-8 w-full bg-cinema-ember text-cinema-void hover:bg-cinema-ember/90"
        >
          <LogIn className="size-4" aria-hidden="true" />
          {redirecting ? "Redirecting to sign-in…" : "Log in"}
        </Button>

        {!configured && (
          <p
            role="status"
            className="mt-5 flex items-start gap-2 rounded-md border border-cinema-line p-3 text-left text-xs leading-relaxed text-cinema-muted"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-cinema-ember" aria-hidden="true" />
            Single sign-on is not configured yet. Set VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM and
            VITE_KEYCLOAK_CLIENT_ID (see .env.example) to enable login.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-5 text-xs text-cinema-ember">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
