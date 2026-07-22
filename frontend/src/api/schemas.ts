import { z } from 'zod';

export const userSchema = z.object({ id: z.string(), login: z.string(), name: z.string() });

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userSchema,
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const syncResponseSchema = z.object({
  syncedAt: z.string(),
  synced: z.array(z.string()),
  failed: z.array(z.object({ id: z.string(), reason: z.string() })),
});
export type SyncResponse = z.infer<typeof syncResponseSchema>;

const measurementsSchema = z.record(z.number().nullable()).nullable();

export const pullResponseSchema = z.object({
  serverTime: z.string(),
  patients: z.array(z.record(z.unknown())),
  visits: z.array(z.record(z.unknown())),
}).passthrough();
export type PullResponse = z.infer<typeof pullResponseSchema>;

export { measurementsSchema };
