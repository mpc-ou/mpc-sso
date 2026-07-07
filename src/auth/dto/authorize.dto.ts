import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class AuthorizeQueryDto {
  @IsIn(['code'])
  response_type!: string;

  @IsNotEmpty()
  @IsString()
  client_id!: string;

  @IsUrl({ require_tld: false })
  redirect_uri!: string;

  @IsNotEmpty()
  @IsString()
  scope!: string;

  @IsNotEmpty()
  @IsString()
  state!: string;

  @IsNotEmpty()
  @IsString()
  code_challenge!: string;

  @IsIn(['S256'])
  code_challenge_method!: string;

  @IsOptional()
  @IsString()
  nonce?: string;
}
