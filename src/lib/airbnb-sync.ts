import { parseIcal } from './ical';

interface SyncEnv {
  DB: D1Database;
  AIRBNB_ICAL_TWO_BEDROOM_UNIT?: string;
  AIRBNB_ICAL_GUEST_ROOM?: string;
}

const FEEDS: Array<{ room: string; envKey: keyof SyncEnv }> = [
  { room: 'two-bedroom-unit', envKey: 'AIRBNB_ICAL_TWO_BEDROOM_UNIT' },
  { room: 'guest-room', envKey: 'AIRBNB_ICAL_GUEST_ROOM' },
];

async function syncRoom(room: string, url: string, db: D1Database): Promise<void> {
  const res = await fetch(url, { headers: { 'User-Agent': 'RemarkableBnB-Sync/1.0' } });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }

  const events = parseIcal(await res.text());

  await db.batch([
    db.prepare('DELETE FROM ical_events WHERE room = ?').bind(room),
    ...events.map((e) =>
      db
        .prepare('INSERT INTO ical_events (room, start_date, end_date, uid) VALUES (?, ?, ?, ?)')
        .bind(room, e.start, e.end, e.uid)
    ),
    db
      .prepare(
        `INSERT INTO ical_sync_log (room, last_synced_at, last_error, event_count)
         VALUES (?, CURRENT_TIMESTAMP, NULL, ?)
         ON CONFLICT(room) DO UPDATE SET last_synced_at = CURRENT_TIMESTAMP, last_error = NULL, event_count = excluded.event_count`
      )
      .bind(room, events.length),
  ]);

  console.log(`Synced ${events.length} events for ${room}`);
}

export async function syncAirbnbCalendars(env: SyncEnv): Promise<void> {
  for (const feed of FEEDS) {
    const url = env[feed.envKey];
    if (!url) {
      console.warn(`No iCal URL configured for ${feed.room} (${feed.envKey}), skipping`);
      continue;
    }

    try {
      await syncRoom(feed.room, url, env.DB);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`iCal sync failed for ${feed.room}:`, message);
      await env.DB.prepare(
        `INSERT INTO ical_sync_log (room, last_error)
         VALUES (?, ?)
         ON CONFLICT(room) DO UPDATE SET last_error = excluded.last_error`
      )
        .bind(feed.room, message)
        .run()
        .catch(() => {});
    }
  }
}
