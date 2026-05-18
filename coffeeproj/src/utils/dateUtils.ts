/**
 * Format date as a human-readable string for date headers
 * Returns "Сегодня", "Вчера", or formatted date
 */
export function formatDateHeader(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateStr = date.toDateString();
  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();

  if (dateStr === todayStr) {
    return 'Сегодня';
  }

  if (dateStr === yesterdayStr) {
    return 'Вчера';
  }

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: today.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString();
}

// Format a Date as a calendar-local YYYY-MM-DD string. Avoids the off-by-one
// bug from Date.toISOString(), which shifts to UTC and rolls the day back for
// any timezone east of UTC (e.g. Moscow's local midnight becomes 21:00 UTC the
// day before).
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
