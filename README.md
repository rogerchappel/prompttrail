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
## Verification

```sh
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
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

`prompttrail` also publishes the short `pt` alias for the same CLI entry point.

## Publishing a release

Push a validated `vX.Y.Z` tag whose version exactly matches `package.json`. The
release workflow runs all release checks, validates the package contents, and
publishes the public npm package with provenance before creating the matching
GitHub release. A validation or npm publication failure therefore leaves no
GitHub release to suggest that publication completed.

If npm publication succeeds but GitHub release creation fails, do not republish
the immutable npm version. Re-run or repair only the GitHub release step for the
existing tag after confirming the version and provenance on npm.
