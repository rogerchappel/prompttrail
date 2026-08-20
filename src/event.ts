import crypto from 'node:crypto';
import { PromptTrailError } from './errors.js';
import { parseIsoInstant } from './instant.js';
import { redactText } from './redact.js';
import { isEventType, isStatus, type PromptTrailEvent, type PromptTrailEventType, type PromptTrailStatus } from './types.js';

export type EventInput = {
  type?: string;
  summary?: string;
  message?: string;
  tool?: string;
  status?: string;
  cwd?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  now?: Date;
};

export function createEvent(input: EventInput): PromptTrailEvent {
  const type = parseEventType(input.type ?? 'note');
  const summary = cleanRequired(input.summary ?? input.message, 'summary');
  const timestamp = (input.now ?? new Date()).toISOString();
  const body = redactObject({
    summary,
    message: emptyToUndefined(input.message),
    tool: emptyToUndefined(input.tool),
    cwd: emptyToUndefined(input.cwd),
    tags: normalizeTags(input.tags ?? []),
    metadata: input.metadata
  });

  const event: PromptTrailEvent = {
    version: 1,
    id: createEventId(timestamp, type, body.summary),
    timestamp,
    type,
    summary: body.summary
  };

  if (body.message) event.message = body.message;
  if (body.tool) event.tool = body.tool;
  if (input.status) event.status = parseStatus(input.status);
  if (body.cwd) event.cwd = body.cwd;
  if (body.tags && body.tags.length > 0) event.tags = body.tags;
  if (body.metadata && Object.keys(body.metadata).length > 0) event.metadata = body.metadata;

  return event;
}

export function parseEvent(json: string): PromptTrailEvent {
  const value = JSON.parse(json) as unknown;
  if (!isRecord(value)) throw new PromptTrailError('event must be a JSON object');
  if (value.version !== 1) throw new PromptTrailError('unsupported event version');
  assertNonEmptyString(value.id, 'id');
  assertNonEmptyString(value.timestamp, 'timestamp');
  assertNonEmptyString(value.type, 'type');
  assertNonEmptyString(value.summary, 'summary');
  parseIsoInstant(value.timestamp, 'event timestamp');
  if (!isEventType(value.type)) throw new PromptTrailError('unknown event type: ' + value.type);
  if (value.status !== undefined && (typeof value.status !== 'string' || !isStatus(value.status))) {
    throw new PromptTrailError('unknown event status: ' + String(value.status));
  }
  for (const field of ['message', 'tool', 'cwd'] as const) {
    if (value[field] !== undefined && typeof value[field] !== 'string') {
      throw new PromptTrailError('event ' + field + ' must be a string');
    }
  }
  if (value.tags !== undefined && (!Array.isArray(value.tags) || value.tags.some((tag) => typeof tag !== 'string'))) {
    throw new PromptTrailError('event tags must be an array of strings');
  }
  if (value.metadata !== undefined && !isRecord(value.metadata)) {
    throw new PromptTrailError('event metadata must be a JSON object');
  }
  return value as PromptTrailEvent;
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new PromptTrailError('event ' + field + ' must be a non-empty string');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseEventType(value: string): PromptTrailEventType {
  if (!isEventType(value)) {
    throw new PromptTrailError('Unknown event type "' + value + '". Expected prompt, tool, decision, verification, or note.');
  }
  return value;
}

function parseStatus(value: string): PromptTrailStatus {
  if (!isStatus(value)) {
    throw new PromptTrailError('Unknown status "' + value + '". Expected ok, warn, fail, or info.');
  }
  return value;
}

function cleanRequired(value: string | undefined, field: string): string {
  const cleaned = value?.trim();
  if (!cleaned) throw new PromptTrailError('Missing required ' + field + '.');
  return cleaned;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.flatMap((tag) => tag.split(',')).map((tag) => tag.trim()).filter(Boolean))].sort();
}

function createEventId(timestamp: string, type: string, summary: string): string {
  return crypto.createHash('sha256').update(timestamp + '\0' + type + '\0' + summary + '\0' + crypto.randomUUID()).digest('hex').slice(0, 16);
}

function redactObject<T>(value: T): T {
  if (typeof value === 'string') return redactText(value).text as T;
  if (Array.isArray(value)) return value.map((item) => redactObject(item)) as T;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, nested]) => [key, redactObject(nested)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}
