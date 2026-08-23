# prompttrail
Privacy-first JSONL receipt ledger for local agent work.
## Status

This is a v0.1.0 local-first developer tool. Treat the CLI and output formats as early-stage, pin versions in automation, and run the verification commands below before relying on it in CI.
## What it helps with

- Work with agent, audit-log, cli, jsonl, ledger workflows from a local checkout.
- Keep generated artifacts and reports inspectable on disk instead of sending project data to a service.
- Add a repeatable smoke command that maintainers can run before review or release.

## Install from a checkout

```sh
git clone https://github.com/rogerchappel/prompttrail.git
cd prompttrail
npm install
npm run build
```
## CLI quickstart

Start with the built CLI help so the examples match the checked-out version:

```sh
node dist/run.js --help
```
Run the maintained smoke fixture to exercise the main workflow end to end:

```sh
npm run smoke
```

The smoke command currently expands to:

```sh
bash scripts/smoke.sh
```

Each command rejects unsupported flags and extra positional arguments. Flags
require values, `append --summary <text>` is required, and `--tag <tag>` may be
repeated. `redact` is the only command that accepts a positional argument: one
optional input file (otherwise it reads standard input).

`list --since` and `list --until` are inclusive. Each bound must be a complete
ISO-8601 instant with a timezone, such as `2026-05-17T00:00:00Z` or
`2026-05-17T10:00:00+10:00`; equivalent timezone offsets are compared as the
same instant, and `--since` cannot be later than `--until`.
Stored event timestamps use the same strict form; impossible calendar dates are
rejected instead of being normalized to a different date.

## Verification

```sh
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
npm run release:workflow
```

## Limitations

- The project is intentionally local-first; it does not manage remote credentials or upload repository contents.
- Output schemas and CLI flags may change before a stable 1.0 release.
- Review generated files before committing them, especially when they summarize logs, diffs, or dependency metadata.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep changes small, include a fixture or smoke case when behavior changes, and paste verification output into the pull request.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting. Do not paste secrets, private tokens, or proprietary logs into issues or examples.

## License

MIT

## Release Readiness

Use the checked-in scripts before opening or publishing a release:

```sh
npm run check
npm test
npm run build
npm run smoke
npm run package:smoke
npm run release:check
```

The package smoke runs the documented help command, creates and locally installs
the package tarball, and verifies both published CLI names without publishing.
The workflow validator guards the registry setup, least required permissions,
and ordering of the package checks, `npm publish --dry-run --provenance --access
public`, and release-notes preview. Pull requests that affect release inputs run
the same publication dry run without uploading a package.

`prompttrail` also publishes the short `pt` alias for the same CLI entry point.

## Publishing a release

Push a validated `vX.Y.Z` tag whose version exactly matches `package.json`. The
release workflow runs all release checks, validates the package contents, and
publishes the public npm package with provenance before creating the matching
GitHub release. A validation or npm publication failure therefore leaves no
GitHub release to suggest that publication completed.

If npm publication succeeds but GitHub release creation fails, do not republish
the immutable npm version. Run the **Release** workflow manually, enter the
existing `vX.Y.Z` tag, and leave the tag itself unchanged. The recovery path
checks out that tag, requires it to match both `package.json` and the checked-out
commit, reruns the release/package checks, and queries npm and GitHub before
acting. It skips an already-published exact npm version, publishes with trusted
provenance only when npm reports that version missing, and creates the GitHub
release only when it is absent. Lookup errors other than a confirmed missing
version or release stop the workflow for investigation.
