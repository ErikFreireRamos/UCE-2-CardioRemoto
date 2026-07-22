import { z } from 'zod';

/** Validação das variáveis de ambiente (fail-fast no boot). */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_ACCESS_SECRET: z.string().min(8, 'JWT_ACCESS_SECRET muito curto'),
  JWT_REFRESH_SECRET: z.string().min(8, 'JWT_REFRESH_SECRET muito curto'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(1),
});

export type Env = z.infer<typeof EnvSchema> & { corsOrigins: string[] };

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${issues}`);
  }
  const corsOrigins = parsed.data.CORS_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  cached = { ...parsed.data, corsOrigins };
  return cached;
}
