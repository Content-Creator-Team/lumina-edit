import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/lib/auth.functions";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string } =>
    typeof search["token"] === "string" ? { token: search["token"] } : {},
  head: () => ({
    meta: [
      { title: "Reset password — Cutroom" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const posthog = usePostHog();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function validate() {
    if (!token) return "This reset link is invalid or expired.";
    if (password.length < 10) return "Password must be at least 10 characters.";
    if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain a digit.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setLoading(true);
    try {
      await resetPassword({ data: { token: token!, password, confirm_password: confirmPassword } });
      posthog.capture("password_reset_completed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
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
            {done ? "Password updated." : "Choose a new password."}
          </p>
        </div>

        {done ? (
          <div className="mt-8 rounded-lg border border-border bg-background/60 p-6 text-center">
            <Lock className="mx-auto size-8 text-green-500" />
            <p className="mt-3 font-medium">Password reset successfully</p>
            <p className="mt-1 text-sm text-cinema-muted">
              Your password has been updated. All other sessions have been signed out.
            </p>
            <Button
              className="mt-5 w-full bg-cinema-ember text-cinema-void hover:bg-cinema-ember/90"
              onClick={() => navigate({ to: "/login", replace: true })}
            >
              Sign in
            </Button>
          </div>
        ) : !token ? (
          <div className="mt-8 text-center">
            <p className="text-sm text-cinema-muted">This reset link is invalid or has already been used.</p>
            <Link to="/forgot-password" className="mt-4 inline-block text-sm text-foreground hover:underline">
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">New password</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min 10 chars, 1 uppercase, 1 digit"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cinema-muted hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium">
                Confirm new password
              </label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <p role="alert" className="text-xs text-cinema-ember">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cinema-ember text-cinema-void hover:bg-cinema-ember/90"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              {loading ? "Saving…" : "Set new password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
