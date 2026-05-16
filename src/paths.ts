import path from 'node:path';

export const DEFAULT_TRAIL_DIR = '.prompttrail';
export const DEFAULT_LEDGER_FILE = 'events.jsonl';

export type TrailPaths = {
  root: string;
  trailDir: string;
  ledgerPath: string;
};

export function resolveTrailPaths(root = process.cwd()): TrailPaths {
  const resolvedRoot = path.resolve(root);
  const trailDir = path.join(resolvedRoot, DEFAULT_TRAIL_DIR);

  return {
    root: resolvedRoot,
    trailDir,
    ledgerPath: path.join(trailDir, DEFAULT_LEDGER_FILE)
  };
}
