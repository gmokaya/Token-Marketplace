/**
 * Kenyan working-day Prompt Date calculator.
 *
 * Prompt Date = trade date + 10 business days, skipping weekends and
 * a configurable list of Kenyan public holidays.
 *
 * Fixed holidays (month is 1-indexed):
 *   1/1   New Year's Day
 *   5/1   Labour Day
 *   6/1   Madaraka Day
 *   10/10 Huduma Day
 *   10/20 Mashujaa Day
 *   12/12 Jamhuri Day
 *   12/25 Christmas Day
 *   12/26 Boxing Day
 *
 * Variable holidays (Easter-based):
 *   Good Friday (Easter - 2 days)
 *   Easter Monday (Easter + 1 day)
 *
 * Returns a date string in YYYY-MM-DD format.
 */

// ── Easter computation (Computus algorithm) ───────────────────────────────────
function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

// ── Holiday set builder ───────────────────────────────────────────────────────
function buildHolidaySet(year: number): Set<string> {
  const holidays = new Set<string>();

  const fixed: [number, number][] = [
    [1, 1],   // New Year's Day
    [5, 1],   // Labour Day
    [6, 1],   // Madaraka Day
    [10, 10], // Huduma Day
    [10, 20], // Mashujaa Day
    [12, 12], // Jamhuri Day
    [12, 25], // Christmas Day
    [12, 26], // Boxing Day
  ];

  for (const [month, day] of fixed) {
    holidays.add(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }

  const easter = easterDate(year);
  const goodFriday = new Date(easter);
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  const easterMonday = new Date(easter);
  easterMonday.setUTCDate(easterMonday.getUTCDate() + 1);

  holidays.add(goodFriday.toISOString().slice(0, 10));
  holidays.add(easterMonday.toISOString().slice(0, 10));

  return holidays;
}

// Cache holiday sets by year to avoid recomputing on every call
const holidayCache = new Map<number, Set<string>>();

function isHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  if (!holidayCache.has(year)) {
    holidayCache.set(year, buildHolidaySet(year));
  }
  return holidayCache.get(year)!.has(date.toISOString().slice(0, 10));
}

function isWeekend(date: Date): boolean {
  const dow = date.getUTCDay(); // 0=Sun, 6=Sat
  return dow === 0 || dow === 6;
}

function isWorkingDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the Prompt Date as a YYYY-MM-DD string.
 * @param fromDate The trade/settlement date (defaults to today if not provided).
 * @param workingDays Number of working days to add (default 10).
 */
export function calcPromptDate(fromDate: Date = new Date(), workingDays = 10): string {
  const cursor = new Date(Date.UTC(
    fromDate.getUTCFullYear(),
    fromDate.getUTCMonth(),
    fromDate.getUTCDate(),
  ));

  let added = 0;
  while (added < workingDays) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (isWorkingDay(cursor)) added++;
  }

  return cursor.toISOString().slice(0, 10);
}
