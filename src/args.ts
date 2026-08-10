import { PromptTrailError } from './errors.js';

export type ParsedArgs = {
  command?: string;
  positionals: string[];
  flags: Map<string, string[]>;
};

type CommandSchema = {
  flags: readonly string[];
  repeatableFlags?: readonly string[];
  maxPositionals?: number;
};

const COMMAND_SCHEMAS: Record<string, CommandSchema> = {
  help: { flags: [] },
  init: { flags: ['dir'] },
  append: {
    flags: ['type', 'summary', 'message', 'tool', 'status', 'cwd', 'tag', 'metadata', 'dir'],
    repeatableFlags: ['tag']
  },
  list: { flags: ['format', 'type', 'limit', 'since', 'until', 'dir'] },
  summary: { flags: ['format', 'dir'] },
  redact: { flags: ['output'], maxPositionals: 1 },
  doctor: { flags: ['format', 'dir'] }
};

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const flags = new Map<string, string[]>();
  const positionals: string[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const [rawName, inlineValue] = token.slice(2).split('=', 2);
    if (!rawName) throw new PromptTrailError('Empty flag name.');
    const next = rest[index + 1];
    const value = inlineValue ?? (next && !next.startsWith('--') ? next : undefined);
    if (value === undefined || value === '') {
      throw new PromptTrailError('--' + rawName + ' requires a value.');
    }
    if (inlineValue === undefined && next && !next.startsWith('--')) index += 1;

    const current = flags.get(rawName) ?? [];
    current.push(value);
    flags.set(rawName, current);
  }

  return { command, positionals, flags };
}

export function validateArgs(parsed: ParsedArgs): void {
  const command = parsed.command ?? 'help';
  const schema = COMMAND_SCHEMAS[command];
  if (!schema) return;

  for (const [name, values] of parsed.flags) {
    if (!schema.flags.includes(name)) {
      throw new PromptTrailError('Unknown flag "--' + name + '" for ' + command + '. Run prompttrail help.');
    }
    if (values.length > 1 && !schema.repeatableFlags?.includes(name)) {
      throw new PromptTrailError('--' + name + ' may only be specified once for ' + command + '.');
    }
  }

  const maxPositionals = schema.maxPositionals ?? 0;
  if (parsed.positionals.length > maxPositionals) {
    throw new PromptTrailError(
      command === 'redact'
        ? 'redact accepts at most one input file.'
        : command + ' does not accept positional arguments.'
    );
  }
}

export function flag(parsed: ParsedArgs, name: string): string | undefined {
  return parsed.flags.get(name)?.at(-1);
}

export function flagAll(parsed: ParsedArgs, name: string): string[] {
  return parsed.flags.get(name) ?? [];
}

export function intFlag(parsed: ParsedArgs, name: string): number | undefined {
  const value = flag(parsed, name);
  if (value === undefined) return undefined;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new PromptTrailError('--' + name + ' must be a positive integer.');
  }
  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue)) throw new PromptTrailError('--' + name + ' must be a positive integer.');
  return parsedValue;
}
