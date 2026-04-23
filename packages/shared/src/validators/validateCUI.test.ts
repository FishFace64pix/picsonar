import { describe, it, expect } from 'vitest'
import { validateCUI } from './validateCUI'

describe('validateCUI', () => {
  it('accepts valid CUIs with and without RO prefix', () => {
    for (const cui of ['RO18547290', '18547290', 'ro 1854729 0', '24736200']) {
      const r = validateCUI(cui)
      expect(r.valid, `expected ${cui} valid: ${r.error}`).toBe(true)
    }
  })

  it('rejects bad checksum', () => {
    expect(validateCUI('RO18547291').valid).toBe(false)
    expect(validateCUI('12345677').valid).toBe(false)
  })

  it('rejects wrong length or non-digits', () => {
    expect(validateCUI('123').valid).toBe(false)
    expect(validateCUI('12345678901').valid).toBe(false)
    expect(validateCUI('ROABC123').valid).toBe(false)
    expect(validateCUI('').valid).toBe(false)
  })
})
