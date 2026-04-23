/**
 * Fail-fast environment validation.
 * Any required env missing at cold start → Lambda crashes with a loud error
 * instead of silently using insecure defaults.
 */
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  AWS_REGION: z.string().default('eu-central-1'),
  STAGE: z.string().default('dev'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),

  // DynamoDB tables
  USERS_TABLE: z.string().min(1),
  EVENTS_TABLE: z.string().min(1),
  PHOTOS_TABLE: z.string().min(1),
  FACES_TABLE: z.string().min(1),
  ORDERS_TABLE: z.string().min(1),
  BILLING_RECORDS_TABLE: z.string().min(1).optional(),
  AUDIT_LOGS_TABLE: z.string().min(1).optional(),
  SYSTEM_STATS_TABLE: z.string().min(1).optional(),
  RATE_LIMITS_TABLE: z.string().min(1).optional(),
  REVOKED_TOKENS_TABLE: z.string().min(1).optional(),

  // S3
  RAW_PHOTOS_BUCKET: z.string().min(1),
  FACE_INDEX_BUCKET: z.string().min(1),
  QR_CODES_BUCKET: z.string().min(1).optional(),
  INVOICES_BUCKET: z.string().min(1).optional(),

  // Rekognition
  REKOGNITION_COLLECTION_ID: z.string().min(1),

  // Stripe — sole payment rail. All Netopia / Oblio integration was removed
  // in favour of Stripe + an accountant who handles monthly ANAF e-Factura
  // submission from the Stripe payout export.
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  // Email
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  EMAIL_FROM_NAME: z.string().default('PicSonar'),

  // CORS
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),

  // Frontend
  FRONTEND_URL: z.string().url().default('https://picsonar.com'),

  // Misc
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(15 * 1024 * 1024),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    // Flatten for readable CloudWatch output.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n` +
        `Fix your deployment secrets and redeploy.`,
    )
  }
  cached = parsed.data
  return cached
}

/** Test helper — clear cache between tests. */
export function __resetEnvCache() {
  cached = null
}
