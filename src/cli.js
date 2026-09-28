import { readFile } from "node:fs/promises";
import { createClient } from "./client.js";
import { ConfigError, readConfig, requireApiKey } from "./config.js";
import { startMcpServer } from "./mcp.js";
import { findToolByCli } from "./tools.js";
import { AudryoApiError } from "./client.js";

const HELP = `Audryo CLI — thin client for the /v1 agent API.

Usage:
  audryo <command> [options]

Discovery
  audryo manifest
  audryo bootstrap
  audryo brief
  audryo brief propose --finding-key KEY
  audryo observation
  audryo observation run [--force]
  audryo copilot --opportunity-id ID
  audryo plan
  audryo setup
  audryo product
  audryo data

Contacts and events
  audryo contacts list [--search TEXT] [--status marketable]
  audryo contacts ingest <file.json>
  audryo events ingest <file.json>

Journeys
  audryo journeys list
  audryo journeys inspect <workflowId>
  audryo journeys dry-run <workflowId>
  audryo journeys propose --audience-id ID --template onboarding [--goal-event NAME]
  audryo journeys propose --audience-id ID --specification FILE.json [--name NAME]
  audryo journeys revise <workflowId> --name NAME --audience-id ID --specification FILE.json
  audryo journeys activate <workflowId>
  audryo journeys pause <workflowId>
  audryo journeys fast-forward <workflowId>   (sandbox mode only)

Campaigns and email
  audryo campaigns list
  audryo campaigns draft --name NAME --audience-id ID [--subject TEXT] [--message-id ID]
  audryo campaigns send <campaignId> [--idempotency-key KEY]
  audryo emails create --title TITLE --subject SUBJECT [--locale en]
  audryo transactional send --message-id ID --email ADDR [--external-id ID] [--data JSON]

Sandbox
  audryo sandbox status
  audryo sandbox list [--status captured|not_sent] [--source journey|campaign|transactional] [--search TEXT]
  audryo sandbox show <messageId>

Delivery
  audryo delivery health
  audryo delivery performance [--range 30d]

MCP
  audryo mcp

Global options
  --api-base URL          Default: $AUDRYO_API_BASE or https://api.audryo.com/v1
  --api-key TOKEN         Default: $AUDRYO_API_KEY
  --project-id UUID       Default: $AUDRYO_PROJECT_ID
`;

export const parseArgs = (argv) => {
  const flags = {};
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      positional.push(...argv.slice(index + 1));
      break;
    }
    if (arg === "-h" || arg === "--help") {
      flags.help = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const trimmed = arg.slice(2);
    const eq = trimmed.indexOf("=");
    const key = camelCase(eq === -1 ? trimmed : trimmed.slice(0, eq));
    if (eq !== -1) {
      flags[key] = trimmed.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next == null || next.startsWith("-")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }

  return { flags, positional };
};

export const runCli = async (argv, { stdout, stderr, env, stdin } = {}) => {
  const { flags, positional } = parseArgs(argv);

  if (flags.help || positional[0] === "help" || positional.length === 0) {
    stdout.write(HELP);
    return 0;
  }

  if (positional[0] === "mcp") {
    const config = requireApiKey(readConfig({ flags, env }));
    await startMcpServer({
      stdin: stdin ?? process.stdin,
      stdout,
      env,
      config,
    });
    return 0;
  }

  const tool = findToolByCli(positional);
  if (!tool) {
    stderr.write(`Unknown command: ${positional.join(" ")}\n\n${HELP}`);
    return 1;
  }

  try {
    const config = tool.name === "get_manifest"
      ? readConfig({ flags, env })
      : requireApiKey(readConfig({ flags, env }));
    const client = createClient(config);
    const args = await buildToolArgs(tool, positional, flags);
    const result = await tool.run(client, args, config);
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    writeError(stderr, error);
    return 1;
  }
};

