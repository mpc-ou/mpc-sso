import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JWK } from 'jose';
import type { AppConfig } from '../config/config';
import { getPublicKeyJwk } from '../lib/jwt';

@Injectable()
export class DiscoveryService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  getOpenIdConfiguration() {
    const issuer = this.configService.get('issuer', { infer: true });
    return {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      end_session_endpoint: `${issuer}/logout`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['ES256'],
      scopes_supported: ['openid', 'profile', 'email'],
      token_endpoint_auth_methods_supported: [
        'client_secret_post',
        'client_secret_basic',
      ],
      claims_supported: ['sub', 'email', 'name', 'role', 'nonce'],
      code_challenge_methods_supported: ['S256'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
    };
  }

  async getJwks(): Promise<{ keys: JWK[] }> {
    const publicKey = this.configService.get('jwtPublicKey', { infer: true });
    const jwk = await getPublicKeyJwk(publicKey);
    return { keys: [jwk] };
  }
}
