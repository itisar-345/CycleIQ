/**
 * Calendar-day helpers. Timestamps are stored as UTC ISO strings, but a "day" in the app is
 * always the user's local day — a log at 01:00 in India or 21:00 in New York belongs to that
 * local date, not the UTC one. Never use `iso.split("T")[0]` or `new Date("YYYY-MM-DD")`
 * (UTC midnight) for this.
 */

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar date (YYYY-MM-DD) of a timestamp, Date, or an existing date key. */
export const localDateKey = (value: string | Date): string => {
  if (typeof value === "string" && DATE_KEY.test(value)) return value;
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Parses a date key as local midnight; full timestamps are parsed as-is. */
export const parseLocalDate = (value: string): Date => {
  if (DATE_KEY.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
};
