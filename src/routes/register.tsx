import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerUser } from "@/lib/auth.functions";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): { invite?: string } =>
    typeof search["invite"] === "string" ? { invite: search["invite"] } : {},
  head: () => ({
    meta: [
      { title: "Create account — Cutroom" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { invite } = Route.useSearch();
  const navigate = useNavigate();
  const posthog = usePostHog();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function validate() {
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
      const result = await registerUser({
        data: {
          email,
          password,
          confirm_password: confirmPassword,
          full_name: fullName || undefined,
          invitation_token: invite || undefined,
        },
      });
      posthog.capture("account_registered", { invited: Boolean(invite) });
      setDone(result.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
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
          <p className="mt-2 text-sm text-cinema-muted">Create your account.</p>
        </div>

        {done ? (
          <div className="mt-8 rounded-lg border border-border bg-background/60 p-6 text-center">
            <p className="font-medium">Check your inbox</p>
            <p className="mt-2 text-sm text-cinema-muted">
              We sent a verification link to <strong>{done}</strong>. Click it to activate your account.
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
              <label htmlFor="full-name" className="mb-1.5 block text-sm font-medium">
                Full name <span className="text-cinema-muted">(optional)</span>
              </label>
              <Input
                id="full-name"
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>

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
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min 10 chars, 1 uppercase, 1 digit"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter password"
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
              {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              {loading ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-center text-xs text-cinema-muted">
              Already have an account?{" "}
              <Link to="/login" className="text-foreground hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
