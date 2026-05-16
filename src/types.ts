export const EVENT_TYPES = ['prompt', 'tool', 'decision', 'verification', 'note'] as const;
export const EVENT_STATUSES = ['ok', 'warn', 'fail', 'info'] as const;

export type PromptTrailEventType = typeof EVENT_TYPES[number];
export type PromptTrailStatus = typeof EVENT_STATUSES[number];

export type PromptTrailEvent = {
  version: 1;
  id: string;
  timestamp: string;
  type: PromptTrailEventType;
  summary: string;
  message?: string;
  tool?: string;
  status?: PromptTrailStatus;
  cwd?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type DoctorResult = {
  ok: boolean;
  root: string;
  trailDir: string;
  ledgerPath: string;
  exists: boolean;
  events: number;
  invalidLines: Array<{ line: number; error: string }>;
};

export function isEventType(value: string): value is PromptTrailEventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}

export function isStatus(value: string): value is PromptTrailStatus {
  return (EVENT_STATUSES as readonly string[]).includes(value);
}
