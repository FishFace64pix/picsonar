import type { APIGatewayProxyEvent } from 'aws-lambda'
import type { z, ZodTypeAny } from 'zod'
import { ValidationError } from '../utils/errors'

function parseJson<T = unknown>(raw: string | null): T {
  if (!raw) throw new ValidationError('Request body is required')
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new ValidationError('Invalid JSON body')
  }
}

/** Validate the JSON body against a zod schema. Throws ValidationError on failure. */
export function parseBody<S extends ZodTypeAny>(
  event: APIGatewayProxyEvent,
  schema: S,
): z.infer<S> {
  const json = parseJson(event.body)
  const result = schema.safeParse(json)
  if (!result.success) {
    throw new ValidationError('Invalid request body', result.error.flatten())
  }
  return result.data
}

/** Validate path parameters. */
export function parsePath<S extends ZodTypeAny>(
  event: APIGatewayProxyEvent,
  schema: S,
): z.infer<S> {
  const result = schema.safeParse(event.pathParameters ?? {})
  if (!result.success) {
    throw new ValidationError('Invalid path parameters', result.error.flatten())
  }
  return result.data
}

/** Validate query string. */
export function parseQuery<S extends ZodTypeAny>(
  event: APIGatewayProxyEvent,
  schema: S,
): z.infer<S> {
  const result = schema.safeParse(event.queryStringParameters ?? {})
  if (!result.success) {
    throw new ValidationError('Invalid query parameters', result.error.flatten())
  }
  return result.data
}
