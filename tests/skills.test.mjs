import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skills = ["audryo-api", "audryo-email", "audryo-sending"];

// The Agent Skills format (used by `npx skills add`) requires the folder name
// to equal the frontmatter name.
test("ships installable skills whose folder matches their name", async () => {
  for (const name of skills) {
    const packaged = await readFile(new URL(`../skills/${name}/SKILL.md`, import.meta.url), "utf8");
    assert.match(packaged, new RegExp(`^---\\nname: ${name}\\n`));
  }
});


test("API skill prefers MCP and CLI over handwritten curl", async () => {
  const skill = await readFile(new URL("../skills/audryo-api/SKILL.md", import.meta.url), "utf8");
  assert.match(skill, /AUDRYO_API_KEY/);
  assert.match(skill, /"mcp"/);
  assert.match(skill, /events ingest/);
  assert.match(skill, /list_journeys/);
  assert.match(skill, /draft_campaign/);
  assert.match(skill, /get_delivery_health/);
  assert.match(skill, /deliver/);
});

test("email and sending skills keep review-before-send and ESP ownership", async () => {
  const email = await readFile(new URL("../skills/audryo-email/SKILL.md", import.meta.url), "utf8");
  const sending = await readFile(new URL("../skills/audryo-sending/SKILL.md", import.meta.url), "utf8");

  assert.match(email, /heading/);
  assert.match(email, /footer/);
  assert.match(email, /confirmed/);
  assert.match(sending, /get_delivery_health/);
  assert.match(sending, /consent/);
  assert.match(sending, /ESP/);
});
