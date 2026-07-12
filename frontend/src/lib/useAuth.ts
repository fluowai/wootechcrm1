import { useState, useEffect } from "react";
import { apiFetch, clearAuthSession, hasAccessToken, publicApiFetch, readJsonResponse } from "./api";
import { redirectToLogin } from "./navigation";
import type { User } from "../types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const getUnauthenticatedTarget = async () => {
      try {
        const res = await publicApiFetch("/api/domain/context");
        if (!res.ok) return "/login";
        const data = await readJsonResponse(res, "Contexto white label indisponivel.");
        if (!data.customDomain) return "/login";
        return data.whitelabelOnboarding?.complete ? "/login" : "/onboarding";
      } catch {
        return "/login";
      }
    };

    const fetchUser = async () => {
      const publicPaths = ['/login', '/verify-contact', '/onboarding', '/onboarding/whitelabel', '/onboarding/whitelabel/preview', '/site', '/vendas'];
      const isPublicPath =
        publicPaths.includes(window.location.pathname) ||
        window.location.pathname.startsWith('/meet') ||
        window.location.pathname.startsWith('/p/') ||
        window.location.pathname.startsWith('/client-portal');

      if (isPublicPath && !hasAccessToken()) {
        setAuthLoading(false);
        return;
      }

      try {
        const res = await apiFetch('/api/auth/me');
        if (!res.ok) throw new Error("Invalid session");
        const data = await res.json();
        setUser(data);
      } catch {
        setUser(null);
        clearAuthSession();
        if (!isPublicPath && window.location.pathname !== '/login') {
          redirectToLogin(await getUnauthenticatedTarget());
        }
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    clearAuthSession();
    localStorage.clear();
    setUser(null);
    redirectToLogin();
  };

  return { user, setUser, authLoading, handleLogout };
}
