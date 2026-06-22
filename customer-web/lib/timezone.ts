const TZ = 'Asia/Karachi';

/** Current date in Pakistan (YYYY-MM-DD) */
export function pkDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

/** Current Date object adjusted to Pakistan local time */
export function pkNow(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value);
  return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
}

/** Current hour (0-23) in Pakistan */
export function pkHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date())
  );
}
