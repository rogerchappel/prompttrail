import { PromptTrailError } from './errors.js';

export type ParsedArgs = {
  command?: string;
  positionals: string[];
  flags: Map<string, string[]>;
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
    const value = inlineValue ?? (next && !next.startsWith('--') ? next : 'true');
    if (inlineValue === undefined && next && !next.startsWith('--')) index += 1;

    const current = flags.get(rawName) ?? [];
    current.push(value);
    flags.set(rawName, current);
  }

  return { command, positionals, flags };
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
