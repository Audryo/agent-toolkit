# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/Audryo/agent-toolkit/security/advisories/new)
or by email to support@audryo.com. Do not open a public issue.

Include what you found, how to reproduce it and the version affected. We
confirm receipt within two business days and keep you updated until it is
fixed.

## Supported versions

Only the latest release on npm receives security fixes.

## Scope

This repository covers the `audryo` CLI, MCP server and skills. Issues in
the Audryo app or API are in scope too; report them the same way.

## Handling API keys

The package reads `AUDRYO_API_KEY` from the environment and sends it only
to `AUDRYO_API_BASE`. It never logs or stores the key. Give agents the
smallest scope that works and leave `deliver` off unless they should send
email.
