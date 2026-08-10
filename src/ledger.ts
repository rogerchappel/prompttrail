import { constants as fsConstants } from 'node:fs';
import { access, appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { PromptTrailError } from './errors.js';
import { createEvent, parseEvent, type EventInput } from './event.js';
import { resolveTrailPaths, type TrailPaths } from './paths.js';
import type { DoctorResult, PromptTrailEvent, PromptTrailEventType } from './types.js';

export async function initLedger(root?: string): Promise<TrailPaths> {
  const paths = resolveTrailPaths(root);
  await mkdir(paths.trailDir, { recursive: true });

  if (!(await pathExists(paths.ledgerPath))) {
    await writeFile(paths.ledgerPath, '', { encoding: 'utf8', flag: 'wx' });
  }

  return paths;
}

export async function appendEvent(input: EventInput, root?: string): Promise<PromptTrailEvent> {
  const paths = await initLedger(root);
  const event = createEvent(input);
  await appendFile(paths.ledgerPath, JSON.stringify(event) + '\n', 'utf8');
  return event;
}

export type ListOptions = {
  root?: string;
  type?: PromptTrailEventType;
  limit?: number;
  since?: string;
  until?: string;
};

export async function readEvents(options: ListOptions = {}): Promise<PromptTrailEvent[]> {
  const since = parseInstant(options.since, '--since');
  const until = parseInstant(options.until, '--until');
  if (since !== undefined && until !== undefined && since > until) {
    throw new PromptTrailError('--since must be earlier than or equal to --until.');
  }

  const paths = resolveTrailPaths(options.root);
  if (!(await pathExists(paths.ledgerPath))) return [];

  const content = await readFile(paths.ledgerPath, 'utf8');
  const events = content
    .split('\n')
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => Boolean(line.trim()))
    .map(({ line, lineNumber }) => {
      try {
        return parseEvent(line);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown parse error';
        throw new PromptTrailError('invalid event at line ' + lineNumber + ': ' + message);
      }
    })
    .filter((event) => !options.type || event.type === options.type)
    .filter((event) => since === undefined || Date.parse(event.timestamp) >= since)
    .filter((event) => until === undefined || Date.parse(event.timestamp) <= until);

  const limit = options.limit && options.limit > 0 ? options.limit : undefined;
  return limit ? events.slice(-limit) : events;
}

function parseInstant(value: string | undefined, flag: '--since' | '--until'): number | undefined {
  if (value === undefined) return undefined;

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) throw invalidInstant(flag);

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

  if (!valid || !Number.isFinite(instant)) throw invalidInstant(flag);
  return instant;
}

function invalidInstant(flag: '--since' | '--until'): PromptTrailError {
  return new PromptTrailError(flag + ' must be a valid ISO-8601 instant with a timezone (for example, 2026-05-17T00:00:00Z).');
}

export async function doctor(root?: string): Promise<DoctorResult> {
  const paths = resolveTrailPaths(root);
  const exists = await pathExists(paths.ledgerPath);
  const result: DoctorResult = {
    ok: true,
    root: paths.root,
    trailDir: paths.trailDir,
    ledgerPath: paths.ledgerPath,
    exists,
    events: 0,
    invalidLines: []
  };

  if (!exists) return { ...result, ok: false };

  const content = await readFile(paths.ledgerPath, 'utf8');
  content.split('\n').forEach((line, index) => {
    if (!line.trim()) return;
    try {
      parseEvent(line);
      result.events += 1;
    } catch (error) {
      result.invalidLines.push({
        line: index + 1,
        error: error instanceof Error ? error.message : 'unknown parse error'
      });
    }
  });

  result.ok = result.invalidLines.length === 0;
  return result;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}
