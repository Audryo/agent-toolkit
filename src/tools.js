import { requireProjectId } from "./config.js";

const projectIdProperty = {
  projectId: {
    type: "string",
    description: "Project UUID. Defaults to AUDRYO_PROJECT_ID.",
  },
};

export const tools = [
  {
    name: "get_manifest",
    description: "Read the Audryo agent manifest: operating model, scopes, and review policy.",
    scope: "read",
    cli: ["manifest"],
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: (client) => client.getManifest(),
  },
  {
    name: "get_bootstrap",
    description: "List workspaces and projects this token can access.",
    scope: "read",
    cli: ["bootstrap"],
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: (client) => client.getBootstrap(),
  },
  {
    name: "get_setup_context",
    description: "Read first-run setup progress for a project (foundation through sending).",
    scope: "read",
    cli: ["setup"],
    inputSchema: { type: "object", properties: projectIdProperty, additionalProperties: false },
    run: (client, args, config) => client.getSetupContext(requireProjectId(config, args.projectId)),
  },
  {
    name: "get_product_context",
    description: "Read confirmed product foundation and brand context.",
    scope: "read",
    cli: ["product"],
    inputSchema: { type: "object", properties: projectIdProperty, additionalProperties: false },
    run: (client, args, config) => client.getProductContext(requireProjectId(config, args.projectId)),
  },
  {
    name: "get_data_context",
    description: "Read data schema, coverage, and lifecycle readiness.",
    scope: "read",
    cli: ["data"],
    inputSchema: { type: "object", properties: projectIdProperty, additionalProperties: false },
    run: (client, args, config) => client.getDataContext(requireProjectId(config, args.projectId)),
  },
  {
    name: "list_journeys",
    description: "List journeys, opportunities, and audiences for a project.",
    scope: "read",
    cli: ["journeys", "list"],
    inputSchema: { type: "object", properties: projectIdProperty, additionalProperties: false },
    run: (client, args, config) => client.getWorkflowContext(requireProjectId(config, args.projectId)),
  },
  {
    name: "inspect_journey",
    description: "Inspect journey runtime: readiness, enrollments, and delivery performance.",
    scope: "read",
    cli: ["journeys", "inspect"],
    inputSchema: {
      type: "object",
      required: ["workflowId"],
      properties: {
        ...projectIdProperty,
        workflowId: { type: "string", description: "Journey / workflow UUID." },
      },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.getWorkflowRuntime(requireProjectId(config, args.projectId), args.workflowId),
  },
  {
    name: "list_contacts",
    description: "List contacts with optional search and status filter.",
    scope: "read",
    cli: ["contacts", "list"],
    inputSchema: {
      type: "object",
      properties: {
        ...projectIdProperty,
        search: { type: "string" },
        status: { type: "string", description: "all | marketable | suppressed | unknown | pending" },
      },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.listContacts(requireProjectId(config, args.projectId), {
        search: args.search,
        "filter[status]": args.status,
      }),
  },
  {
    name: "list_campaigns",
    description: "List campaigns for a project.",
    scope: "read",
    cli: ["campaigns", "list"],
    inputSchema: { type: "object", properties: projectIdProperty, additionalProperties: false },
    run: (client, args, config) => client.listCampaigns(requireProjectId(config, args.projectId)),
  },
  {
    name: "get_delivery_health",
    description: "Inspect sending identity, provider readiness, governance, and recent delivery counts.",
    scope: "read",
    cli: ["delivery", "health"],
    inputSchema: { type: "object", properties: projectIdProperty, additionalProperties: false },
    run: (client, args, config) => client.getDeliveryContext(requireProjectId(config, args.projectId)),
  },
  {
    name: "get_performance",
    description: "Read performance context: delivery rates, journey ranking, and operational issues.",
    scope: "read",
    cli: ["delivery", "performance"],
    inputSchema: {
      type: "object",
      properties: {
        ...projectIdProperty,
        range: { type: "string", description: "today | 7d | 30d | 90d | all" },
      },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.getPerformanceContext(requireProjectId(config, args.projectId), args.range),
  },
  {
    name: "get_brief",
    description: "Read the agent Brief: findings with typed next actions, plan usage, and the latest observation. Start here before proposing work.",
    scope: "read",
    cli: ["brief"],
    inputSchema: { type: "object", properties: projectIdProperty, additionalProperties: false },
    run: (client, args, config) => client.getBrief(requireProjectId(config, args.projectId)),
  },
  {
    name: "get_observation",
    description: "Read the latest review-only lifecycle observation.",
    scope: "read",
    cli: ["observation"],
    inputSchema: { type: "object", properties: projectIdProperty, additionalProperties: false },
    run: (client, args, config) => client.getObservation(requireProjectId(config, args.projectId)),
  },
  {
    name: "run_observation",
    description: "Run a deterministic observation. Cooldown applies unless force is true.",
    scope: "read",
    cli: ["observation", "run"],
    inputSchema: {
      type: "object",
      properties: { ...projectIdProperty, force: { type: "boolean" } },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.runObservation(requireProjectId(config, args.projectId), args.force === true),
  },
  {
    name: "get_copilot_plan",
    description: "Read the evidence-first copilot plan for one opportunity.",
    scope: "read",
    cli: ["copilot"],
    inputSchema: {
      type: "object",
      required: ["opportunityId"],
      properties: {
        ...projectIdProperty,
        opportunityId: { type: "string", description: "Opportunity UUID." },
      },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.getCopilotPlan(requireProjectId(config, args.projectId), args.opportunityId),
  },
  {
    name: "get_plan_usage",
    description: "Read workspace contact capacity and monthly AI allowance. Check before ingest or Audryo AI drafts.",
    scope: "read",
    cli: ["plan"],
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string", description: "Workspace UUID. Defaults to bootstrap defaults.workspaceId." },
      },
      additionalProperties: false,
    },
    run: async (client, args) => {
      const workspaceId = args.workspaceId ?? (await client.getBootstrap())?.defaults?.workspaceId;
      if (!workspaceId) throw new Error("plan usage requires a workspace id.");
      return client.getPlanUsage(workspaceId);
    },
  },
  {
    name: "propose_from_finding",
    description: "Turn a Brief findingKey into a review-only journey draft. Does not activate or send. Underperforming journeys become a measured graph revision, not an email rewrite. Scope: write.",
    scope: "write",
    cli: ["brief", "propose"],
    inputSchema: {
      type: "object",
      required: ["findingKey"],
      properties: {
        ...projectIdProperty,
        findingKey: { type: "string" },
      },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.createBriefProposal(requireProjectId(config, args.projectId), args.findingKey),
  },
  {
    name: "run_dry_run",
    description: "Validate a journey without activating it.",
    scope: "read",
    cli: ["journeys", "dry-run"],
    inputSchema: {
      type: "object",
      required: ["workflowId"],
      properties: {
        ...projectIdProperty,
        workflowId: { type: "string" },
      },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.runDryRun(requireProjectId(config, args.projectId), args.workflowId),
  },
  {
    name: "ingest_contacts",
    description: "Sync contacts with stable external IDs. Does not infer marketing consent. Scope: write.",
    scope: "write",
    cli: ["contacts", "ingest"],
    inputSchema: {
      type: "object",
      required: ["contacts"],
      properties: {
        ...projectIdProperty,
        contacts: {
          type: "array",
          items: {
            type: "object",
            required: ["externalId", "properties"],
            properties: {
              externalId: { type: "string" },
              properties: { type: "object", additionalProperties: true },
            },
          },
        },
      },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.ingestContacts(requireProjectId(config, args.projectId), args.contacts),
  },
  {
    name: "ingest_events",
    description: "Sync product events with stable external IDs. Same enrollment side effects as POST /event_ingestion. Scope: write.",
    scope: "write",
    cli: ["events", "ingest"],
    inputSchema: {
      type: "object",
      required: ["events"],
      properties: {
        ...projectIdProperty,
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              externalId: { type: "string" },
              name: { type: "string" },
              contactExternalId: { type: "string" },
              occurredAt: { type: "string" },
              properties: { type: "object", additionalProperties: true },
            },
          },
        },
      },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.ingestEvents(requireProjectId(config, args.projectId), args.events),
  },
  {
    name: "draft_campaign",
    description: "Create a reviewable campaign draft. Does not send. Scope: write.",
    scope: "write",
    cli: ["campaigns", "draft"],
    inputSchema: {
      type: "object",
      required: ["name", "audienceId"],
      properties: {
        ...projectIdProperty,
        name: { type: "string" },
        audienceId: { type: "string" },
        messageDocumentId: { type: "string" },
        subject: { type: "string" },
        locale: { type: "string" },
        status: { type: "string", description: "Defaults to draft." },
      },
      additionalProperties: false,
    },
    run: (client, args, config) => {
      const campaign = {
        name: args.name,
        audienceId: args.audienceId,
        status: args.status ?? "draft",
      };
      if (args.messageDocumentId) campaign.messageDocumentId = args.messageDocumentId;
      if (args.subject) campaign.subject = args.subject;
      if (args.locale) campaign.locale = args.locale;
      return client.draftCampaign(requireProjectId(config, args.projectId), campaign);
    },
  },
  {
    name: "create_journey_proposal",
    description: "Create a review-only journey from a structured specification, template, or opportunity. Prefer specification when you already designed the graph — Audryo will not call an LLM. Does not activate. Scope: write.",
    scope: "write",
    cli: ["journeys", "propose"],
    inputSchema: {
      type: "object",
      properties: {
        ...projectIdProperty,
        audienceId: { type: "string" },
        specification: {
          type: "object",
          additionalProperties: true,
          description: "Structured journey graph. Validated without an LLM.",
        },
        template: { type: "string", description: "onboarding | reactivation | nurture | custom" },
        goalEvent: { type: "string" },
        name: { type: "string" },
        opportunityId: { type: "string" },
      },
      additionalProperties: false,
    },
    run: (client, args, config) => {
      const payload = {};
      if (args.audienceId) payload.audienceId = args.audienceId;
      if (args.specification) payload.specification = args.specification;
      if (args.template) payload.template = args.template;
      if (args.goalEvent) payload.goalEvent = args.goalEvent;
      if (args.name) payload.name = args.name;
      if (args.opportunityId) payload.opportunityId = args.opportunityId;
      return client.createWorkflowProposal(requireProjectId(config, args.projectId), payload);
    },
  },
  {
    name: "revise_journey",
    description: "Revise an existing journey graph in place (draft autosave) or as a new reviewable version. Submit the structured specification you authored. Does not call an LLM and does not activate. Scope: write.",
    scope: "write",
    cli: ["journeys", "revise"],
    inputSchema: {
      type: "object",
      required: ["workflowId", "name", "audienceId", "specification"],
      properties: {
        ...projectIdProperty,
        workflowId: { type: "string", description: "Journey / workflow UUID." },
        name: { type: "string" },
        audienceId: { type: "string" },
        specification: {
          type: "object",
          additionalProperties: true,
          description: "Full journey specification to persist.",
        },
        autosave: {
          type: "boolean",
          description: "Update a non-live draft in place instead of creating a new version.",
        },
      },
      additionalProperties: false,
    },
    run: (client, args, config) => {
      const payload = {
        name: args.name,
        audienceId: args.audienceId,
        specification: args.specification,
      };
      if (args.autosave) payload.autosave = true;
      return client.reviseWorkflow(
        requireProjectId(config, args.projectId),
        args.workflowId,
        payload,
      );
    },
  },
  {
    name: "create_email",
    description: "Create a standalone email document. Title/subject yields a brand starter. Scope: write.",
    scope: "write",
    cli: ["emails", "create"],
    inputSchema: {
      type: "object",
      required: ["title", "subject"],
      properties: {
        ...projectIdProperty,
        title: { type: "string" },
        subject: { type: "string" },
        locale: { type: "string" },
        preheader: { type: "string" },
        status: { type: "string" },
      },
      additionalProperties: false,
    },
    run: (client, args, config) => {
      const message = {
        title: args.title,
        subject: args.subject,
      };
      if (args.locale) message.locale = args.locale;
      if (args.preheader) message.preheader = args.preheader;
      if (args.status) message.status = args.status;
      return client.createMessageDocument(requireProjectId(config, args.projectId), message);
    },
  },
  {
    name: "create_journey_email",
    description:
      "Attach a Journey email you authored. Send subject and TipTap content. Does not call Audryo AI. Scope: write.",
    scope: "write",
    cli: ["journeys", "email"],
    inputSchema: {
      type: "object",
      required: ["workflowId", "subject", "content"],
      properties: {
        ...projectIdProperty,
        workflowId: { type: "string" },
        workflowNodeId: { type: "string" },
        locale: { type: "string" },
        subject: { type: "string" },
        preheader: { type: "string" },
        content: {
          type: "object",
          additionalProperties: true,
          description: "TipTap document you authored.",
        },
        emailStyle: { type: "object", additionalProperties: true },
        status: { type: "string" },
        idempotencyKey: { type: "string" },
      },
      additionalProperties: false,
    },
    run: (client, args, config) => {
      const payload = {
        workflowId: args.workflowId,
        subject: args.subject,
        content: args.content,
      };
      if (args.workflowNodeId) payload.workflowNodeId = args.workflowNodeId;
      if (args.locale) payload.locale = args.locale;
      if (args.preheader) payload.preheader = args.preheader;
      if (args.emailStyle) payload.emailStyle = args.emailStyle;
      if (args.status) payload.status = args.status;
      return client.createMessageProposal(
        requireProjectId(config, args.projectId),
        payload,
        args.idempotencyKey,
      );
    },
  },
  {
    name: "get_delivery_mode",
    description:
      "Read whether the project is in sandbox mode (emails are captured in the Sandbox inbox, nothing reaches people) or live, plus the go-live checklist. Going live is a human decision in the app. Scope: read.",
    scope: "read",
    cli: ["sandbox", "status"],
    inputSchema: { type: "object", properties: projectIdProperty, additionalProperties: false },
    run: (client, args, config) => client.getDeliveryMode(requireProjectId(config, args.projectId)),
  },
  {
    name: "list_sandbox_messages",
    description:
      "List emails captured in sandbox mode, newest first, including recipients eligibility skipped (status not_sent with skipReason). Use it to verify what a journey, campaign, or transactional send produced. Scope: read.",
    scope: "read",
    cli: ["sandbox", "list"],
    inputSchema: {
      type: "object",
      properties: {
        ...projectIdProperty,
        search: { type: "string", description: "Match recipient or subject." },
        status: { type: "string", enum: ["captured", "not_sent"] },
        source: { type: "string", enum: ["journey", "campaign", "transactional"] },
        workflowId: { type: "string" },
        campaignId: { type: "string" },
        after: { type: "string", description: "page.nextCursor from a previous call." },
        size: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    run: (client, args, config) => {
      const { projectId, ...filters } = args;
      return client.listSandboxMessages(requireProjectId(config, projectId), filters);
    },
  },
  {
    name: "get_sandbox_message",
    description:
      "Read one captured sandbox email: exact rendered HTML with tracked links, plain text, headers, and the merge data used. Scope: read.",
    scope: "read",
    cli: ["sandbox", "show"],
    inputSchema: {
      type: "object",
      required: ["messageId"],
      properties: { ...projectIdProperty, messageId: { type: "string" } },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.getSandboxMessage(requireProjectId(config, args.projectId), args.messageId),
  },
  {
    name: "fast_forward_journey",
    description:
      "Sandbox mode only: make every waiting enrollment of an active journey due now, so delays and wait-until timeouts resolve immediately. Scope: write.",
    scope: "write",
    cli: ["journeys", "fast-forward"],
    inputSchema: {
      type: "object",
      required: ["workflowId"],
      properties: { ...projectIdProperty, workflowId: { type: "string" } },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.fastForwardWorkflow(requireProjectId(config, args.projectId), args.workflowId),
  },
  {
    name: "activate_journey",
    description: "Activate a reviewed journey. Requires deliver scope, a passing dry run, and confirmed emails.",
    scope: "deliver",
    cli: ["journeys", "activate"],
    inputSchema: {
      type: "object",
      required: ["workflowId"],
      properties: {
        ...projectIdProperty,
        workflowId: { type: "string" },
      },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.updateWorkflowRuntime(requireProjectId(config, args.projectId), args.workflowId, "active"),
  },
  {
    name: "pause_journey",
    description: "Pause an active journey. Requires deliver scope.",
    scope: "deliver",
    cli: ["journeys", "pause"],
    inputSchema: {
      type: "object",
      required: ["workflowId"],
      properties: {
        ...projectIdProperty,
        workflowId: { type: "string" },
      },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.updateWorkflowRuntime(requireProjectId(config, args.projectId), args.workflowId, "paused"),
  },
  {
    name: "send_transactional",
    description: "Send a confirmed email to one recipient. Requires deliver scope and Idempotency-Key.",
    scope: "deliver",
    cli: ["transactional", "send"],
    inputSchema: {
      type: "object",
      required: ["messageId", "email"],
      properties: {
        ...projectIdProperty,
        messageId: { type: "string" },
        email: { type: "string" },
        externalId: { type: "string" },
        dataVariables: { type: "object", additionalProperties: true },
        contactProperties: { type: "object", additionalProperties: true },
        idempotencyKey: {
          type: "string",
          description: "Stable business id. Defaults to txn-{messageId}-{externalId|email}.",
        },
      },
      additionalProperties: false,
    },
    run: (client, args, config) => {
      const payload = { email: args.email };
      if (args.externalId) payload.externalId = args.externalId;
      if (args.dataVariables) payload.dataVariables = args.dataVariables;
      if (args.contactProperties) payload.contactProperties = args.contactProperties;
      const idempotencyKey =
        args.idempotencyKey ?? `txn-${args.messageId}-${args.externalId || args.email}`;
      return client.sendTransactional(
        requireProjectId(config, args.projectId),
        args.messageId,
        payload,
        idempotencyKey,
      );
    },
  },
  {
    name: "send_campaign",
    description: "Send a reviewed campaign. Requires deliver scope. Does not skip human review.",
    scope: "deliver",
    cli: ["campaigns", "send"],
    inputSchema: {
      type: "object",
      required: ["campaignId"],
      properties: {
        ...projectIdProperty,
        campaignId: { type: "string" },
        idempotencyKey: { type: "string" },
      },
      additionalProperties: false,
    },
    run: (client, args, config) =>
      client.sendCampaign(
        requireProjectId(config, args.projectId),
        args.campaignId,
        args.idempotencyKey,
      ),
  },
];

export const findTool = (name) => tools.find((tool) => tool.name === name);

export const findToolByCli = (positional) =>
  tools
    .filter((tool) => tool.cli?.every((part, index) => positional[index] === part))
    .sort((left, right) => right.cli.length - left.cli.length)[0];

export const mcpToolDescriptors = () =>
  tools.map((tool) => ({
    name: tool.name,
    description: `${tool.description} Required token scope: ${tool.scope}.`,
    inputSchema: tool.inputSchema,
  }));
