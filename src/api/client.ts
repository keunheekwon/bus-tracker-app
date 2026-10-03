import * as SecureStore from 'expo-secure-store';
import type { Tokens } from './types';

const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const accessKey = 'bus-access';
const refreshKey = 'bus-refresh';
let accessToken: string | null = null;
let refreshPromise: Promise<Tokens | null> | null = null;
let onLogout: (() => void) | null = null;

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(({ INVALID_CREDENTIALS: '로그인 정보가 올바르지 않습니다.', BUS_NOT_ASSIGNED: '할당된 버스가 없습니다.', SESSION_ALREADY_RUNNING: '이미 운행 중입니다.', SESSION_NOT_RUNNING: '운행 중인 세션이 없습니다.', LOCATION_INVALID: 'GPS 정보가 유효하지 않습니다.', RATE_LIMITED: '잠시 후 다시 시도해 주세요.' } as Record<string, string>)[code] ?? (status === 0 ? '서버와 통신할 수 없습니다.' : '요청을 처리하지 못했습니다.'));
  }
}

export function setLogoutHandler(handler: () => void) { onLogout = handler; }
export async function loadAccessToken() { accessToken = await SecureStore.getItemAsync(accessKey); return accessToken; }
export async function saveTokens(tokens: Tokens) {
  await SecureStore.setItemAsync(accessKey, tokens.accessToken);
  await SecureStore.setItemAsync(refreshKey, tokens.refreshToken);
  accessToken = tokens.accessToken;
}
export async function clearTokens() {
  accessToken = null;
  await Promise.all([SecureStore.deleteItemAsync(accessKey), SecureStore.deleteItemAsync(refreshKey)]);
}
export async function getRefreshToken() { return SecureStore.getItemAsync(refreshKey); }

async function send<T>(path: string, init: RequestInit = {}, authenticated = true, retry = true): Promise<T> {
  if (!baseUrl) throw new ApiError(0, 'CONFIG');
  try {
    const token = authenticated ? accessToken ?? await loadAccessToken() : null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let response: Response;
    try { response = await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal, headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } }); }
    finally { clearTimeout(timer); }
    if (response.status === 401 && authenticated && retry) {
      refreshPromise ??= (async () => {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) return null;
        try {
          const next = await send<Tokens>('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }, false, false);
          await saveTokens(next);
          return next;
        } catch { return null; }
      })().finally(() => { refreshPromise = null; });
      if (await refreshPromise) return send<T>(path, init, true, false);
      await clearTokens();
      onLogout?.();
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: { code?: string } } | null;
      throw new ApiError(response.status, body?.error?.code ?? 'UNKNOWN');
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'NETWORK');
  }
}
export const api = {
  get: <T>(path: string, authenticated = true) => send<T>(path, {}, authenticated),
  post: <T>(path: string, body?: object, authenticated = true) => send<T>(path, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) }, authenticated),
  patch: <T>(path: string, body: object) => send<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string) => send<T>(path, { method: 'PUT' }),
  delete: <T>(path: string) => send<T>(path, { method: 'DELETE' }),
};
