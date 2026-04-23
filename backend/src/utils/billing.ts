/**
 * Billing data normalization and export utilities.
 *
 * All data collected from Stripe Checkout flows passes through these helpers
 * before being written to DynamoDB. The goal is a single, accountant-ready
 * table where every row has consistent types regardless of which country or
 * VAT scheme the customer used.
 */
import { randomBytes } from 'crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BillingRecord {
  /** Internal invoice reference: PS-YYYYMMDD-XXXXXXXX */
  invoiceId: string
  /** Stripe Checkout Session ID — primary key on the DynamoDB table */
  stripeSessionId: string
  /** Underlying PaymentIntent ID (null if session not yet paid) */
  stripePaymentIntentId: string | null
  /** ISO date YYYY-MM-DD */
  date: string
  /** YYYY-MM — GSI partition key used for monthly export queries */
  dateYearMonth: string
  /** Integer minor units (bani for RON, cents for EUR) */
  amountMinor: number
  /** ISO 4217 currency code, uppercased (RON, EUR, …) */
  currency: string
  /** B2B when a valid VAT ID is present, B2C otherwise */
  customerType: 'B2B' | 'B2C'
  /** Cardholder name as entered on Stripe Checkout */
  fullName: string
  email: string
  /** Company name from the custom_fields[company_name] field.
   *  Falls back to fullName when the customer skipped it. */
  companyName: string
  /** Normalised VAT ID with country prefix, e.g. RO12345678. Null if B2C. */
  vatId: string | null
  /** True when the VAT ID passes our format regex; false when stored "as-is" */
  vatIdVerified: boolean
  /** ISO-2 country code derived from Stripe billing address */
  country: string
  /** Full postal address formatted as a single string */
  fullAddress: string
  /** PicSonar user ID — null only if webhook arrived with corrupt metadata */
  userId: string | null
  /** Package purchased (starter, studio, agency, extra_event) */
  packageId: string | null
  quantity: number
  createdAt: number
}

// ---------------------------------------------------------------------------
// Invoice ID
// ---------------------------------------------------------------------------

/**
 * Generates a human-readable, unique invoice reference.
 * Format: PS-YYYYMMDD-XXXXXXXX  (PS = PicSonar, 8 hex chars for uniqueness)
 * Not strictly sequential — sequential counters require distributed locking.
 * Your accountant needs unique, date-sorted IDs; they don't need gaps of 1.
 */
export function generateInvoiceId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const suffix = randomBytes(4).toString('hex').toUpperCase()
  return `PS-${date}-${suffix}`
}

// ---------------------------------------------------------------------------
// Country normalisation
// ---------------------------------------------------------------------------

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  Romania: 'RO',
  Germany: 'DE',
  France: 'FR',
  Italy: 'IT',
  Spain: 'ES',
  Netherlands: 'NL',
  Belgium: 'BE',
  Austria: 'AT',
  Poland: 'PL',
  Hungary: 'HU',
  'Czech Republic': 'CZ',
  Bulgaria: 'BG',
  'United Kingdom': 'GB',
  'United States': 'US',
  'United States of America': 'US',
}

/**
 * Returns a 2-letter ISO country code.
 * Stripe sends 2-letter codes on billing addresses, but full names can appear
 * in tax_id objects, so we handle both.
 */
export function normalizeCountry(country: string | null | undefined): string {
  if (!country) return 'RO'
  const trimmed = country.trim()
  if (trimmed.length === 2) return trimmed.toUpperCase()
  return COUNTRY_NAME_TO_ISO[trimmed] ?? trimmed.slice(0, 2).toUpperCase()
}

// ---------------------------------------------------------------------------
// VAT ID normalisation
// ---------------------------------------------------------------------------

/**
 * Basic format patterns per country.
 * These cover the most common EU VAT formats. Unrecognised countries are
 * stored with vatIdVerified=false so the accountant can double-check.
 */
