/**
 * File validation by magic bytes — never trust the Content-Type header alone.
 * Uses the `file-type` ESM package via dynamic import so it works under CJS Lambda.
 */
import { ALLOWED_MIME_TYPES, QUOTA } from '@picsonar/shared/constants'
import { ValidationError } from './errors'

export interface FileValidationOptions {
  /** Max bytes. Defaults to QUOTA.MAX_PHOTO_BYTES. */
  maxBytes?: number
  /** Allowed MIME types. Defaults to ALLOWED_MIME_TYPES. */
  allowed?: readonly string[]
}

export async function validateImageBuffer(
  buffer: Buffer | Uint8Array,
  opts: FileValidationOptions = {},
): Promise<{ mime: string; ext: string }> {
  const maxBytes = opts.maxBytes ?? QUOTA.MAX_PHOTO_BYTES
  const allowed = opts.allowed ?? ALLOWED_MIME_TYPES

  if (!buffer || buffer.byteLength === 0) {
    throw new ValidationError('Uploaded file is empty')
  }
  if (buffer.byteLength > maxBytes) {
    throw new ValidationError(
      `File too large: ${buffer.byteLength} bytes (max ${maxBytes})`,
    )
  }

  // Dynamic import to stay compatible with CommonJS bundle.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { fileTypeFromBuffer } = (await import('file-type')) as {
    fileTypeFromBuffer: (b: Uint8Array) => Promise<{ mime: string; ext: string } | undefined>
  }
  const detected = await fileTypeFromBuffer(
    buffer instanceof Buffer ? new Uint8Array(buffer) : buffer,
  )
  if (!detected) {
    throw new ValidationError('Unable to determine file type')
  }
  if (!allowed.includes(detected.mime)) {
    throw new ValidationError(
      `Unsupported file type: ${detected.mime} (allowed: ${allowed.join(', ')})`,
    )
  }
  return { mime: detected.mime, ext: detected.ext }
}
