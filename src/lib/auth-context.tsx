import { useNavigate, useRouter } from "@tanstack/react-router";
import { usePostHog } from "posthog-js/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { endSession, getSession, refreshSession, type SessionPayload } from "./auth.functions";
import {
  registerRefreshHandler,
  registerUnauthorizedHandler,
  setAccessToken,
} from "./auth-store";
import type { SessionUser } from "./keycloak.server";
import { isDemoMode } from "./runtime-config";
import { DEMO_USER } from "./demo/fixtures";

const DEMO_SESSION_KEY = "cutroom.demo_session";

function demoSession(): SessionPayload {
  return {
    user: { ...DEMO_USER },
    accessToken: "demo-session",
    expiresAt: Date.now() + 12 * 60 * 60 * 1000,
  };
}

type AuthContextValue = {
  user: SessionUser | null;
  isDemo: boolean;
  status: "loading" | "authenticated" | "unauthenticated";
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  logout: () => Promise<void>;
  applySession: (session: SessionPayload) => void;
  startDemoSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_MARGIN_MS = 60_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const identifiedUserRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const router = useRouter();
  const posthog = usePostHog();

  const applySession = useCallback((next: SessionPayload | null) => {
    const user = next?.user;
    if (!user && identifiedUserRef.current) {
      posthog.reset();
      identifiedUserRef.current = null;
    } else if (user && identifiedUserRef.current !== user.sub) {
      if (identifiedUserRef.current) posthog.reset();
      posthog.identify(user.sub, {
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        organization: user.org ?? undefined,
        roles: user.roles,
      });
      identifiedUserRef.current = user.sub;
    }

    setSession(next);
    setAccessToken(next?.accessToken ?? null, next?.expiresAt ?? 0);
    setStatus(next ? "authenticated" : "unauthenticated");
  }, [posthog]);

  const doRefresh = useCallback(async () => {
    const next = await refreshSession().catch(() => null);
    applySession(next);
    return next?.accessToken ?? null;
  }, [applySession]);

  // Initial session hydration from the httpOnly cookie.
  useEffect(() => {
    let cancelled = false;
    if (isDemoMode()) {
      // Demo session is local-only (no cookies).
      const active = sessionStorage.getItem(DEMO_SESSION_KEY) === "active";
      applySession(active ? demoSession() : null);
      return;
    }
    (async () => {
      let next = await getSession().catch(() => null);
      if (!next) next = await refreshSession().catch(() => null);
      if (!cancelled) applySession(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  // Silent refresh shortly before expiry.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!session) return;
    const delay = Math.max(5_000, session.expiresAt - Date.now() - REFRESH_MARGIN_MS);
    timerRef.current = setTimeout(() => void doRefresh(), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [session, doRefresh]);

  useEffect(() => {
    registerRefreshHandler(doRefresh);
    registerUnauthorizedHandler(() => {
      applySession(null);
      navigate({
        to: "/login",
        search: {
          redirect: window.location.pathname.startsWith("/login")
            ? "/dashboard"
            : window.location.pathname,
        },
        replace: true,
      });
    });
    return () => {
      registerRefreshHandler(null);
      registerUnauthorizedHandler(null);
    };
  }, [doRefresh, applySession, navigate]);

  const logout = useCallback(async () => {
    posthog.capture("user_logged_out");
    posthog.reset();
    identifiedUserRef.current = null;
    if (isDemoMode()) {
      sessionStorage.removeItem(DEMO_SESSION_KEY);
      applySession(null);
      router.invalidate();
      navigate({ to: "/", replace: true });
      return;
    }
    await endSession().catch(() => undefined);
    applySession(null);
    router.invalidate();
    navigate({ to: "/login", replace: true });
  }, [applySession, navigate, posthog, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isDemo: isDemoMode(),
      status,
      isAuthenticated: status === "authenticated",
      hasRole: (role: string) => Boolean(session?.user.roles.includes(role)),
      logout,
      applySession: (next: SessionPayload) => applySession(next),
      startDemoSession: () => {
        sessionStorage.setItem(DEMO_SESSION_KEY, "active");
        applySession(demoSession());
      },
    }),
    [session, status, logout, applySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
