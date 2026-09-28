# Audryo agent toolkit

[![npm](https://img.shields.io/npm/v/audryo)](https://www.npmjs.com/package/audryo)
[![CI](https://github.com/Audryo/agent-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/Audryo/agent-toolkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

CLI, MCP server and agent skills for [Audryo](https://audryo.com), the
review-before-send lifecycle email platform. Same workspace API key and
`read` / `write` / `deliver` scopes as the product.

Full guide: <https://app.audryo.com/docs/agents/packaging>

## Quick start

Create an API key under **Settings → Developer**, then pick your agent.

### Claude Code (plugin: MCP server + skills)

```bash
export AUDRYO_API_KEY="sf_live_..."
claude plugin marketplace add Audryo/agent-toolkit
claude plugin install audryo@audryo
```

### Any agent: skills only

```bash
npx skills add Audryo/agent-toolkit
```

### Any MCP client

```json
{
  "mcpServers": {
    "audryo": {
      "command": "npx",
      "args": ["-y", "audryo", "mcp"],
      "env": {
        "AUDRYO_API_KEY": "sf_live_...",
        "AUDRYO_PROJECT_ID": "<project-uuid>"
      }
    }
  }
}
```

Codex: `codex mcp add audryo --env AUDRYO_API_KEY=sf_live_... -- npx -y audryo mcp`

## Configuration

| Variable | Required | Default |
| --- | --- | --- |
| `AUDRYO_API_KEY` | yes | — |
| `AUDRYO_PROJECT_ID` | for project tools | list with `npx audryo bootstrap` |
| `AUDRYO_API_BASE` | no | `https://api.audryo.com/v1` |

Give agents the smallest key that works:

| Task | Scopes |
| --- | --- |
| Inspect | `read` |
| Sync data, draft journeys, emails and campaigns | `read`, `write` |
| Activate journeys, send campaigns and transactional email | `read`, `write`, `deliver` |

## CLI

```bash
npx audryo bootstrap
npx audryo contacts ingest contacts.json
npx audryo events ingest events.json
npx audryo journeys list
npx audryo journeys inspect <workflowId>
npx audryo campaigns draft --name "July update" --audience-id <id> --subject "What's new"
npx audryo delivery health
```

## Skills

| Skill | Teaches the agent to |
| --- | --- |
| `audryo-api` | Connect, pick scopes, use MCP or CLI instead of curl, stop at review |
| `audryo-email` | Build valid email documents, handle locales, save drafts for review |
| `audryo-sending` | Choose communication classes, respect consent, protect deliverability |

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md)
and the [changelog](./CHANGELOG.md). Report security issues privately:
[SECURITY.md](./SECURITY.md).

License: MIT
