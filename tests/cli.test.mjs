import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseArgs, runCli } from "../src/cli.js";
import { collectOutput, startMockApi } from "./helpers.mjs";

test("parses global flags and hyphenated options", () => {
  const parsed = parseArgs([
    "campaigns",
    "draft",
    "--api-key",
    "sf_live_test",
    "--project-id",
    "proj_1",
    "--audience-id",
    "aud_1",
    "--name",
    "July update",
  ]);

  assert.deepEqual(parsed.positional, ["campaigns", "draft"]);
  assert.equal(parsed.flags.apiKey, "sf_live_test");
  assert.equal(parsed.flags.projectId, "proj_1");
  assert.equal(parsed.flags.audienceId, "aud_1");
  assert.equal(parsed.flags.name, "July update");
});

test("events ingest posts the same payload as the HTTP API", async () => {
  const mock = await startMockApi((request) => {
    if (request.path === "/v1/projects/proj_1/event_ingestion") {
      return { status: 202, body: { accepted: 1, duplicates: 0, events: 12 } };
    }
    return { status: 404, body: { error: { code: "not_found", message: "missing" } } };
  });
  const file = join(await mkdtemp(join(tmpdir(), "audryo-cli-")), "events.json");
  await writeFile(file, JSON.stringify({
    events: [
      {
        externalId: "evt_1",
        name: "signup_completed",
        contactExternalId: "usr_1",
        occurredAt: "2026-08-15T08:00:00Z",
        properties: { source: "cli" },
      },
    ],
  }));

  const stdout = collectOutput();
  const stderr = collectOutput();

  try {
    const code = await runCli(
      ["events", "ingest", file, "--api-base", mock.apiBase, "--api-key", "sf_live_test", "--project-id", "proj_1"],
      { stdout, stderr, env: {} },
    );

    assert.equal(code, 0, stderr.toString());
    assert.equal(JSON.parse(stdout.toString()).accepted, 1);
    assert.equal(mock.requests[0].method, "POST");
    assert.equal(mock.requests[0].path, "/v1/projects/proj_1/event_ingestion");
    assert.equal(mock.requests[0].body.events[0].externalId, "evt_1");
  } finally {
    await mock.close();
  }
});

test("journeys activate and transactional send require the documented deliver paths", async () => {
  const mock = await startMockApi((request) => {
    if (request.method === "PATCH" && request.path.endsWith("/runtime")) {
      return { status: 200, body: { status: "active" } };
    }
    if (request.path.includes("/transactional_send")) {
      return { status: 202, body: { deliveryId: "del_1", status: "queued" } };
    }
    return { status: 404, body: { error: { code: "not_found", message: "missing" } } };
  });

  const stdout = collectOutput();
  const stderr = collectOutput();

  try {
    const activate = await runCli(
      ["journeys", "activate", "wf_1", "--api-base", mock.apiBase, "--api-key", "sf_live_test", "--project-id", "proj_1"],
      { stdout, stderr, env: {} },
    );
    assert.equal(activate, 0, stderr.toString());
    assert.equal(mock.requests[0].method, "PATCH");
    assert.deepEqual(mock.requests[0].body, { status: "active" });

    const send = await runCli(
      [
        "transactional",
        "send",
        "--message-id",
        "msg_1",
        "--email",
        "amelia@example.com",
        "--external-id",
        "usr_1",
        "--idempotency-key",
        "receipt-ord_1842",
        "--api-base",
        mock.apiBase,
        "--api-key",
        "sf_live_test",
        "--project-id",
        "proj_1",
      ],
      { stdout, stderr, env: {} },
    );
    assert.equal(send, 0, stderr.toString());
    assert.match(mock.requests[1].path, /transactional_send$/);
    assert.equal(mock.requests[1].headers["idempotency-key"], "receipt-ord_1842");
  } finally {
    await mock.close();
  }
});

test("journeys propose and revise send a structured specification", async () => {
  const mock = await startMockApi((request) => {
    if (request.method === "POST" && request.path.endsWith("/workflow_proposals")) {
      return { status: 201, body: { id: "wf_spec", status: "review" } };
    }
    if (request.method === "PATCH" && request.path.endsWith("/workflows/wf_spec")) {
      return { status: 200, body: { id: "wf_rev", status: "review" } };
    }
    return { status: 404, body: { error: { code: "not_found", message: "missing" } } };
  });
  const file = join(await mkdtemp(join(tmpdir(), "audryo-cli-")), "journey.json");
  await writeFile(file, JSON.stringify({
    name: "Agent authored",
    objective: "Help new users activate.",
    communicationClass: "marketing",
    nodes: [],
  }));

  const stdout = collectOutput();
  const stderr = collectOutput();

  try {
    const propose = await runCli(
      [
        "journeys",
        "propose",
        "--audience-id",
        "aud_1",
        "--specification",
        file,
        "--name",
        "Agent authored",
        "--api-base",
        mock.apiBase,
        "--api-key",
        "sf_live_test",
        "--project-id",
        "proj_1",
      ],
      { stdout, stderr, env: {} },
    );
    assert.equal(propose, 0, stderr.toString());
    assert.equal(mock.requests[0].body.specification.name, "Agent authored");
    assert.equal(mock.requests[0].body.name, "Agent authored");

    const revise = await runCli(
      [
        "journeys",
        "revise",
        "wf_spec",
        "--name",
        "Agent authored v2",
        "--audience-id",
        "aud_1",
        "--specification",
        file,
        "--api-base",
        mock.apiBase,
        "--api-key",
        "sf_live_test",
        "--project-id",
        "proj_1",
      ],
      { stdout, stderr, env: {} },
    );
    assert.equal(revise, 0, stderr.toString());
    assert.equal(mock.requests[1].method, "PATCH");
    assert.equal(mock.requests[1].body.workflow.name, "Agent authored v2");
    assert.equal(mock.requests[1].body.workflow.specification.name, "Agent authored");
  } finally {
    await mock.close();
  }
});

test("prints JSON errors without a stack when the API refuses a scope", async () => {
  const mock = await startMockApi(() => ({
    status: 403,
    body: { error: { code: "insufficient_token_scope", message: "Needs deliver." } },
  }));
  const stdout = collectOutput();
  const stderr = collectOutput();

  try {
    const code = await runCli(
      ["journeys", "activate", "wf_1", "--api-base", mock.apiBase, "--api-key", "sf_live_rw", "--project-id", "proj_1"],
      { stdout, stderr, env: {} },
    );
    assert.equal(code, 1);
    assert.equal(JSON.parse(stderr.toString()).error.code, "insufficient_token_scope");
  } finally {
    await mock.close();
  }
});
