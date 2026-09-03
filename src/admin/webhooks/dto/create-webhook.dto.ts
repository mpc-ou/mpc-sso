import { ArrayMinSize, ArrayUnique, IsIn, IsUrl } from 'class-validator';
import { PUBLIC_EVENTS } from '../../../events/events.service';

export class CreateWebhookDto {
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(PUBLIC_EVENTS, { each: true })
  events!: string[];

  @IsUrl({ require_tld: false })
  url!: string;
}
