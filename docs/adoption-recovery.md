# Adoption and activation

InterAI's first-run product wedge is a centralized policy gate for consequential
agent tool calls. The guided hosted demo lets a builder obtain an actual policy
decision and public trust receipt before setting up billing or a production
integration.

## Adoption metric

The primary internal north star is recurring external integrations: distinct
non-demo, non-smoke accounts with successful usage on at least two different UTC
days in a seven-day window. Discovery hits, stars, API keys, accounts, and
multiple same-day calls do not count as adoption.

## Guided demo events

- `demo.page_view`
- `demo.run_started`
- `demo.trial_created`
- `demo.verify_completed`
- `demo.receipt_viewed`
- `demo.copy_integration_clicked`

Telemetry stores only allowlisted event and privacy-safe attribution fields. It
does not store API keys, request bodies, action descriptions, raw IP addresses,
or receipt contents.

## Current distribution rule

Improve activation and retained integration before optimizing broad directory
traffic. Public claims about package availability, protocol conformance, or
directory listing must be backed by a live registry, production contract, or
maintainer confirmation.
