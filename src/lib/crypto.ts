import { createHash, randomBytes } from 'node:crypto';

/** Random URL-safe id (used for internal identifiers, not entity PKs — Prisma cuid() covers those) */
export function generateId(byteLength = 16): string {
  return randomBytes(byteLength).toString('base64url');
}

/** Opaque bearer/refresh token (256 bits) */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Hex-encoded SHA-256 — used to store only a hash of opaque tokens in the DB */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Base64url-encoded SHA-256 — used for PKCE code_challenge comparison */
export function base64urlSha256(input: string): string {
  return createHash('sha256').update(input).digest('base64url');
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** PKCE S256: code_challenge = BASE64URL(SHA256(ASCII(code_verifier))) */
export function verifyPkceS256(
  codeVerifier: string,
  storedChallenge: string,
): boolean {
  return base64urlSha256(codeVerifier) === storedChallenge;
}
