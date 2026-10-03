import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, Loader2, LogIn } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { loginWithPassword, verifyMfa, type MfaChallenge } from "@/lib/auth.functions";
import { isDemoMode } from "@/lib/runtime-config";

const TITLE = "Log in — Cutroom";
const DESCRIPTION = "Sign in to Cutroom to upload footage and review AI edit plans.";

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
  const { applySession, startDemoSession } = useAuth();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const demo = isDemoMode();
  const dest = redirect && redirect.startsWith("/") ? redirect : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mfaChallenge, setMfaChallenge] = useState<MfaChallenge | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (demo) {
      startDemoSession();
      posthog.capture("user_logged_in", { method: "demo" });
      navigate({ to: dest, replace: true });
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await loginWithPassword({ data: { email, password, remember_me: false } });
      if ("mfa_required" in result) {
        setMfaChallenge(result);
      } else {
        applySession(result);
        posthog.capture("user_logged_in", { method: "password" });
        navigate({ to: dest, replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaChallenge) return;
    setError(null);
    setLoading(true);
    try {
      const session = await verifyMfa({ data: { session_token: mfaChallenge.session_token, code: mfaCode } });
      applySession(session);
      posthog.capture("user_logged_in", { method: "mfa" });
      navigate({ to: dest, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code. Try again.");
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
            {mfaChallenge ? "Enter your authenticator code to continue." : "Sign in to your account."}
          </p>
        </div>

        {mfaChallenge ? (
          <form onSubmit={handleMfa} className="mt-8 space-y-4">
            <div>
              <label htmlFor="mfa-code" className="mb-1.5 block text-sm font-medium">
                Authenticator code
              </label>
              <Input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\s/g, ""))}
                maxLength={8}
                autoFocus
                required
              />
              <p className="mt-1.5 text-xs text-cinema-muted">
                Open your authenticator app, or use a recovery code.
              </p>
            </div>

            {error && <p role="alert" className="text-xs text-cinema-ember">{error}</p>}

            <Button
              type="submit"
              disabled={loading || mfaCode.length < 6}
              className="w-full bg-cinema-ember text-cinema-void hover:bg-cinema-ember/90"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              {loading ? "Verifying…" : "Verify"}
            </Button>

            <button
              type="button"
              onClick={() => { setMfaChallenge(null); setError(null); setMfaCode(""); }}
              className="w-full text-center text-xs text-cinema-muted hover:text-foreground"
            >
              ← Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
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

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Link to="/forgot-password" className="text-xs text-cinema-muted hover:text-foreground">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••••"
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

            {error && <p role="alert" className="text-xs text-cinema-ember">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cinema-ember text-cinema-void hover:bg-cinema-ember/90"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {loading ? "Signing in…" : demo ? "Enter demo workspace" : "Sign in"}
            </Button>

            <p className="text-center text-xs text-cinema-muted">
              No account?{" "}
              <Link to="/register" className="text-foreground hover:underline">
                Create one
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
