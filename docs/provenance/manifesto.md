# Prompt Provenance Manifesto

Chuchotage was not only written in code. It was shaped in conversation: rough prompts, small corrections, product anxieties, platform constraints, privacy boundaries, and the repeated act of asking what the product should refuse to become.

Those prompts are design material. They show taste, intent, and judgment in a way a commit diff cannot.

This does not mean every raw chat should be public. A raw assistant session can contain local paths, account workflows, deployment traces, test-device context, private correspondence, and other backstage details that do not belong in an open repository. The public artifact should preserve the ideas, not the operational exhaust.

## Thesis

Prompts are part of the source when they materially shape the product.

For Chuchotage, the useful public record is not a full transcript dump. It is a curated trail of product ideas, decisions, reversals, and constraints that explains why the app is small, direct, cross-platform, privacy-aware, and audio-first.

## Principles

1. Ideas are release material.
   A prompt can define product shape as surely as a spec can. Keep the good ones.

2. Raw chats are not automatically public artifacts.
   Publish curated provenance by default. Keep private operations, credentials, store-console work, tester contact data, and deployment details out of public docs.

3. Privacy is product architecture.
   Chuchotage should feel useful because it avoids becoming a meeting archive, analytics system, or transcript custodian. The product promise matters most when it limits future features.

4. Platform truth beats grand claims.
   iOS, Android, macOS, Windows, and the website are separate surfaces. Public writing should say what each platform actually supports today.

5. The product should feel like an instrument.
   One clear action, automatic input-language detection, a chosen output language, restrained signal feedback, and no dashboard unless the product truly needs one.

6. Backstage details decay quickly.
   Pricing, store review flows, deployment steps, credentials, account setup, and server operations should live in private notes or release checklists, not in the public idea record.

7. Provenance should help strangers understand.
   A good public idea note names the prompt, the decision it caused, the product consequence, and any remaining risk.

## Public Provenance Shape

Use `ideas.md` files for curated extraction:

- Prompt or question: the idea in plain language.
- Decision: what the project decided.
- Consequence: what changed in product, code, docs, or backlog.
- Boundary: what is intentionally not included.
- Source: the relevant sanitized session file, ticket, or doc.

Avoid copying raw tool output, local commands, account details, third-party messages, emails, phone numbers, or credentials into public provenance.

## What This Means For Chuchotage

The public story is not "an AI made an app." The public story is that product work became conversational, and the useful part of that conversation can be released as part of the source.

Chuchotage should publish the thinking that makes the product legible:

- why normal use avoids a Chuchotage backend;
- why transcripts are ephemeral;
- why headphones are product guidance, not decoration;
- why source language stays automatic;
- why desktop capture is different from mobile capture;
- why sponsored trial mode is optional and bounded;
- why the repo is cross-platform but platform-local.

That is the manifesto: release the ideas with care.
