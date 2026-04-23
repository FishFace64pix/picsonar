/**
 * Domain types — re-exported from @picsonar/shared.
 * Any new entity should be added to packages/shared/src/types.
 */
export * from '@picsonar/shared/types'

// Lambda-specific types (stay here, not useful on frontend)
export interface LambdaResponse {
  statusCode: number
  headers: Record<string, string | number | boolean>
  body: string
  isBase64Encoded?: boolean
}
