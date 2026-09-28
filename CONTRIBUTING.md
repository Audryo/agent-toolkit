# Contributing

Thanks for helping make Audryo work better with agents. Bug fixes, new
tools, clearer skills and better docs are all welcome.

## Set up

Requires Node 20 or newer.

```bash
git clone https://github.com/Audryo/agent-toolkit.git
cd agent-toolkit
npm install
npm test
```

Try the CLI against your own workspace:

```bash
AUDRYO_API_KEY=... node bin/audryo.js journeys list
```

## What lives where

| Path | Contents |
| --- | --- |
| `src/cli.js` | CLI commands |
| `src/tools.js` | MCP tools: name, scope, input schema, API call |
| `src/mcp.js` | MCP stdio server |
| `skills/*/SKILL.md` | Agent skills, one folder per skill; the folder name equals `name` |
| `.claude-plugin/`, `.mcp.json` | Claude Code plugin |
| `server.json` | MCP Registry entry |

The [Audryo API reference](https://app.audryo.com/docs/api/introduction) is
the contract. Tools and commands call it; they never add behavior the API
does not have.

## Guidelines

- **Keep the review model.** Tools that send email or start journeys need
  the `deliver` scope and must say so in their description. Nothing
  approves or sends on the agent's behalf by default.
- **Keep dependencies at zero.** The package runs through `npx`, so every
  dependency slows down every agent start.
- **Write skills for agents.** Short, imperative, with the exact tool or
  command to use. Test a skill by asking an agent to do the task with it.
- **Add a test** for new commands and tools; see `tests/`.

## Changesets

If users will notice your change, add a changeset:

```bash
npx changeset
```

Pick `patch` for fixes and wording, `minor` for new tools, commands or
options, and write one sentence for the changelog. Docs-only or test-only
changes do not need one.

## Releases

Maintainers merge the **Version Packages** pull request that Changesets
keeps up to date. That publishes to npm with provenance, creates the GitHub
release and updates the MCP Registry. See [RELEASING.md](./RELEASING.md).
