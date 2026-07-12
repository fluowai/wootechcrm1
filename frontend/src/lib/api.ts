/// <reference types="vite/client" />

import { redirectToLogin } from "./navigation";

const rawApiUrl = import.meta.env.VITE_API_URL || '';
const normalizedApiUrl = rawApiUrl === 'same-origin' ? '' : rawApiUrl;
const API_URL = normalizedApiUrl;
const ACCESS_TOKEN_KEY = 'nexus_access_token';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let accessTokenMemory: string | null = sessionStorage.getItem(ACCESS_TOKEN_KEY);
let refreshFailed = false;

export function getApiBaseUrl() {
  return API_URL?.replace(/\/$/, '') || '';
}

export async function readJsonResponse<T = any>(response: Response, fallbackMessage = 'Resposta invalida da API.'): Promise<T> {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw new Error(fallbackMessage);
  }
  return response.json();
}

export async function publicApiFetch(path: string, options: RequestInit = {}) {
  const normalizedBase = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${normalizedBase}${normalizedPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    },
    credentials: 'include',
  });
}

function isAuthPath(path: string) {
  return path.includes('/api/auth/login') || path.includes('/api/auth/register') || path.includes('/api/auth/refresh') || path.includes('/api/auth/logout');
}

function isTokenExpiring(token: string | null): boolean {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    if (!payload?.exp) return false;
    return payload.exp * 1000 <= Date.now() + 60_000;
  } catch {
    return true;
  }
}

export function setAccessToken(token: string | null) {
  accessTokenMemory = token;
  if (token) {
    refreshFailed = false;
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function hasAccessToken(): boolean {
  return Boolean(accessTokenMemory || sessionStorage.getItem(ACCESS_TOKEN_KEY));
}

export function clearAuthSession() {
  setAccessToken(null);
}

function unauthorizedResponse(message = 'Sessao expirada. Faca login novamente.') {
  return new Response(JSON.stringify({ error: 'UNAUTHORIZED', message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function finishExpiredSession(message?: string) {
  refreshFailed = true;
  clearAuthSession();
  redirectToLogin();
  return unauthorizedResponse(message);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const normalizedBase = getApiBaseUrl();
    const response = await fetch(`${normalizedBase}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      clearAuthSession();
      refreshFailed = true;
      return null;
    }

    const data = await readJsonResponse(response, 'Nao foi possivel renovar a sessao.');
    if (data.token) {
      setAccessToken(data.token);
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  let token = accessTokenMemory || sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const userRole = localStorage.getItem('nexus_user_role');
  const impersonatedOrgId = localStorage.getItem('nexus_selected_client');
  const shouldUseAuth = !isAuthPath(path);

  if (shouldUseAuth && refreshFailed) {
    return finishExpiredSession();
  }

  if (shouldUseAuth && isTokenExpiring(token)) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    token = await (refreshPromise || refreshAccessToken());

    if (!token) {
      return finishExpiredSession();
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(userRole === 'SUPER_ADMIN' && impersonatedOrgId ? { 'X-Org-Id': impersonatedOrgId } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const normalizedBase = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${normalizedBase}${normalizedPath}`;

  try {
    const controller = new AbortController();
    const timeoutMs = (options as any).timeoutMs || 30000;
    const timeoutId = setTimeout(() => {
      controller.abort(new DOMException('Request timed out', 'TimeoutError'));
    }, timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401) {
      if (!path.includes('/api/auth/refresh')) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = refreshAccessToken().finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
        }

        const newToken = await (refreshPromise || refreshAccessToken());

        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          return fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });
        }

        return finishExpiredSession();
      } else {
        return finishExpiredSession();
      }
    }

    return response;
  } catch (error: any) {
    if (retries > 0 && (error.name === 'AbortError' || error.name === 'TimeoutError' || error.name === 'TypeError')) {
      return apiFetch(path, options, retries - 1);
    }

    throw error;
  }
}
