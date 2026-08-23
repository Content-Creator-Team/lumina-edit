import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { exchangeCode } from "@/lib/auth.functions";
import { consumeOAuthState, consumePkceVerifier } from "@/lib/keycloak-login";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in — Cutroom" },
      { name: "description", content: "Completing your Cutroom single sign-on." },
      { property: "og:title", content: "Signing you in — Cutroom" },
      { property: "og:description", content: "Completing your Cutroom single sign-on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const providerError = params.get("error_description") ?? params.get("error");
      if (providerError) {
        setError(providerError);
        return;
      }

      const code = params.get("code");
      const state = params.get("state");
      const expectedState = consumeOAuthState();
      const codeVerifier = consumePkceVerifier();

      if (!code || !codeVerifier) {
        setError("This sign-in link is incomplete or has already been used. Start again.");
        return;
      }
      if (expectedState && state !== expectedState) {
        setError("The sign-in response failed its security check. Please start again.");
        return;
      }

      try {
        const session = await exchangeCode({
          data: {
            code,
            codeVerifier,
            redirectUri: `${window.location.origin}/auth/callback`,
          },
        });
        applySession(session);
        const returnTo = params.get("return_to");
        navigate({
          to: returnTo && returnTo.startsWith("/") ? returnTo : "/dashboard",
          replace: true,
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Sign-in could not be completed.");
      }
    })();
  }, [applySession, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        {error ? (
          <>
            <AlertTriangle className="mx-auto size-6 text-destructive" aria-hidden="true" />
            <h1 className="mt-4 text-lg font-medium text-foreground">Sign-in didn't complete</h1>
            <p role="alert" className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {error}
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/login", replace: true })}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <p role="status" className="mt-4 text-sm text-muted-foreground">
              Completing sign-in…
            </p>
          </>
        )}
      </div>
    </main>
  );
}
