---
name: audryo-sending
description: Follow Audryo sending, consent, and deliverability rules before activating a journey or sending a campaign. Use when inspecting delivery health, connecting an ESP, or launching mail.
---

# Audryo sending best practices

Audryo never sends customer mail from its own servers. Reputation lives on the project's ESP (Resend recommended). Delivery actions stay explicit and require the `deliver` token scope.

## Before launch

1. Connect a sending identity and publish SPF/DKIM exactly as shown.
2. Refresh until Rails reports `status: verified`. Do not claim DNS is done from a screenshot or a guess.
3. Register the provider webhook so bounces and complaints suppress automatically.
4. Confirm every journey locale and pass dry run.
5. Read delivery health:

```bash
node packages/audryo/bin/audryo.js delivery health
node packages/audryo/bin/audryo.js delivery performance --range 30d
```

MCP equivalents: `get_brief`, `get_delivery_health`, `get_performance`, `inspect_journey`.

## Consent and eligibility

- Marketing consent is an append-only ledger, not a contact property.
- Missing or revoked consent blocks marketing sends. Recording consent can unblock a stuck enrollment.
- Domain suppressions (`*@example.com`) block marketing and transactional mail.
- Do not infer consent from signup events, imports, or plan fields.

## Idempotency

Derive `Idempotency-Key` from a business id:

- Campaign send: `send-{campaignId}`
- Transactional: `receipt-{orderId}` or `txn-{messageId}-{externalId}`
- Journey enrollment: a stable upstream task id

A fresh random UUID on every retry defeats replay protection.

## What agents must not do

- Activate, schedule, or send without an explicit operator request.
- Treat opens and clicks as success. Product conversions and holdout lift are the outcomes.
- Mark promotional content as `communicationClass: transactional`.
- Launch to the full list before watching bounce and complaint rates on a small audience.
- Continue sending when `get_delivery_health` or performance issues show `sending_disabled`, unverified identity, or a complaint spike — pause first.

## Scopes

`write` can draft. `deliver` is required for journey activate/pause, consent, suppressions, campaign send, and transactional send.
