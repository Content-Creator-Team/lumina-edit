import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Cutroom" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset({ data: { email } });
      posthog.capture("password_reset_requested");
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cinema-void px-6 font-[family-name:var(--font-body)] text-cinema-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 0%, color-mix(in oklab, var(--tint-1) 16%, transparent), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="text-center">
          <span
            aria-hidden="true"
            className="mx-auto flex size-12 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(140deg, var(--primary), var(--primary-deep))" }}
          />
          <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl">Cutroom</h1>
          <p className="mt-2 text-sm text-cinema-muted">
            {sent ? "Email sent." : "Reset your password."}
          </p>
        </div>

        {sent ? (
          <div className="mt-8 rounded-lg border border-border bg-background/60 p-6 text-center">
            <Mail className="mx-auto size-8 text-cinema-muted" />
            <p className="mt-3 font-medium">Check your inbox</p>
            <p className="mt-1 text-sm text-cinema-muted">
              If <strong>{email}</strong> has an account, you'll receive a reset link within a few minutes.
            </p>
            <Button
              className="mt-5 w-full"
              variant="outline"
              onClick={() => navigate({ to: "/login", replace: true })}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cinema-ember text-cinema-void hover:bg-cinema-ember/90"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              {loading ? "Sending…" : "Send reset link"}
            </Button>

            <p className="text-center text-xs text-cinema-muted">
              <Link to="/login" className="text-foreground hover:underline">← Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
