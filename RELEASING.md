# Releasing `audryo`

The package is developed in the Audryo monorepo under `packages/audryo` and
mirrored to the public [Audryo/Skills](https://github.com/Audryo/Skills)
repository. Everything public — npm, skills.sh, the Claude Code plugin and
the MCP Registry — reads from that mirror. Never edit the mirror directly;
the next sync overwrites it.

```
monorepo packages/audryo ──push to master──▶ Audryo/Skills
                                                │  new tag v<version>
                                                ├─▶ npm (Trusted Publishing, provenance)
                                                ├─▶ MCP Registry
                                                ├─▶ skills.sh      (npx skills add Audryo/Skills)
                                                └─▶ Claude Code plugin marketplace
```

## Release a new version

1. Bump the version in all four places:
   - `package.json` → `version`
   - `.claude-plugin/plugin.json` → `version`
   - `server.json` → `version` and `packages[0].version`

   `npm test` fails if they disagree.

2. Commit and push to `master` in the monorepo.

3. The rest is automatic:
   - **Monorepo, workflow "Audryo package"** runs the tests, copies
     `packages/audryo` to Audryo/Skills and pushes the tag `v<version>`
     if it does not exist yet.
   - **Audryo/Skills, workflow "Publish"** checks that the tag matches every
     version field, runs the tests, publishes to npm with provenance and
     updates the MCP Registry entry.

4. Check it:

   ```bash
   npm view audryo version
   ```

Skills and the Claude Code plugin come straight from GitHub, so skill text
changes reach `npx skills add` and the plugin on the next push, without a
version bump. The npm package only changes with a new version.

### Which number to bump

| Change | Example |
| --- | --- |
| Fixes, wording, skill text | 0.1.1 → 0.1.2 |
| New tools, commands or options | 0.1.2 → 0.2.0 |
| Removed or renamed tools, commands or env variables | 0.2.0 → 1.0.0 (0.x: 0.3.0) |

## One-time setup

Already done for the first release; listed so it can be rebuilt.

| Where | What |
| --- | --- |
| npm | Package `audryo` owned by the `audryo` org. Two-factor authentication on the publishing account. |
| npm → package → Settings → Trusted Publisher | GitHub Actions, organization `Audryo`, repository `Skills`, workflow `publish.yml`. No npm token is stored anywhere. |
| GitHub, fine-grained token | Access to Audryo/Skills only, **Contents** and **Workflows** read and write. |
| Monorepo → Settings → Secrets → Actions | That token as `SKILLS_REPO_TOKEN`. |

The very first version of a package cannot use Trusted Publishing, so
0.1.0 was published by hand with `npm publish --access public`.

## When something fails

| Symptom | Cause and fix |
| --- | --- |
| "Audryo package" fails at checkout or push | `SKILLS_REPO_TOKEN` expired or lacks permissions. Create a new token and replace the secret. |
| "Publish" fails: `<file> has X, tag is Y` | A version field was not bumped. Fix it, push, then delete the wrong tag in Audryo/Skills and push again. |
| npm returns 403 or 404 | Trusted Publisher missing or pointing at the wrong repo or workflow file. |
| npm says the version already exists | That version is on npm already. Bump again; npm never allows reusing a version. |
| MCP Registry rejects the name | The allowed namespace comes from the GitHub org. Try `io.github.Audryo/audryo` in both `server.json` (`name`) and `package.json` (`mcpName`). |

To retry a failed publish without a new version, rerun the "Publish" job in
Audryo/Skills → Actions.

## Local checks before pushing

```bash
npm test
npm pack --dry-run
```

`npm pack --dry-run` lists exactly what goes into the npm package.
