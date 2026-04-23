/**
 * PATCH /auth/profile
 *
 * Authenticated profile + billing-company update.
 * Body validated against UpdateProfileSchema — CUI, IBAN, postalCode etc.
 * all shape-checked before reaching DynamoDB.
 */
import type { APIGatewayProxyEvent } from 'aws-lambda'

import { UpdateProfileSchema } from '@picsonar/shared/schemas'
import { validateCUI } from '@picsonar/shared/validators'

import { getEnv } from '../../src/config/env'
import { withHandler } from '../../src/middleware/handler'
import { requireAuth } from '../../src/middleware/auth'
import { parseBody } from '../../src/middleware/validate'
import { updateItem } from '../../src/utils/dynamodb'
import { ValidationError } from '../../src/utils/errors'
import { successResponse } from '../../src/utils/response'

export const handler = withHandler(async (event: APIGatewayProxyEvent, ctx) => {
  const jwt = requireAuth(event)
  const env = getEnv()

  const input = parseBody(event, UpdateProfileSchema)

  // Deep-check the CUI checksum. Zod only validates the shape.
  if (input.companyDetails?.cui) {
    const cuiResult = validateCUI(input.companyDetails.cui)
    if (!cuiResult.valid) {
      throw new ValidationError(
        cuiResult.error ?? 'Invalid Romanian CUI (checksum mismatch)',
      )
    }
    // Store the normalized digits-only form.
    input.companyDetails.cui = cuiResult.normalized
    input.companyDetails.hasROPrefix = cuiResult.hasROPrefix
  }

  // Build a dynamic SET expression — only update supplied fields.
  const sets: string[] = []
  const values: Record<string, unknown> = {}
  const names: Record<string, string> = {}

  if (input.name !== undefined) {
    sets.push('#name = :name')
    names['#name'] = 'name'
    values[':name'] = input.name
  }
  if (input.phone !== undefined) {
    sets.push('phone = :phone')
    values[':phone'] = input.phone
  }
  if (input.companyDetails !== undefined) {
    sets.push('companyDetails = :cd')
    values[':cd'] = input.companyDetails
  }

  sets.push('updatedAt = :updatedAt')
  values[':updatedAt'] = new Date().toISOString()

  if (sets.length === 1) {
    throw new ValidationError('Nothing to update')
  }

  await updateItem(
    env.USERS_TABLE,
    { userId: jwt.userId },
    `SET ${sets.join(', ')}`,
    values,
    Object.keys(names).length > 0 ? names : undefined,
  )

  return successResponse(
    { message: 'Profile updated successfully' },
    200,
    { requestOrigin: ctx.requestOrigin },
  )
})
