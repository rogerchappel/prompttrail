import type { DoctorResult, PromptTrailEvent } from './types.js';

export function formatEventsMarkdown(events: PromptTrailEvent[]): string {
  if (events.length === 0) return 'No PromptTrail events found.\n';

  return events.map((event) => {
    const status = event.status ? ' [' + event.status + ']' : '';
    const tool = event.tool ? ' via ' + event.tool : '';
    const tags = event.tags?.length ? ' #' + event.tags.join(' #') : '';
    const message = event.message ? '\n  ' + event.message : '';
    return '- ' + event.timestamp + ' ' + event.type + status + ': ' + event.summary + tool + tags + message;
  }).join('\n') + '\n';
}

export function formatSummaryMarkdown(events: PromptTrailEvent[]): string {
  const counts = new Map<string, number>();
  const statuses = new Map<string, number>();

  for (const event of events) {
    counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    if (event.status) statuses.set(event.status, (statuses.get(event.status) ?? 0) + 1);
  }

  const lines = [
    '# PromptTrail Summary',
    '',
    'Total events: ' + events.length,
    '',
    '## By type',
    ...formatMap(counts),
    '',
    '## By status',
    ...formatMap(statuses)
  ];

  return lines.join('\n') + '\n';
}

export function formatDoctorMarkdown(result: DoctorResult): string {
  const lines = [
    'PromptTrail doctor: ' + (result.ok ? 'ok' : 'needs attention'),
    'Root: ' + result.root,
    'Ledger: ' + result.ledgerPath,
    'Events: ' + result.events
  ];

  for (const invalid of result.invalidLines) {
    lines.push('Invalid line ' + invalid.line + ': ' + invalid.error);
  }

  return lines.join('\n') + '\n';
}

export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}

function formatMap(map: Map<string, number>): string[] {
  if (map.size === 0) return ['- none'];
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => '- ' + key + ': ' + count);
}
