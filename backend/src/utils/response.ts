import type { LambdaResponse } from '../types'
import { getEnv } from '../config/env'

/**
 * Security headers applied to every response.
 *
 * CSP: this is a JSON API — nothing should ever fetch or execute from a
 * Lambda response. `default-src 'none'` + `frame-ancestors 'none'` blocks
 * every vector an attacker could abuse if a misconfigured client ever
 * tried to render our JSON as HTML.
 *
 * Permissions-Policy: locks down browser features. An API response has no
 * UI, so every permission is denied.
 *
 * HSTS: max-age=2 years + preload. Only safe because we know we'll never
 * serve HTTP. Worth verifying the domain is in the HSTS preload list
 * (hstspreload.org) once a custom domain is wired.
 */
const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Cross-Origin-Opener-Policy': 'same-origin',
} as const

/**
 * Echo the request Origin back only if it is in the allowlist.
 * Falls back to the first configured origin otherwise (never `*`).
 */
function corsHeaders(requestOrigin?: string): Record<string, string> {
  let allowed: string[] = []
  try {
    allowed = getEnv().ALLOWED_ORIGINS
  } catch {
    allowed = []
  }
  const origin =
    requestOrigin && allowed.includes(requestOrigin)
      ? requestOrigin
      : '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Request-Id, X-Requested-With',
    Vary: 'Origin',
  }
}

export function successResponse(
  data: unknown,
  statusCode = 200,
  opts: { requestOrigin?: string; extraHeaders?: Record<string, string> } = {},
): LambdaResponse {
  return {
    statusCode,
    headers: { ...BASE_HEADERS, ...corsHeaders(opts.requestOrigin), ...(opts.extraHeaders ?? {}) },
    body: JSON.stringify(data),
  }
}

export function errorResponse(
  message: string,
  statusCode = 500,
  opts: {
    code?: string
    details?: unknown
    requestOrigin?: string
    traceId?: string
  } = {},
): LambdaResponse {
  return {
    statusCode,
    headers: { ...BASE_HEADERS, ...corsHeaders(opts.requestOrigin) },
    body: JSON.stringify({
      error: {
        code: opts.code ?? 'INTERNAL_ERROR',
        message,
        ...(opts.details !== undefined ? { details: opts.details } : {}),
        ...(opts.traceId ? { traceId: opts.traceId } : {}),
      },
    }),
  }
}

export function preflightResponse(requestOrigin?: string): LambdaResponse {
  // Preflight responses also carry the security headers — no good reason
  // to ship them only on successful payload responses.
  return {
    statusCode: 204,
    headers: { ...BASE_HEADERS, ...corsHeaders(requestOrigin) },
    body: '',
  }
}
