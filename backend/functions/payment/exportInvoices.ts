/**
 * GET /exports/invoices?month=YYYY-MM[&format=csv|json]
 *
 * Admin-only endpoint. Queries the billing_records table for a given calendar
 * month and returns all records as CSV (default) or JSON.
 *
 * The CSV is ready to hand to your accountant: every row maps to one completed
 * Stripe Checkout session with normalised VAT ID, country code, and address.
 *
 * Usage:
 *   GET /exports/invoices?month=2025-04          → CSV download
 *   GET /exports/invoices?month=2025-04&format=json → JSON array
 *
 * DynamoDB access pattern:
 *   Query dateYearMonth-index (GSI) with dateYearMonth = '2025-04'
 *   Sorted by createdAt (SK) ascending.
 */
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda'
import { verifyAuthHeader } from '../../src/utils/jwt'
import { errorResponse } from '../../src/utils/response'
import { queryItems } from '../../src/utils/dynamodb'
import { recordsToCsv, recordsToJson, type BillingRecord } from '../../src/utils/billing'
import { getEnv } from '../../src/config/env'

const BILLING_RECORDS_TABLE = process.env.BILLING_RECORDS_TABLE || ''

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  // ---- Auth: admin only --------------------------------------------------
  const authHeader =
    event.headers.Authorization || event.headers.authorization
  if (!authHeader) return errorResponse('Authorization required', 401)

  const payload = verifyAuthHeader(authHeader)
  if (!payload || payload.role !== 'admin') {
    return errorResponse('Admin access required', 403)
  }

  // ---- Input validation --------------------------------------------------
  const month = event.queryStringParameters?.month
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return errorResponse(
      'month parameter required in YYYY-MM format (e.g. ?month=2025-04)',
      400,
    )
  }

  const format =
    (event.queryStringParameters?.format ?? 'csv').toLowerCase()
  if (format !== 'csv' && format !== 'json') {
    return errorResponse('format must be "csv" or "json"', 400)
  }

  if (!BILLING_RECORDS_TABLE) {
    return errorResponse('Billing records table not configured', 503)
  }

  // ---- Query billing records for the month ------------------------------
  let records: BillingRecord[]
  try {
    records = (await queryItems(
      BILLING_RECORDS_TABLE,
      'dateYearMonth = :m',
      { ':m': month },
      'dateYearMonth-index',
    )) as BillingRecord[]
  } catch (err: any) {
    console.error('[exportInvoices] DynamoDB query failed:', err)
    return errorResponse('Failed to query billing records', 500)
  }

  // Sort by date ascending (GSI SK is createdAt; this ensures deterministic
  // order independent of DynamoDB pagination order).
  records.sort((a, b) => a.createdAt - b.createdAt)

  const allowed = getEnv().ALLOWED_ORIGINS
  const requestOrigin = event.headers.origin ?? event.headers.Origin ?? ''
  const origin =
    requestOrigin && allowed.includes(requestOrigin)
      ? requestOrigin
      : allowed[0] ?? 'https://picsonar.com'

  const corsBase = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  }

  // ---- Return CSV or JSON -----------------------------------------------
  if (format === 'json') {
    return {
      statusCode: 200,
      headers: { ...corsBase, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month,
        count: records.length,
        records: recordsToJson(records),
      }),
    }
  }

  // CSV — send as a downloadable attachment (Excel-compatible CRLF line endings)
  const csv = recordsToCsv(records)
  const filename = `picsonar-invoices-${month}.csv`

  return {
    statusCode: 200,
    headers: {
      ...corsBase,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
    body: csv,
  }
}
