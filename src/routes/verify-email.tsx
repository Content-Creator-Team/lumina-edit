import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { verifyEmailToken } from "@/lib/auth.functions";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>): { token?: string } =>
    typeof search["token"] === "string" ? { token: search["token"] } : {},
  head: () => ({
    meta: [
      { title: "Verify email — Cutroom" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyEmailPage,
});

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
    verifyEmailToken({ data: { token } })
      .then(() => setStatus("success"))
      .catch((err: unknown) => {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Verification failed. The link may have expired.");
      });
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cinema-void px-6 font-[family-name:var(--font-body)] text-cinema-ink">
      <div className="relative w-full max-w-sm text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(140deg, var(--primary), var(--primary-deep))" }}
        />
        <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl">Cutroom</h1>

        {status === "loading" && (
          <div className="mt-8">
            <Loader2 className="mx-auto size-6 animate-spin text-cinema-muted" />
            <p className="mt-3 text-sm text-cinema-muted">Verifying your email…</p>
          </div>
        )}

        {status === "success" && (
          <div className="mt-8">
            <CheckCircle2 className="mx-auto size-8 text-green-500" />
            <p className="mt-3 font-medium">Email verified!</p>
            <p className="mt-1 text-sm text-cinema-muted">Your account is active. You can now sign in.</p>
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
            <p role="alert" className="mt-1 text-sm text-cinema-muted">{errorMsg}</p>
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
    </main>
  );
}
