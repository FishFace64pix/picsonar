// RFC-5322-ish pragmatic regex. Accept common formats, reject obvious garbage.
const EMAIL_RE =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}$/

export function isEmail(input: string): boolean {
  return typeof input === 'string' && EMAIL_RE.test(input.trim())
}

/** Alias used by some call sites. */
export const isValidEmail = isEmail
