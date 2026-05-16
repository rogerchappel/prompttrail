import os from 'node:os';

export type RedactionReport = {
  text: string;
  replacements: number;
};

type RedactionRule = {
  label: string;
  pattern: RegExp;
};

const TOKEN_RULES: RedactionRule[] = [
  { label: 'github-token', pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g },
  { label: 'github-pat', pattern: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/g },
  { label: 'openai-key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { label: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { label: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { label: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },
  { label: 'bearer-token', pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi },
  {
    label: 'assigned-secret',
    pattern: /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY|ACCESS_KEY)[A-Z0-9_]*\s*=\s*)([^\s'"]{8,})/gi
  }
];

export function redactText(input: string, homeDir = os.homedir()): RedactionReport {
  let replacements = 0;
  let text = input;

  for (const rule of TOKEN_RULES) {
    text = text.replace(rule.pattern, (...args: string[]) => {
      replacements += 1;
      if (rule.label === 'assigned-secret') {
        return args[1] + '[REDACTED]';
      }
      if (rule.label === 'bearer-token') {
        return 'Bearer [REDACTED]';
      }
      return '[REDACTED]';
    });
  }

  if (homeDir && homeDir !== '/') {
    const escapedHome = escapeRegExp(homeDir);
    const homePattern = new RegExp(escapedHome, 'g');
    text = text.replace(homePattern, () => {
      replacements += 1;
      return '~';
    });
  }

  return { text, replacements };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
}
