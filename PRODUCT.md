# Product

<!-- impeccable:product-schema 1 -->

## Register

product

## Platform

web

## Users

Operations managers (gestores) and customer service agents (atendentes) handling WhatsApp customer service assisted by the Lu AI agent. Today the users are the Lumina LED Store team. They are in active task flow: monitoring live conversations, answering customers, managing leads in the pipeline, checking system health. They need fast situational awareness, not deep navigation.

Roles: `atendente`, `gestor`, `admin`. Access to each WhatsApp number is grant-gated per user for every role.

## Product Purpose

Integra Connect is the operational command center for AI-assisted customer communication. It connects WhatsApp conversations, CRM contacts and leads, and the Lu AI agent into a single operational surface. Success looks like: zero missed conversations, fast response times, full pipeline visibility, and AI running reliably — all observable from a single screen.

## Positioning

Built and run in production for one real operation first (Lumina LED Store, at chat.luminaledstore.com.br), with a plan to sell it to other companies in phases. Phase 1 = Chat + Operações; Phase 2 adds CRM + IA (gated by `VITE_PLATFORM_PHASE`; hidden modules stay in the repo). The claim a neighbor cannot copy: a WhatsApp inbox where the AI (Lu) works as a copilot and consultant for the human agent — discovering what the customer needs when they do not know the product — rather than as an unsupervised bot.

## Operating Context

- Agents work mainly on desktop in the web app. Some replies are sent straight from the phone's WhatsApp; those echoes are ingested as outbound messages without an author.
- Shared inbox: several agents answer through the same number; the customer sees the agent's name as a `*Nome*` signature.
- A conversation is scoped to (contact, WhatsApp number); one company can run several numbers.
- Leads are created only when the contact sends the first inbound message.
- Lu auto-replies only when `AI_AUTOREPLY=true`; by default she suggests, the human sends.
- Campaign/ad origin (Click-to-WhatsApp) is attributed to conversations and shown in the inbox.

## Capabilities and Constraints

- WhatsApp via Evolution API (v1/v2), backend Fastify on a VPS, Supabase (Postgres + realtime) as the data layer.
- Product catalog and specs live in Omie (integration pending).
- Hard deletes are blocked in the database; data is real production data.
- Terminology: the AI is **Lu** (Lumina); database identifiers `nina_*` are legacy and kept.
- Undecided: multi-tenant model and branding for companies other than Lumina.

## Brand Commitments

Precise. Operational. Trustworthy.

The interface must feel like a tool a professional relies on, not a dashboard they admire. Confidence through data density, not decoration. The product earns trust by working, not by looking impressive.

Anti-references:

- Generic SaaS dashboards with hero metrics as decoration (big number + gradient = "not us")
- Consumer app softness: rounded blobs, pastel palettes, playful copy
- Dark-mode showpieces that prioritize aesthetics over readability
- Notification-spam dashboards that alert on everything and therefore nothing

## Evidence on Hand

Real production conversations, contacts, leads and campaign attribution for Lumina LED Store. No testimonials, case studies, external customers, benchmarks or pricing exist — do not fabricate them.

## Product Principles

1. **Attention before information** — Surface what needs action first; ambient data second. The user's first question is "do I need to do something right now?"
2. **Earned density** — Show more data only when the user earns the context. Start compact; expand on demand.
3. **Status is primary** — System health, conversation status, and AI state are more important than metrics. A metric means nothing if the pipeline is offline.
4. **Consistent affordances** — Same component in two places must look identical. Deviation is a bug, not personality.
5. **Zero ambiguity** — Labels, states, and empty states must explain themselves. A user should never wonder why a section is empty or what a number means.
6. **Human in charge** — Lu assists; the agent decides and sends. Anything the AI does on its own must be visible and attributable.

## Accessibility & Inclusion

WCAG AA compliance minimum in both light and dark themes, across every palette. All interactive elements must have visible focus states and ARIA labels where context isn't self-evident. Color is never the sole carrier of status — icons and text labels accompany every status indicator.
