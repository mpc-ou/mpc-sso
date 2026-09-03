import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'node:crypto';

export function generateId(byteLength = 16): string {
  return randomBytes(byteLength).toString('base64url');
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function base64urlSha256(input: string): string {
  return createHash('sha256').update(input).digest('base64url');
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function verifyPkceS256(
  codeVerifier: string,
  storedChallenge: string,
): boolean {
  return base64urlSha256(codeVerifier) === storedChallenge;
}

export function hmacSha256Hex(secret: string, message: string): string {
  return createHmac('sha256', secret).update(message).digest('hex');
}

export function encryptSecret(plaintext: string, masterKey: string): string {
  const key = createHash('sha256').update(masterKey).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64url');
}

export function decryptSecret(ciphertext: string, masterKey: string): string {
  const key = createHash('sha256').update(masterKey).digest();
  const raw = Buffer.from(ciphertext, 'base64url');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  );
}
