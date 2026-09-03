import {
  ArrayMinSize,
  ArrayUnique,
  IsBoolean,
  IsIn,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { PUBLIC_EVENTS } from '../../../events/events.service';

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(PUBLIC_EVENTS, { each: true })
  events?: string[];
}
