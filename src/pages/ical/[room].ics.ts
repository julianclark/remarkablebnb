import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { buildIcal } from '../../lib/ical-export';

export const prerender = false;

const ROOM_LABELS: Record<string, string> = {
  'two-bedroom-unit': 'Remarkable BnB — Two Bedroom Unit',
  'guest-room': 'Remarkable BnB — Guest Room',
};

export const GET: APIRoute = async ({ params }) => {
  const { room } = params;

  if (!room || !(room in ROOM_LABELS)) {
    return new Response('Not Found', { status: 404 });
  }

  const { results } = await env.DB.prepare(
    `SELECT token, check_in, check_out FROM stays
     WHERE room = ? AND source != 'airbnb' AND check_out >= date('now')`
  )
    .bind(room)
    .all();

  const events = (results ?? []).map((row: any) => ({
    uid: `${row.token}@remarkablebnb.nz`,
    start: row.check_in,
    end: row.check_out,
    summary: 'Reserved — Remarkable BnB (direct)',
  }));

  const body = buildIcal(ROOM_LABELS[room], events);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${room}.ics"`,
      'Cache-Control': 'public, max-age=1800',
    },
  });
};
