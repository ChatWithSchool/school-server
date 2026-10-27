/**
 * Dates without a time of day (attendance day, event start) are stored as 'YYYY-MM-DD' strings.
 * A Date would carry a time zone: midnight in Israel is still the previous day in UTC.
 */
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** The local calendar day of a Date, as 'YYYY-MM-DD'. */
export function toDateOnly(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
