// Date helpers for the Stay Tools. All dates are plain calendar days ('YYYY-MM-DD'),
// handled in UTC so time zones and DST never shift a deadline by a day.

const DAY = 86_400_000;

export function parseISODate(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 ? date : null;
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Today's calendar date in the visitor's own time zone, as a UTC-midnight Date. */
export function today(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

export const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * DAY);
export const diffDays = (a: Date, b: Date): number => Math.round((a.getTime() - b.getTime()) / DAY);

/** "14 Jan 2027" — unambiguous across locales. */
export function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
export function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function plural(n: number, word: string): string {
  return `${n.toLocaleString('en-US')} ${word}${Math.abs(n) === 1 ? '' : 's'}`;
}

// ---------------------------------------------------------------------------
// iCalendar (.ics) export — generated entirely in the browser.
// ---------------------------------------------------------------------------
export type IcsEvent = {
  date: Date;           // all-day event on this date
  title: string;
  description?: string;
  alarmsDaysBefore?: number[];
};

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const icsDay = (d: Date) => toISODate(d).replace(/-/g, '');

/** Fold lines at 75 octets as RFC 5545 asks. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function buildIcs(events: IcsEvent[], calName: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//longstay-th//Stay Tools//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(calName)}`,
  ];
  events.forEach((e, i) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${icsDay(e.date)}-${i}-${Math.random().toString(36).slice(2, 10)}@longstay-th`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDay(e.date)}`,
      `DTEND;VALUE=DATE:${icsDay(addDays(e.date, 1))}`,
      `SUMMARY:${icsEscape(e.title)}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
    for (const days of e.alarmsDaysBefore ?? []) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(e.title)}`, `TRIGGER:-P${days}D`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadFile(filename: string, content: string, type = 'text/calendar;charset=utf-8'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Escape text for safe insertion into innerHTML. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
