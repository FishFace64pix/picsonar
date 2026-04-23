import { hashPassword, verifyPassword, isLegacySha256Hash } from './password'

describe('password', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple')
    expect(hash).not.toEqual('correct-horse-battery-staple')
    expect(hash.startsWith('$2')).toBe(true)
    await expect(
      verifyPassword('correct-horse-battery-staple', hash),
    ).resolves.toBe(true)
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false)
  })

  it('rejects short passwords at hash time', async () => {
    await expect(hashPassword('short')).rejects.toThrow()
  })

  it('returns false for verifyPassword on empty input', async () => {
    await expect(verifyPassword('', 'anything')).resolves.toBe(false)
    await expect(verifyPassword('pw', '')).resolves.toBe(false)
  })

  it('detects legacy SHA-256 hex', () => {
    expect(isLegacySha256Hash('a'.repeat(64))).toBe(true)
    expect(isLegacySha256Hash('0123456789abcdef'.repeat(4))).toBe(true)
    expect(isLegacySha256Hash('$2b$12$abcdef')).toBe(false)
    expect(isLegacySha256Hash('')).toBe(false)
  })
})
