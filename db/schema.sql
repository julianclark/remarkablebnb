-- Schema for Cloudflare D1 Database - Remarkable BnB

CREATE TABLE IF NOT EXISTS stays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,            -- Unique random slug (e.g., 'x9f2k1')
  room TEXT NOT NULL,                   -- 'two-bedroom-unit' | 'guest-room'
  source TEXT NOT NULL,                 -- 'airbnb' | 'direct' | 'repeat'
  check_in TEXT NOT NULL,               -- ISO Date string YYYY-MM-DD
  check_out TEXT NOT NULL,              -- ISO Date string YYYY-MM-DD
  hot_tub_offered INTEGER DEFAULT 0,    -- Boolean (0 = false, 1 = true)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_stays_token ON stays (token);

-- Cached availability blocks pulled from Airbnb iCal feeds
CREATE TABLE IF NOT EXISTS ical_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room TEXT NOT NULL,               -- 'two-bedroom-unit' | 'guest-room'
  start_date TEXT NOT NULL,         -- ISO date YYYY-MM-DD, inclusive
  end_date TEXT NOT NULL,           -- ISO date YYYY-MM-DD, exclusive (iCal DTEND convention)
  uid TEXT,                         -- iCal UID, for reference/debugging
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ical_events_room ON ical_events (room);

-- Tracks last successful poll per room, so the UI can show staleness / errors
CREATE TABLE IF NOT EXISTS ical_sync_log (
  room TEXT PRIMARY KEY,
  last_synced_at DATETIME,
  last_error TEXT,
  event_count INTEGER DEFAULT 0
);

-- Guest enquiries submitted via the contact form. Persisted first so an
-- enquiry is never lost even if the notification email fails to send.
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  stay TEXT,
  dates TEXT,
  message TEXT NOT NULL,
  emailed INTEGER DEFAULT 0,       -- 1 once the notification email was sent
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
