/**
 * Romanian CUI (Tax ID) validator.
 * Canonical implementation — both FE and BE import from here.
 */

export interface CUIValidationResult {
  valid: boolean
  /** Digits only, without RO prefix */
  normalized: string
  hasROPrefix: boolean
  error?: string
}

const WEIGHTS = [7, 5, 3, 2, 1, 7, 5, 3, 2] as const

export function validateCUI(input: string): CUIValidationResult {
  let normalized = input.trim().toUpperCase().replace(/\s+/g, '')
  const hasROPrefix = normalized.startsWith('RO')
  if (hasROPrefix) normalized = normalized.slice(2)

  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      normalized: '',
      hasROPrefix,
      error: 'CUI must contain only digits',
    }
  }

  if (normalized.length < 2 || normalized.length > 10) {
    return {
      valid: false,
      normalized: '',
      hasROPrefix,
      error: 'CUI must be between 2 and 10 digits',
    }
  }

  const body = normalized.slice(0, -1)
  const checkDigit = Number(normalized.slice(-1))

  const weightsOffset = WEIGHTS.length - body.length
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    sum += Number(body[i]) * (WEIGHTS[weightsOffset + i] ?? 0)
  }

  let control = (sum * 10) % 11
  if (control === 10) control = 0

  if (control !== checkDigit) {
    return {
      valid: false,
      normalized,
      hasROPrefix,
      error: 'Invalid CUI: checksum failed',
    }
  }

  return { valid: true, normalized, hasROPrefix }
}
