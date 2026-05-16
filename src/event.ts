import crypto from 'node:crypto';
import { PromptTrailError } from './errors.js';
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
  const value = JSON.parse(json) as Partial<PromptTrailEvent>;
  if (value.version !== 1) throw new PromptTrailError('unsupported event version');
  if (!value.id || !value.timestamp || !value.type || !value.summary) {
    throw new PromptTrailError('event is missing required fields');
  }
  if (!isEventType(value.type)) throw new PromptTrailError('unknown event type: ' + value.type);
  return value as PromptTrailEvent;
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
