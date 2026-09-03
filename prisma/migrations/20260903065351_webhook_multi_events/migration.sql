-- Add the new array column, backfill it from the old scalar column
-- (renaming the now-removed "profile.updated" event to "member.changed"
-- so existing webhooks keep firing after the event model merge), then
-- drop the old column.
ALTER TABLE "webhooks" ADD COLUMN "events" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "webhooks"
SET "events" = ARRAY[
  CASE WHEN "event" = 'profile.updated' THEN 'member.changed' ELSE "event" END
];

ALTER TABLE "webhooks" ALTER COLUMN "events" DROP DEFAULT;
ALTER TABLE "webhooks" DROP COLUMN "event";

DROP INDEX IF EXISTS "webhooks_event_idx";
CREATE INDEX "webhooks_events_idx" ON "webhooks"("events");
