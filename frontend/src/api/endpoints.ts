import { apiFetch } from './client';
import { authTokensSchema, pullResponseSchema, syncResponseSchema, type AuthTokens, type PullResponse, type SyncResponse } from './schemas';

export async function authLogin(login: string, password: string): Promise<AuthTokens> {
  const data = await apiFetch<unknown>('/auth/login', { method: 'POST', body: { login, password }, auth: false });
  return authTokensSchema.parse(data);
}

export async function authLogout(refreshToken: string): Promise<void> {
  await apiFetch<void>('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });
}

export interface SyncRecord {
  entity: 'patient' | 'visit';
  id: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

export async function syncPush(deviceId: string, records: SyncRecord[]): Promise<SyncResponse> {
  const data = await apiFetch<unknown>('/sync', { method: 'POST', body: { deviceId, records } });
  return syncResponseSchema.parse(data);
}

export async function syncPull(since?: string): Promise<PullResponse> {
  const q = since ? `?since=${encodeURIComponent(since)}` : '';
  const data = await apiFetch<unknown>(`/sync/pull${q}`);
  return pullResponseSchema.parse(data);
}
