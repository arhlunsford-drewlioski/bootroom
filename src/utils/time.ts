const DEFAULT_PRACTICE_DURATION = 90;

export function computeEndTime(startTime: string, durationMinutes?: number): string {
  const mins = durationMinutes ?? DEFAULT_PRACTICE_DURATION;
  const [h, m] = startTime.split(':').map(Number);
  const totalMins = h * 60 + m + mins;
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function getWeekDates(referenceDate: Date): Date[] {
  const day = referenceDate.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function getWeekLabel(referenceDate: Date): string {
  const dates = getWeekDates(referenceDate);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(dates[0])} – ${fmt(dates[6])}, ${dates[6].getFullYear()}`;
}

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isToday(dateStr: string): boolean {
  return dateStr === toDateStr(new Date());
}

export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** Convert "HH:mm" 24-hour string to "h:mm AM/PM" display string */
export function to12Hour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Convert 12-hour parts to "HH:mm" 24-hour string for storage */
export function to24Hour(hour: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour;
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
