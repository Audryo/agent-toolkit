---
name: audryo-email
description: Author Audryo lifecycle emails that pass the document schema, localization, and review-before-send rules. Use when drafting journey emails, campaigns, or transactional templates.
---

# Audryo email authoring

Write emails as `MessageDocument`s. Rails validates the document; the email renderer turns TipTap into HTML. Humans confirm before any customer send.

## Which send type

| Need | Use |
| --- | --- |
| One-time audience send | Campaign + confirmed document |
| Lifecycle sequence | Journey node + `createMessageProposal` per locale |
| API-triggered receipt, invite, reset | Confirmed document + `send_transactional` |

Do not put marketing copy on the transactional endpoint to skip consent.

## Create a starter

```bash
node packages/audryo/bin/audryo.js emails create \
  --title "Monthly product update" \
  --subject "Here's what shipped this month" \
  --locale en
```

Title/subject alone returns a confirmed brand scaffold. A full authored body should be submitted as `status: "proposed"` and stay reviewable.

## Required blocks

A revision needs at least four blocks and must include `heading`, `button`, and `footer` among them. That keeps the email accessible and gives marketing mail an unsubscribe footer.

- Subject is the inbox line. Title is internal only.
- Preheader should complement the subject, not repeat it.
- Button URLs must be real https destinations, not placeholders.
- Image `src` values must be durable project asset URLs from `POST /project_assets`. Do not invent CDN links.
- Merge tags: `{{ contact.first_name }}`, `{{ contact.first_name | "there" }}`, `{{ data.order_id }}`.
- Do not pass raw customer records into an LLM prompt. Use aggregate context and confirmed schema keys.

## Journey emails

After `create_journey_proposal`, enumerate every email node and every enabled project locale. Write the email yourself, then call `createMessageProposal` with `workflowId`, `workflowNodeId`, `locale`, `subject`, and TipTap `content`. Audryo validates and renders — it does not generate copy and does not use AI credits. Upload photos with `POST /project_assets` or use `audryo-icon:` marks.

## Confirm, then send

1. Lint and render the document.
2. A human sets `status: "confirmed"`.
3. Campaigns use `send_campaign`. Transactional uses `send_transactional` with a stable `Idempotency-Key`.
4. Journeys activate only after approval, a passing dry run, confirmed locales, and a verified sending identity.

Never mark a document confirmed unless the operator explicitly asked.
