import { IsIn, IsUrl } from 'class-validator';
import { PUBLIC_EVENTS } from '../../../events/events.service';

export class CreateWebhookDto {
  @IsIn(PUBLIC_EVENTS)
  event!: string;

  @IsUrl({ require_tld: false })
  url!: string;
}
