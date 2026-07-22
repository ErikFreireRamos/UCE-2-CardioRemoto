import { API_URL } from './config';
import { ApiError, type ApiErrorBody } from './errors';
import { useAuth } from '../features/auth/useAuth';

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // injeta Authorization (default true)
}

async function rawFetch(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw ApiError.network();
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const body: ApiErrorBody = json.error ?? { code: 'ERROR', message: 'Erro' };
    throw new ApiError(res.status, body);
  }
  return json as T;
}

/** Tenta rotacionar o refresh token uma vez (raw, sem recursão pelo apiFetch). */
async function tryRefresh(): Promise<boolean> {
  const { refreshToken, updateTokens, clear } = useAuth.getState();
  if (!refreshToken) return false;
  const res = await rawFetch('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false }, null);
  if (!res.ok) {
    clear();
    return false;
  }
  const json = await res.json();
  updateTokens(json.accessToken, json.refreshToken);
  return true;
}

/** Cliente HTTP central: injeta Bearer, trata 401 (refresh 1x) e mapeia erros. */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let token = useAuth.getState().accessToken;
  let res = await rawFetch(path, opts, token);

  if (res.status === 401 && opts.auth !== false) {
    const ok = await tryRefresh();
    if (ok) {
      token = useAuth.getState().accessToken;
      res = await rawFetch(path, opts, token);
    }
  }
  return parse<T>(res);
}
