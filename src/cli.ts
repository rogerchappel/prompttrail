#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { flag, flagAll, intFlag, parseArgs } from './args.js';
import { PromptTrailError } from './errors.js';
import { formatDoctorMarkdown, formatEventsMarkdown, formatSummaryMarkdown, toJson } from './format.js';
import { appendEvent, doctor, initLedger, readEvents } from './ledger.js';
import { redactText } from './redact.js';
import { isEventType, type PromptTrailEventType } from './types.js';

const HELP = [
  'PromptTrail - privacy-first JSONL receipt ledger for local agent work',
  '',
  'Usage:',
  '  prompttrail init [--dir <path>]',
  '  prompttrail append --summary <text> [--type prompt|tool|decision|verification|note] [--message <text>] [--tool <name>] [--status ok|warn|fail|info] [--tag <tag>] [--metadata JSON] [--dir <path>]',
  '  prompttrail list [--format markdown|json] [--type <type>] [--limit <n>] [--since <iso>] [--until <iso>] [--dir <path>]',
  '  prompttrail summary [--format markdown|json] [--dir <path>]',
  '  prompttrail redact [input-file] [--output <path>]',
  '  prompttrail doctor [--format markdown|json] [--dir <path>]',
  ''
].join('\n');

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    const command = parsed.command ?? 'help';

    if (command === 'help' || command === '--help' || command === '-h') {
      process.stdout.write(HELP);
      return 0;
    }

    if (command === 'init') {
      const paths = await initLedger(flag(parsed, 'dir'));
      process.stdout.write(toJson({ ok: true, ledger: paths.ledgerPath }));
      return 0;
    }

    if (command === 'append') {
      const event = await appendEvent({
        type: flag(parsed, 'type') ?? 'note',
        summary: flag(parsed, 'summary'),
        message: flag(parsed, 'message'),
        tool: flag(parsed, 'tool'),
        status: flag(parsed, 'status'),
        cwd: flag(parsed, 'cwd') ?? process.cwd(),
        tags: flagAll(parsed, 'tag'),
        metadata: parseMetadata(flag(parsed, 'metadata'))
      }, flag(parsed, 'dir'));
      process.stdout.write(toJson(event));
      return 0;
    }

    if (command === 'list') {
      const type = parseOptionalType(flag(parsed, 'type'));
      const events = await readEvents({
        root: flag(parsed, 'dir'),
        type,
        limit: intFlag(parsed, 'limit'),
        since: flag(parsed, 'since'),
        until: flag(parsed, 'until')
      });
      process.stdout.write(output(parsed, events, () => formatEventsMarkdown(events)));
      return 0;
    }

    if (command === 'summary') {
      const events = await readEvents({ root: flag(parsed, 'dir') });
      const data = {
        total: events.length,
        latest: events.at(-1) ?? null,
        byType: countBy(events.map((event) => event.type)),
        byStatus: countBy(events.map((event) => event.status).filter(Boolean) as string[])
      };
      process.stdout.write(output(parsed, data, () => formatSummaryMarkdown(events)));
      return 0;
    }

    if (command === 'redact') {
      const inputPath = parsed.positionals[0];
      const raw = inputPath ? await readFile(inputPath, 'utf8') : await readStdin();
      const report = redactText(raw);
      const outputPath = flag(parsed, 'output');
      if (outputPath) {
        await writeFile(outputPath, report.text, 'utf8');
        process.stdout.write(toJson({ ok: true, output: outputPath, replacements: report.replacements }));
      } else {
        process.stdout.write(report.text);
      }
      return 0;
    }

    if (command === 'doctor') {
      const result = await doctor(flag(parsed, 'dir'));
      process.stdout.write(output(parsed, result, () => formatDoctorMarkdown(result)));
      return result.ok ? 0 : 1;
    }

    throw new PromptTrailError('Unknown command "' + command + '". Run prompttrail help.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write('prompttrail: ' + message + '\n');
    return error instanceof PromptTrailError ? error.exitCode : 1;
  }
}

function parseMetadata(value: string | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new PromptTrailError('--metadata must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

function parseOptionalType(value: string | undefined): PromptTrailEventType | undefined {
  if (!value) return undefined;
  if (!isEventType(value)) throw new PromptTrailError('Unknown event type "' + value + '".');
  return value;
}

function output(parsed: ReturnType<typeof parseArgs>, value: unknown, markdown: () => string): string {
  return flag(parsed, 'format') === 'json' ? toJson(value) : markdown();
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}
