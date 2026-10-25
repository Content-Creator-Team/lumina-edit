import { AuthShell } from "@/components/auth/auth-shell";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { verifyEmailToken } from "@/lib/auth.functions";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>): { token?: string } =>
    typeof search["token"] === "string" ? { token: search["token"] } : {},
  head: () => ({
    meta: [{ title: "Verify email — REELZOY" }, { name: "robots", content: "noindex" }],
  }),
  component: VerifyEmailPage,
});

// Module-level so remounts (StrictMode, hydration, route reloads) reuse the
// same request: the token is single-use, so a second POST would fail with 400.
const verifications = new Map<string, Promise<void>>();

function verifyOnce(token: string) {
  let p = verifications.get(token);
  if (!p) {
    p = verifyEmailToken({ data: { token } });
    verifications.set(token, p);
  }
  return p;
}

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const started = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setStatus("error");
      setErrorMsg("No verification token found. Check your email link.");
      return;
    }
    verifyOnce(token)
      .then(() => setStatus("success"))
      .catch((err: unknown) => {
        // Success is final: never downgrade a verified state to an error.
        setStatus((current) => (current === "success" ? current : "error"));
        setErrorMsg(
          err instanceof Error ? err.message : "Verification failed. The link may have expired.",
        );
      });
  }, [token]);

  return (
    <AuthShell subtitle="Confirming your email address.">
      <div className="auth-body text-center">
        {status === "loading" && (
          <div className="mt-8">
            <Loader2 className="mx-auto size-6 animate-spin text-cinema-muted" />
            <p className="mt-3 text-sm text-cinema-muted">Verifying your email…</p>
          </div>
        )}

        {status === "success" && (
          <div className="auth-pop mt-8">
            <CheckCircle2 className="auth-pop mx-auto size-8 text-green-500" />
            <p className="mt-3 font-medium">Email verified!</p>
            <p className="mt-1 text-sm text-cinema-muted">
              Your account is active. You can now sign in.
            </p>
            <Button
              className="mt-6 w-full bg-cinema-ember text-cinema-void hover:bg-cinema-ember/90"
              onClick={() => navigate({ to: "/login", replace: true })}
            >
              Sign in
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="mt-8">
            <XCircle className="mx-auto size-8 text-cinema-ember" />
            <p className="mt-3 font-medium">Verification failed</p>
            <p role="alert" className="mt-1 text-sm text-cinema-muted">
              {errorMsg}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                className="w-full bg-cinema-ember text-cinema-void hover:bg-cinema-ember/90"
                onClick={() => navigate({ to: "/login", replace: true })}
              >
                Back to sign in
              </Button>
              <Link to="/login" className="text-xs text-cinema-muted hover:text-foreground">
                Need a new link? Sign in and request resend.
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
