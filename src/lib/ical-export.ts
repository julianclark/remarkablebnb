export interface OutboundEvent {
  uid: string;
  start: string; // YYYY-MM-DD, inclusive
  end: string;   // YYYY-MM-DD, exclusive
  summary: string;
}

function toIcalDate(date: string): string {
  return date.replace(/-/g, '');
}

export function buildIcal(calendarName: string, events: OutboundEvent[]): string {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Remarkable BnB//Direct Bookings//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${calendarName}`,
  ];

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toIcalDate(event.start)}`,
      `DTEND;VALUE=DATE:${toIcalDate(event.end)}`,
      `SUMMARY:${event.summary}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
