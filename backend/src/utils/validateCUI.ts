/**
 * Romanian CUI (Tax ID) Validation Utility
 * Implements Romanian checksum algorithm for CUI/CIF validation
 * 
 * This utility can be used on both frontend and backend for consistent validation.
 */

export interface CUIValidationResult {
    valid: boolean;
    normalized: string; // digits only, without RO prefix
    hasROPrefix: boolean;
    error?: string;
}

/**
 * Validates Romanian CUI using official checksum algorithm
 * 
 * Algorithm:
 * - Weights: [7, 5, 3, 2, 1, 7, 5, 3, 2] (right-aligned to body digits)
 * - Sum = sum(bodyDigits[i] * weights[offset+i])
 * - Control = (Sum * 10) % 11
 * - If control === 10, then control = 0
 * - Control must match last digit (check digit)
 * 
 * @param input - CUI string (may include "RO" prefix, spaces)
 * @returns CUIValidationResult with validation status and normalized value
 */
export function validateCUI(input: string): CUIValidationResult {
    // Weights for checksum calculation
    const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];

    // Normalize input: trim, uppercase, remove spaces
    let normalized = input.trim().toUpperCase().replace(/\s+/g, '');

    // Check for RO prefix
    const hasROPrefix = normalized.startsWith('RO');
    if (hasROPrefix) {
        normalized = normalized.substring(2);
    }

    // Validation 1: Must contain only digits after removing RO
    if (!/^\d+$/.test(normalized)) {
        return {
            valid: false,
            normalized: '',
            hasROPrefix,
            error: 'CUI must contain only digits'
        };
    }

    // Validation 2: Length must be 2-10 digits
    if (normalized.length < 2 || normalized.length > 10) {
        return {
            valid: false,
            normalized: '',
            hasROPrefix,
            error: 'CUI must be between 2 and 10 digits'
        };
    }

    // Extract body (all digits except last) and check digit (last digit)
    const body = normalized.slice(0, -1);
    const checkDigit = parseInt(normalized.slice(-1), 10);

    // Calculate control digit using checksum algorithm
    const weightsOffset = weights.length - body.length;
    let sum = 0;

    for (let i = 0; i < body.length; i++) {
        const digit = parseInt(body[i], 10);
        const weight = weights[weightsOffset + i];
        sum += digit * weight;
    }

    let control = (sum * 10) % 11;
    if (control === 10) {
        control = 0;
    }

    // Validation 3: Check digit must match control digit
    if (control !== checkDigit) {
        return {
            valid: false,
            normalized,
            hasROPrefix,
            error: 'Invalid CUI: checksum validation failed'
        };
    }

    return {
        valid: true,
        normalized,
        hasROPrefix,
        error: undefined
    };
}

/**
 * Example test cases for validation
 */
export const CUI_TEST_CASES = {
    // Valid CUIs - these are example valid CUIs based on the algorithm
    valid: [
        'RO18547290',
        '18547290',
        'RO 1854729 0', // with spaces
        'ro18547290', // lowercase
        '24736200', // another valid example
    ],
    // Invalid CUIs
    invalid: [
        'RO18547291', // wrong check digit
        '123', // too short
        '12345678901', // too long
        'ROABC123', // non-numeric
        '', // empty
        '12345677', // wrong checksum
    ]
};
