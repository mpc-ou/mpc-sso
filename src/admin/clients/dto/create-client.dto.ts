import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({ require_tld: false }, { each: true })
  redirectUris!: string[];

  @IsOptional()
  @IsString()
  allowedScopes?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;
}
