import { type JWK, SignJWT, exportJWK, importJWK } from 'jose';

export const JWT_KEY_ID = 'mpclub-sso-key-1';

export interface IdTokenClaims {
  sub: string;
  aud: string;
  nonce?: string;
  email?: string;
  name: string;
  role: string;
}

export async function importPrivateKey(jwkJson: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkJson) as JWK;
  return importJWK(jwk, 'ES256') as Promise<CryptoKey>;
}

export async function importPublicKey(jwkJson: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkJson) as JWK;
  return importJWK(jwk, 'ES256') as Promise<CryptoKey>;
}

/** Signs an OIDC id_token (ES256, 1h expiry) */
export async function signIdToken(
  claims: IdTokenClaims,
  issuer: string,
  privateKeyJwk: string,
): Promise<string> {
  const privateKey = await importPrivateKey(privateKeyJwk);

  const payload: Record<string, unknown> = {
    name: claims.name,
    role: claims.role,
  };
  if (claims.email) payload.email = claims.email;
  if (claims.nonce) payload.nonce = claims.nonce;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', kid: JWT_KEY_ID })
    .setIssuer(issuer)
    .setSubject(claims.sub)
    .setAudience(claims.aud)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
}

/** Exports the public key as a JWKS-compatible JWK (with kid) for /.well-known/jwks.json */
export async function getPublicKeyJwk(publicKeyJwk: string): Promise<JWK> {
  const key = await importPublicKey(publicKeyJwk);
  const jwk = await exportJWK(key);
  jwk.use = 'sig';
  jwk.alg = 'ES256';
  jwk.kid = JWT_KEY_ID;
  return jwk;
}
