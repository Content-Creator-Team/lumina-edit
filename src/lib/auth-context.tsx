import { useNavigate, useRouter } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { endSession, getSession, refreshSession, type SessionPayload } from "./auth.functions";
import {
  registerRefreshHandler,
  registerUnauthorizedHandler,
  setAccessToken,
} from "./auth-store";
import type { SessionUser } from "./keycloak.server";

type AuthContextValue = {
  user: SessionUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  logout: () => Promise<void>;
  applySession: (session: SessionPayload) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_MARGIN_MS = 60_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const router = useRouter();

  const applySession = useCallback((next: SessionPayload | null) => {
    setSession(next);
    setAccessToken(next?.accessToken ?? null, next?.expiresAt ?? 0);
    setStatus(next ? "authenticated" : "unauthenticated");
  }, []);

  const doRefresh = useCallback(async () => {
    const next = await refreshSession().catch(() => null);
    applySession(next);
    return next?.accessToken ?? null;
  }, [applySession]);

  // Initial session hydration from the httpOnly cookie.
  useEffect(() => {
    let cancelled = false;
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
      navigate({ to: "/login", search: { redirect: window.location.pathname }, replace: true });
    });
    return () => {
      registerRefreshHandler(null);
      registerUnauthorizedHandler(null);
    };
  }, [doRefresh, applySession, navigate]);

  const logout = useCallback(async () => {
    const result = await endSession({
      data: { postLogoutRedirectUri: `${window.location.origin}/` },
    }).catch(() => ({ logoutUrl: null }));
    applySession(null);
    router.invalidate();
    if (result.logoutUrl) window.location.assign(result.logoutUrl);
    else navigate({ to: "/", replace: true });
  }, [applySession, navigate, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      status,
      isAuthenticated: status === "authenticated",
      hasRole: (role: string) => Boolean(session?.user.roles.includes(role)),
      logout,
      applySession: (next: SessionPayload) => applySession(next),
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
