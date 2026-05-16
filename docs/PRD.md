# PromptTrail PRD

Status: in-progress
Factory run: 2026-05-17 AM

## Summary

Append privacy-first JSONL receipts for local agent work: prompts, tool summaries, decisions, redacted outputs, and verification results. Query timelines without sending private conversations to a SaaS dashboard.

## Why now

Agent-assisted development creates useful context that evaporates between sessions or gets trapped inside private chats. PromptTrail gives developers a deterministic local ledger they can inspect, redact, and share selectively.

## Users

- Agentic developers who need durable handoffs between runs.
- Maintainers who want concise evidence of what an agent changed and verified.
- Teams that need a lightweight audit trail without hosted telemetry.

## Core V1

- TypeScript Node CLI with no required network access.
- Commands: `init`, `append`, `list`, `summary`, `redact`, and `doctor`.
- Writes newline-delimited JSON under `.prompttrail/events.jsonl` by default.
- Supports Markdown summaries and machine-readable JSON output.
- Redacts common token patterns and absolute home paths by default.
- Includes fixture-backed tests and a real CLI smoke.

## Non-goals

- Hosted sync, background capture, or chat-provider integrations in V1.
- Capturing secrets or full private transcripts by default.
- Replacing a full compliance audit system.

## UX notes

Tone: calm, useful, slightly archival. README should make it feel like `git log` for agent work, not surveillance.

## Acceptance criteria

- `npm test`, `npm run check`, `npm run build`, `npm run smoke`, and `bash scripts/validate.sh` pass where present.
- CLI works against checked-in fixtures with deterministic output.
- README includes install, quickstart, examples, safety model, JSONL schema, and limitations.
- Public GitHub repo under `rogerchappel/prompttrail` with useful description/topics.

## Inspiration and attribution

Reframed from recurring local developer workflow pain around agent handoffs, audit receipts, privacy-preserving run logs, and reproducible maintainer context. No code copied from external projects.
