import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { TokenRequestDto } from './dto/token.dto';
import { TokenService, type TokenResponse } from './token.service';

function extractBasicAuthCredentials(
  authHeader?: string,
): { clientId: string; clientSecret: string } | null {
  if (!authHeader?.startsWith('Basic ')) return null;
  try {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) return null;
    return {
      clientId: decodeURIComponent(decoded.slice(0, separatorIndex)),
      clientSecret: decodeURIComponent(decoded.slice(separatorIndex + 1)),
    };
  } catch {
    return null;
  }
}

@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  exchange(
    @Body() dto: TokenRequestDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<TokenResponse> {
    const basicAuth = extractBasicAuthCredentials(authHeader);
    if (basicAuth) {
      dto.client_id ??= basicAuth.clientId;
      dto.client_secret ??= basicAuth.clientSecret;
    }
    return this.tokenService.exchange(dto);
  }
}
