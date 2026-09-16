import { IsOptional, IsString } from 'class-validator';

export class UpdateDiscordDto {
  @IsOptional()
  @IsString()
  discordId?: string | null;

  @IsOptional()
  @IsString()
  discordUsername?: string | null;
}
