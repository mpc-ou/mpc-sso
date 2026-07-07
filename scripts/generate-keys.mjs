// Generates an ES256 (P-256) key pair for signing OIDC id_tokens.
// Usage: pnpm keys:generate
import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;

const keyPair = await subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify'],
);

const privateJwk = await subtle.exportKey('jwk', keyPair.privateKey);
const publicJwk = await subtle.exportKey('jwk', keyPair.publicKey);

console.log('=== JWT_PRIVATE_KEY ===');
console.log(JSON.stringify(privateJwk));
console.log('');
console.log('=== JWT_PUBLIC_KEY ===');
console.log(JSON.stringify(publicJwk));
console.log('');
console.log('Paste both values (as single-line JSON strings) into your .env file.');
