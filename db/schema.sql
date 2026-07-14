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
