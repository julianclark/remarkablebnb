export interface DateRange {
  start: string; // YYYY-MM-DD, inclusive
  end: string;   // YYYY-MM-DD, exclusive
}

export interface CalendarDay {
  date: string;
  day: number;
  booked: boolean;
  isPast: boolean;
  inMonth: boolean;
}

export interface CalendarMonth {
  label: string;
  weeks: CalendarDay[][];
}

function isBooked(date: string, ranges: DateRange[]): boolean {
  return ranges.some((r) => date >= r.start && date < r.end);
}

const EMPTY_DAY: CalendarDay = { date: '', day: 0, booked: false, isPast: false, inMonth: false };

export function buildMonth(
  year: number,
  month: number,
  ranges: DateRange[],
  todayIso: string
): CalendarMonth {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const label = first.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  // Monday-first week (0 = Monday .. 6 = Sunday)
  const firstWeekday = (first.getUTCDay() + 6) % 7;

  const days: CalendarDay[] = [];
  for (let i = 0; i < firstWeekday; i++) days.push(EMPTY_DAY);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      date,
      day: d,
      booked: isBooked(date, ranges),
      isPast: date < todayIso,
      inMonth: true,
    });
  }

  while (days.length % 7 !== 0) days.push(EMPTY_DAY);

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return { label, weeks };
}

export function buildMonths(monthsToShow: number, ranges: DateRange[], now: Date): CalendarMonth[] {
  const todayIso = now.toISOString().slice(0, 10);
  const startYear = now.getUTCFullYear();
  const startMonth = now.getUTCMonth();

  return Array.from({ length: monthsToShow }, (_, i) => {
    const total = startMonth + i;
    const year = startYear + Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12;
    return buildMonth(year, month, ranges, todayIso);
  });
}
