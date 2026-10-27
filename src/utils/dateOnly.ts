/**
 * Dates without a time of day (attendance day, event start) are stored as 'YYYY-MM-DD' strings.
 * A Date would carry a time zone: midnight in Israel is still the previous day in UTC.
 */
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/; // the shape only: zod checks that the day exists

/** The school's time zone. A server in a UTC container still needs Israel's "today". */
export const SCHOOL_TIME_ZONE = 'Asia/Jerusalem';

// 'en-CA' formats a date as YYYY-MM-DD
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SCHOOL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar day of an instant in the school's time zone, as 'YYYY-MM-DD'. */
export function toDateOnly(d: Date): string {
  return formatter.format(d);
}

// Arithmetic on day strings is done in UTC, where every day has exactly 24 hours.
const parse = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/** The day `n` days after `day` (or before, when `n` is negative). */
export function addDays(day: string, n: number): string {
  const d = parse(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(day: string): number {
  return parse(day).getUTCDay();
}
