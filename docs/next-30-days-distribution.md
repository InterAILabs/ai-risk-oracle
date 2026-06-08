# Next 30 Days Distribution Plan

This plan assumes no product changes. It focuses on distribution execution,
indexing, and learning from early adoption.

## Week 1: Submissions And Indexing

Goals:

- create or confirm the `v0.1.0-beta` GitHub pre-release;
- add GitHub repository topics;
- submit to OpenAPI/API directories;
- prepare x402 ecosystem listing copy;
- prepare MCP Registry submission artifact, without claiming listing yet;
- submit to selected developer API directories;
- capture every submission URL and status in an operator tracker.

Deliverables:

- release confirmed or release checklist complete;
- first directory submissions sent;
- MCP Registry gap list closed into concrete tasks;
- x402 listing asset ready.

## Week 2: Domain And Observability Planning

Goals:

- decide whether to keep `ai-risk-oracle.fly.dev` through beta or move to an
  owned domain;
- plan `oracle.interailabs.com` as the product domain;
- reserve `api.interailabs.com` for future platform APIs;
- define canonical URL and redirect rules;
- define public/private observability boundaries.

Deliverables:

- domain decision memo;
- DNS/TLS checklist;
- metadata update plan;
- observability metrics list for distribution funnel.

## Week 3: First Automated Adoption Metrics

Goals:

- define daily distribution metrics;
- track discovery views, pricing views, onboard attempts, verify calls, and
  receipt lookups;
- separate public aggregate reporting from private operational data;
- define smoke credential cleanup checks.

Deliverables:

- first adoption metrics report template;
- list of metrics safe to share externally;
- list of metrics that must remain internal;
- operator routine for weekly review.

## Week 4: Decide If Scaling Is Needed

Goals:

- review traffic from submissions;
- evaluate latency, readiness, error rates, and onboarding usage;
- decide whether beta traffic requires scaling work;
- decide whether to move domain work ahead of broader distribution.

Deliverables:

- scaling decision;
- domain timing decision;
- next submission wave list;
- issues or roadmap items for production hardening.

## Decision Gates

Continue controlled beta if:

- health and readiness remain green;
- no abuse pattern appears;
- onboarding and receipt lookup remain reliable;
- operator cleanup routines work.

Pause broad distribution if:

- onboarding abuse appears;
- readiness fails;
- x402/payment issues appear;
- support load exceeds operator capacity;
- directories require claims beyond current readiness.