const VAT_PATTERNS: Record<string, RegExp> = {
  RO: /^RO\d{2,10}$/,
  DE: /^DE\d{9}$/,
  FR: /^FR[A-Z0-9]{2}\d{9}$/,
  IT: /^IT\d{11}$/,
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
  GB: /^GB(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
  PL: /^PL\d{10}$/,
  NL: /^NL\d{9}B\d{2}$/,
  BE: /^BE0\d{9}$/,
  AT: /^ATU\d{8}$/,
  HU: /^HU\d{8}$/,
  CZ: /^CZ\d{8,10}$/,
  BG: /^BG\d{9,10}$/,
}

/**
 * Normalises a raw VAT ID string:
 * 1. Strips whitespace / dashes / dots
 * 2. Uppercases
 * 3. Prepends the country code if missing
 * 4. Validates against a known format regex
 *
 * Returns the cleaned VAT ID even when unverified — the accountant decides
 * what to do with an invalid format, not us.
 */
export function normalizeVatId(
  rawVatId: string,
  country: string,
): { vatId: string; vatIdVerified: boolean } {
  let cleaned = rawVatId.replace(/[\s\-\.]/g, '').toUpperCase()

  const prefix = country.toUpperCase()
  if (!cleaned.startsWith(prefix)) {
    cleaned = prefix + cleaned
  }

  const pattern = VAT_PATTERNS[prefix]
  const vatIdVerified = pattern ? pattern.test(cleaned) : false

  return { vatId: cleaned, vatIdVerified }
}

// ---------------------------------------------------------------------------
// Address formatting
// ---------------------------------------------------------------------------

export function formatAddress(address: {
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
}): string {
  return [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ]
    .filter(Boolean)
    .join(', ')
}

// ---------------------------------------------------------------------------
// Stripe Checkout custom fields helper
// ---------------------------------------------------------------------------

export function getCustomFieldValue(
  customFields:
    | Array<{ key: string; text?: { value?: string | null } }>
    | null
    | undefined,
  key: string,
): string | null {
  if (!Array.isArray(customFields)) return null
  const field = customFields.find((f) => f.key === key)
  return field?.text?.value ?? null
}

// ---------------------------------------------------------------------------
// CSV / JSON export
// ---------------------------------------------------------------------------

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Wrap in quotes if the value contains a comma, quote, or newline
  if (/[,"\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

const CSV_COLUMNS = [
  'Date',
  'Invoice ID',
  'Company Name',
  'VAT ID',
  'VAT Verified',
  'Customer Type',
  'Name',
  'Email',
  'Country',
  'Address',
  'Amount (RON)',
  'Currency',
  'Package',
] as const

export function recordsToCsv(records: BillingRecord[]): string {
  const header = CSV_COLUMNS.join(',')

  const rows = records.map((r) =>
    [
      r.date,
      r.invoiceId,
      r.companyName,
      r.vatId ?? '',
      r.vatIdVerified ? 'YES' : 'NO',
      r.customerType,
      r.fullName,
      r.email,
      r.country,
      r.fullAddress,
      (r.amountMinor / 100).toFixed(2),
      r.currency,
      r.packageId ?? '',
    ]
      .map(escapeCSV)
      .join(','),
  )

  // Use CRLF line endings — Excel on Windows expects this in CSV files
  return [header, ...rows].join('\r\n')
}

export function recordsToJson(records: BillingRecord[]): object[] {
  return records.map((r) => ({
    date: r.date,
    invoiceId: r.invoiceId,
    companyName: r.companyName,
    vatId: r.vatId,
    vatIdVerified: r.vatIdVerified,
    customerType: r.customerType,
    fullName: r.fullName,
    email: r.email,
    country: r.country,
    address: r.fullAddress,
    amountRON: (r.amountMinor / 100).toFixed(2),
    currency: r.currency,
    packageId: r.packageId,
    stripeSessionId: r.stripeSessionId,
    stripePaymentIntentId: r.stripePaymentIntentId,
  }))
}
