/**
 * Wraps a Lambda handler with:
 *   - Structured error handling (AppError → proper status code)
 *   - CORS preflight handling
 *   - Correlation id propagation
 *
 * Usage:
 *   export const handler = withHandler(async (event, ctx) => {
 *     const user = requireAuth(event)
 *     const body = parseBody(event, CreateEventSchema)
 *     ...
 *     return successResponse(result, 201)
 *   })
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { errorResponse, preflightResponse } from '../utils/response'
import { isAppError, AppError } from '../utils/errors'
import { emitMetric, logger } from '../utils/logger'

export interface HandlerContext {
  traceId: string
  requestOrigin?: string
}

export type LambdaHandler = (
  event: APIGatewayProxyEvent,
  ctx: HandlerContext,
) => Promise<APIGatewayProxyResult>

export function withHandler(inner: LambdaHandler) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestOrigin = event.headers?.origin ?? event.headers?.Origin
    const traceId =
      event.requestContext?.requestId ??
      event.headers?.['x-request-id'] ??
      event.headers?.['X-Request-Id'] ??
      crypto.randomUUID()

    if (event.httpMethod === 'OPTIONS') {
      return preflightResponse(requestOrigin)
    }

    const endpoint = `${event.httpMethod} ${event.resource ?? event.path}`
    const start = Date.now()
    const log = logger.child({ traceId, endpoint })

    try {
      const result = await inner(event, { traceId, requestOrigin })
      const duration = Date.now() - start
      log.info('request.ok', { statusCode: result.statusCode, duration })
      emitMetric('RequestLatency', duration, 'Milliseconds', { endpoint })
      emitMetric('RequestCount', 1, 'Count', {
        endpoint,
        status: String(result.statusCode),
      })
      return result
    } catch (err) {
      const duration = Date.now() - start
      const response = handleError(err, { traceId, requestOrigin })
      log.warn('request.err', {
        statusCode: response.statusCode,
        duration,
        errName: (err as Error)?.name,
      })
      emitMetric('RequestLatency', duration, 'Milliseconds', { endpoint })
      emitMetric('RequestCount', 1, 'Count', {
        endpoint,
        status: String(response.statusCode),
      })
      if (response.statusCode >= 500) {
        emitMetric('UnhandledError', 1, 'Count', { endpoint })
      }
      return response
    }
  }
}

/**
 * In production, strip full Zod fieldError messages from validation failures —
 * they would reveal the API schema to attackers probing with invalid payloads.
 * Only field names are kept so frontend forms can highlight the right fields.
 * In non-production environments the full flatten() output is preserved for
 * easier debugging.
 */
function sanitizeDetails(err: AppError): unknown {
  const isProd = process.env.NODE_ENV === 'production'
  if (!isProd || err.code !== 'VALIDATION_ERROR') return err.details
  const details = err.details as { fieldErrors?: Record<string, unknown>; formErrors?: unknown[] } | undefined
  if (!details) return undefined
  return {
    fields: Object.keys(details.fieldErrors ?? {}),
  }
}

function handleError(
  err: unknown,
  ctx: HandlerContext,
): APIGatewayProxyResult {
  if (isAppError(err)) {
    // Only 5xx errors are logged noisily.
    if (err.statusCode >= 500) {
      console.error('[AppError 5xx]', {
        traceId: ctx.traceId,
        code: err.code,
        message: err.message,
        details: err.details,
      })
    } else {
      console.warn('[AppError]', JSON.stringify({
        traceId: ctx.traceId,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
        details: err.details,
      }))
    }
    return errorResponse(err.message, err.statusCode, {
      code: err.code,
      details: sanitizeDetails(err),
      requestOrigin: ctx.requestOrigin,
      traceId: ctx.traceId,
    })
  }

  // Unknown error — never leak internals to the client.
  console.error('[UnhandledError]', {
    traceId: ctx.traceId,
    name: (err as Error)?.name,
    message: (err as Error)?.message,
    stack: (err as Error)?.stack,
  })
  return errorResponse('Internal server error', 500, {
    code: 'INTERNAL_ERROR',
    requestOrigin: ctx.requestOrigin,
    traceId: ctx.traceId,
  })
}

export { AppError }
