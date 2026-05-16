import { constants as fsConstants } from 'node:fs';
import { access, appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
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
  const paths = resolveTrailPaths(options.root);
  if (!(await pathExists(paths.ledgerPath))) return [];

  const content = await readFile(paths.ledgerPath, 'utf8');
  const events = content
    .split('\n')
    .filter(Boolean)
    .map((line) => parseEvent(line))
    .filter((event) => !options.type || event.type === options.type)
    .filter((event) => !options.since || event.timestamp >= options.since)
    .filter((event) => !options.until || event.timestamp <= options.until);

  const limit = options.limit && options.limit > 0 ? options.limit : undefined;
  return limit ? events.slice(-limit) : events;
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
