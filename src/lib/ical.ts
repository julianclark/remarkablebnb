export interface IcalEvent {
  uid: string;
  start: string; // YYYY-MM-DD, inclusive
  end: string;   // YYYY-MM-DD, exclusive (iCal DTEND convention)
}

function unfold(text: string): string {
  // RFC 5545: a line starting with a space or tab continues the previous line
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function toIsoDate(value: string): string {
  const digits = value.slice(0, 8);
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function parseIcal(text: string): IcalEvent[] {
  const lines = unfold(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const events: IcalEvent[] = [];
  let current: Partial<IcalEvent> | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current?.start && current?.end) {
        events.push({ uid: current.uid ?? '', start: current.start, end: current.end });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 1);
    const name = key.split(';')[0];

    if (name === 'DTSTART') current.start = toIsoDate(value);
    else if (name === 'DTEND') current.end = toIsoDate(value);
    else if (name === 'UID') current.uid = value;
  }

  return events;
}
