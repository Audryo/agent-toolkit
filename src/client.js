export class AudryoApiError extends Error {
  constructor({ status, code, message, requestId, body }) {
    super(message);
    this.name = "AudryoApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.body = body;
  }
}

const joinUrl = (apiBase, path) => {
  const base = apiBase.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
};

export const createClient = ({
  apiBase,
  apiKey,
  fetchImpl = globalThis.fetch,
} = {}) => {
  const request = async ({
    method = "GET",
    path,
    query,
    body,
    idempotencyKey,
  }) => {
    const url = new URL(joinUrl(apiBase, path));
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value == null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    }

    const headers = { Accept: "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (idempotencyKey) headers["Idempotency-Key"] = String(idempotencyKey);

    const response = await fetchImpl(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const requestId = response.headers.get("x-request-id") ?? undefined;
    const text = await response.text();
    const parsed = text ? safeJson(text) : null;

    if (!response.ok) {
      const error = parsed?.error ?? {};
      throw new AudryoApiError({
        status: response.status,
        code: error.code ?? "http_error",
        message: error.message ?? `Audryo API returned ${response.status}.`,
        requestId: error.requestId ?? requestId,
        body: parsed,
      });
    }

    return parsed;
  };

  return {
    request,
    getManifest: () => request({ path: "/agent_manifest" }),
    getOpenApi: () => request({ path: "/openapi" }),
    getBootstrap: () => request({ path: "/bootstrap" }),
    getProductContext: (projectId) =>
      request({ path: `/projects/${projectId}/product_context` }),
    getDataContext: (projectId) =>
      request({ path: `/projects/${projectId}/data_context` }),
    getSetupContext: (projectId) =>
      request({ path: `/projects/${projectId}/setup_context` }),
    getWorkflowContext: (projectId) =>
      request({ path: `/projects/${projectId}/workflow_context` }),
    getWorkflowRuntime: (projectId, workflowId) =>
      request({ path: `/projects/${projectId}/workflows/${workflowId}/runtime` }),
    updateWorkflowRuntime: (projectId, workflowId, status) =>
      request({
        method: "PATCH",
        path: `/projects/${projectId}/workflows/${workflowId}/runtime`,
        body: { status },
      }),
    getDeliveryContext: (projectId) =>
      request({ path: `/projects/${projectId}/delivery_context` }),
    getPerformanceContext: (projectId, range) =>
      request({
        path: `/projects/${projectId}/performance_context`,
        query: range ? { range } : undefined,
      }),
    getBrief: (projectId) => request({ path: `/projects/${projectId}/brief` }),
    getObservation: (projectId) => request({ path: `/projects/${projectId}/observation` }),
    runObservation: (projectId, force) =>
      request({
        method: "POST",
        path: `/projects/${projectId}/observation`,
        body: force ? { force: true } : {},
      }),
    getCopilotPlan: (projectId, opportunityId) =>
      request({
        path: `/projects/${projectId}/copilot_plan`,
        query: { opportunity_id: opportunityId },
      }),
    getPlanUsage: (workspaceId) => request({ path: `/workspaces/${workspaceId}/plan_usage` }),
    createBriefProposal: (projectId, findingKey) =>
      request({
        method: "POST",
        path: `/projects/${projectId}/brief/proposals`,
        body: { findingKey },
      }),
    runDryRun: (projectId, workflowId) =>
      request({
        method: "POST",
        path: `/projects/${projectId}/workflows/${workflowId}/dry_run`,
      }),
    listContacts: (projectId, query) =>
      request({ path: `/projects/${projectId}/contacts`, query }),
    ingestContacts: (projectId, contacts) =>
      request({
        method: "POST",
        path: `/projects/${projectId}/contact_ingestion`,
        body: { contacts },
      }),
    ingestEvents: (projectId, events) =>
      request({
        method: "POST",
        path: `/projects/${projectId}/event_ingestion`,
        body: { events },
      }),
    listCampaigns: (projectId) =>
      request({ path: `/projects/${projectId}/campaigns` }),
    draftCampaign: (projectId, campaign) =>
      request({
        method: "POST",
        path: `/projects/${projectId}/campaigns`,
        body: { campaign },
      }),
    sendCampaign: (projectId, campaignId, idempotencyKey) =>
      request({
        method: "POST",
        path: `/projects/${projectId}/campaigns/${campaignId}/send`,
        idempotencyKey: idempotencyKey ?? `send-${campaignId}`,
      }),
    sendTransactional: (projectId, messageId, payload, idempotencyKey) =>
      request({
        method: "POST",
        path: `/projects/${projectId}/message_documents/${messageId}/transactional_send`,
        body: payload,
        idempotencyKey,
      }),
    createWorkflowProposal: (projectId, payload) =>
      request({
        method: "POST",
        path: `/projects/${projectId}/workflow_proposals`,
        body: payload,
      }),
    reviseWorkflow: (projectId, workflowId, payload) =>
      request({
        method: "PATCH",
        path: `/projects/${projectId}/workflows/${workflowId}`,
        body: { workflow: payload },
      }),
    createMessageDocument: (projectId, message) =>
      request({
        method: "POST",
        path: `/projects/${projectId}/message_documents`,
        body: { message },
      }),
    createMessageProposal: (projectId, payload, idempotencyKey) =>
      request({
        method: "POST",
        path: `/projects/${projectId}/message_proposals`,
        body: payload,
        idempotencyKey,
      }),
    getDeliveryMode: (projectId) => request({ path: `/projects/${projectId}/delivery_mode` }),
    listSandboxMessages: (projectId, { search, status, source, workflowId, campaignId, after, size } = {}) =>
      request({
        path: `/projects/${projectId}/sandbox_messages`,
        query: {
          search,
          "filter[status]": status,
          "filter[source]": source,
          "filter[workflowId]": workflowId,
          "filter[campaignId]": campaignId,
          "page[after]": after,
          "page[size]": size,
        },
      }),
    getSandboxMessage: (projectId, messageId) =>
      request({ path: `/projects/${projectId}/sandbox_messages/${messageId}` }),
    fastForwardWorkflow: (projectId, workflowId) =>
      request({ method: "POST", path: `/projects/${projectId}/workflows/${workflowId}/fast_forward` }),
  };
};

const safeJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};
