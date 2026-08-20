import { PromptTrailError } from './errors.js';

export function parseIsoInstant(value: string, label: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) throw invalidInstant(label);

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = '', zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millisecond = Number(fraction.padEnd(3, '0'));
  const offsetHour = zone === 'Z' ? 0 : Number(zone.slice(1, 3));
  const offsetMinute = zone === 'Z' ? 0 : Number(zone.slice(4, 6));
  const offset = zone === 'Z' ? 0 : (zone.startsWith('+') ? 1 : -1) * (offsetHour * 60 + offsetMinute);
  const localDate = new Date(0);
  localDate.setUTCFullYear(year, month - 1, day);
  localDate.setUTCHours(hour, minute, second, millisecond);
  const localTime = localDate.getTime();
  const instant = localTime - offset * 60_000;
  const reconstructed = new Date(instant + offset * 60_000);
  const valid = month >= 1 && month <= 12
    && day >= 1 && day <= 31
    && hour <= 23
    && minute <= 59
    && second <= 59
    && offsetHour <= 23
    && offsetMinute <= 59
    && reconstructed.getUTCFullYear() === year
    && reconstructed.getUTCMonth() === month - 1
    && reconstructed.getUTCDate() === day
    && reconstructed.getUTCHours() === hour
    && reconstructed.getUTCMinutes() === minute
    && reconstructed.getUTCSeconds() === second;

  if (!valid || !Number.isFinite(instant)) throw invalidInstant(label);
  return instant;
}

function invalidInstant(label: string): PromptTrailError {
  return new PromptTrailError(label + ' must be a valid ISO-8601 instant with a timezone (for example, 2026-05-17T00:00:00Z).');
}