const buildToolArgs = async (tool, positional, flags) => {
  const args = { ...flagObject(flags) };
  const rest = positional.slice(tool.cli.length);

  if (tool.name === "get_copilot_plan") {
    args.opportunityId = flags.opportunityId;
    if (!args.opportunityId) throw new ConfigError("copilot requires --opportunity-id.");
  }

  if (tool.name === "propose_from_finding") {
    args.findingKey = flags.findingKey;
    if (!args.findingKey) throw new ConfigError("brief propose requires --finding-key.");
  }

  if (tool.name === "run_observation") {
    args.force = flags.force === true || flags.force === "true";
  }

  if (tool.name === "inspect_journey" || tool.name === "activate_journey" || tool.name === "pause_journey" || tool.name === "run_dry_run" || tool.name === "revise_journey" || tool.name === "fast_forward_journey") {
    args.workflowId = rest[0] ?? flags.workflowId;
    if (!args.workflowId) throw new ConfigError(`${tool.cli.join(" ")} requires a workflow id.`);
  }

  if (tool.name === "create_journey_proposal" && flags.specification) {
    args.specification = await readJsonValue(flags.specification, "specification");
  }

  if (tool.name === "revise_journey") {
    if (!args.name || !args.audienceId || !flags.specification) {
      throw new ConfigError("journeys revise requires --name, --audience-id and --specification.");
    }
    args.specification = await readJsonValue(flags.specification, "specification");
  }

  if (tool.name === "get_sandbox_message") {
    args.messageId = rest[0] ?? flags.messageId;
    if (!args.messageId) throw new ConfigError("sandbox show requires a message id.");
  }

  if (tool.name === "send_campaign") {
    args.campaignId = rest[0] ?? flags.campaignId;
    if (!args.campaignId) throw new ConfigError("campaigns send requires a campaign id.");
  }

  if (tool.name === "ingest_contacts") {
    args.contacts = await readPayload(rest[0] ?? flags.file, "contacts");
  }

  if (tool.name === "ingest_events") {
    args.events = await readPayload(rest[0] ?? flags.file, "events");
  }

  if (tool.name === "send_transactional") {
    args.messageId = flags.messageId ?? flags.message;
    args.email = flags.email;
    if (flags.data && typeof flags.data === "string") {
      args.dataVariables = JSON.parse(flags.data);
    }
    if (!args.messageId || !args.email) {
      throw new ConfigError("transactional send requires --message-id and --email.");
    }
  }

  if (tool.name === "draft_campaign") {
    if (!args.name || !args.audienceId) {
      throw new ConfigError("campaigns draft requires --name and --audience-id.");
    }
  }

  if (tool.name === "create_email") {
    if (!args.title || !args.subject) {
      throw new ConfigError("emails create requires --title and --subject.");
    }
  }

  return args;
};

const readPayload = async (filePath, key) => {
  if (!filePath || filePath === true) {
    throw new ConfigError(`${key} ingest requires a JSON file path.`);
  }
  const parsed = JSON.parse(await readFile(filePath, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.[key])) return parsed[key];
  throw new ConfigError(`JSON file must be an array or an object with a "${key}" array.`);
};

const readJsonValue = async (value, key) => {
  if (typeof value !== "string" || value === "true") {
    throw new ConfigError(`${key} must be a JSON object or a JSON file path.`);
  }
  const trimmed = value.trim();
  const parsed = trimmed.startsWith("{") || trimmed.startsWith("[")
    ? JSON.parse(trimmed)
    : JSON.parse(await readFile(trimmed, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ConfigError(`${key} must be a JSON object.`);
  }
  return parsed;
};

const flagObject = (flags) => {
  const skip = new Set(["apiBase", "apiKey", "project", "help", "file", "data", "message"]);
  const args = {};
  for (const [key, value] of Object.entries(flags)) {
    if (skip.has(key) || value === true) continue;
    args[key] = value;
  }
  if (flags.project) args.projectId = flags.project;
  return args;
};

const writeError = (stderr, error) => {
  if (error instanceof AudryoApiError) {
    stderr.write(`${JSON.stringify({
      error: {
        code: error.code,
        message: error.message,
        status: error.status,
        requestId: error.requestId,
      },
    }, null, 2)}\n`);
    return;
  }
  const code = error instanceof ConfigError ? error.code : "cli_error";
  stderr.write(`${JSON.stringify({
    error: { code, message: error.message },
  }, null, 2)}\n`);
};

const camelCase = (value) =>
  value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
