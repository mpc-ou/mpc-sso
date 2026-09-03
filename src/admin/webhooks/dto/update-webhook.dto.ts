import { IsBoolean, IsOptional, IsUrl } from 'class-validator';

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
