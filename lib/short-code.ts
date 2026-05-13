import { randomBytes } from "node:crypto";

// Crockford base32 alphabet (no I, L, O, U → no homoglyph confusion).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const SHORT_CODE_LENGTH = 10;

/**
 * Generates a non-sequential, URL-safe short code of {@link SHORT_CODE_LENGTH}
 * characters using a Crockford-style base32 alphabet (≈50 bits of entropy).
 * Suitable for printing on a 1.5" sticker.
 */
export function generateShortCode(length: number = SHORT_CODE_LENGTH): string {
  if (length < 4 || length > 32) throw new Error("invalid short code length");
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

const SHORT_CODE_REGEX = new RegExp(`^[${ALPHABET}]{4,32}$`);

export function isValidShortCode(s: string): boolean {
  return SHORT_CODE_REGEX.test(s);
}

export function normalizeShortCode(s: string): string {
  return s
    .toUpperCase()
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
    .replace(/U/g, "V")
    .replace(/[^0-9A-Z]/g, "");
}
