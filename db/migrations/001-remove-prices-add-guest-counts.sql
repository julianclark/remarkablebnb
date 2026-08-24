-- Migration: drop the mirrored Airbnb pricing, record enquiry guest counts.
--
-- schema.sql uses CREATE TABLE IF NOT EXISTS, so it will not alter a database
-- that already exists. Run this once against each environment:
--
--   npx wrangler d1 execute remarkablebnb --local  --file=db/migrations/001-remove-prices-add-guest-counts.sql
--   npx wrangler d1 execute remarkablebnb --remote --file=db/migrations/001-remove-prices-add-guest-counts.sql
--
-- Why: Airbnb's nightly figure moves with extra-guest fees, so the single
-- per-night rate we published was wrong for larger parties. The site now
-- states the direct discount as a percentage and the hosts quote each
-- enquiry by hand, which is why they need the party size.

DROP TABLE IF EXISTS prices;

ALTER TABLE enquiries ADD COLUMN adults INTEGER DEFAULT 0;
ALTER TABLE enquiries ADD COLUMN children INTEGER DEFAULT 0;
