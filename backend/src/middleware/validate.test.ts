import { z } from 'zod'
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { parseBody, parsePath, parseQuery } from './validate'

function buildEvent(
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent {
  return {
    headers: {},
    multiValueHeaders: {},
    body: null,
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/x',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '/x',
    ...overrides,
  }
}

describe('parseBody', () => {
  const schema = z.object({ email: z.string().email() })

  it('rejects missing body', () => {
    expect(() => parseBody(buildEvent(), schema)).toThrow(/body/i)
  })

  it('rejects invalid JSON', () => {
    expect(() => parseBody(buildEvent({ body: 'not-json' }), schema)).toThrow(
      /JSON/,
    )
  })

  it('rejects zod-invalid data', () => {
    expect(() =>
      parseBody(buildEvent({ body: JSON.stringify({ email: 'nope' }) }), schema),
    ).toThrow()
  })

  it('returns the parsed data', () => {
    const parsed = parseBody(
      buildEvent({ body: JSON.stringify({ email: 'a@b.co' }) }),
      schema,
    )
    expect(parsed.email).toBe('a@b.co')
  })
})

describe('parsePath / parseQuery', () => {
  it('parsePath validates path params', () => {
    const ev = buildEvent({ pathParameters: { id: '42' } })
    const schema = z.object({ id: z.coerce.number() })
    expect(parsePath(ev, schema).id).toBe(42)
  })

  it('parseQuery validates query params', () => {
    const ev = buildEvent({ queryStringParameters: { limit: '10' } })
    const schema = z.object({ limit: z.coerce.number().int().max(100) })
    expect(parseQuery(ev, schema).limit).toBe(10)
  })
})
