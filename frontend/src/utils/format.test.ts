import { describe, it, expect } from 'vitest'

// Simple utility to test
const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ro-RO', {
        style: 'currency',
        currency: currency,
    }).format(amount / 100)
}

describe('Utility: formatCurrency', () => {
    it('formats RON correctly', () => {
        expect(formatCurrency(1000, 'RON')).toBe('10,00\u00A0RON')
    })

    it('formats EUR correctly', () => {
        const result = formatCurrency(550, 'EUR')
        expect(result).toMatch(/5[,.]50/)
        expect(result).toMatch(/€|EUR/)
    })
})
