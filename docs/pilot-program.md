# 30-Day Technical Pilot

InterAI is accepting a small number of design-partner pilots for agents that
execute consequential actions.

The pilot integrates one action boundary—such as a payment, wallet signature,
outbound message, database write, approval, or external tool call—with this
decision contract:

```text
proposed action -> InterAI -> allow | review_required | block -> signed receipt
```

The first proof can remain sandboxed and does not require production fund
movement. A successful pilot demonstrates that the decision or receipt usefully
changes, routes, or documents a real workflow on at least two different days.

The technical beta does not promise factual truth, enterprise SLA, or automatic
approval of high-stakes actions. Medical, legal, financial, safety-critical,
and irreversible workflows retain domain-specific and human controls.

To propose a pilot, use the repository's integration request template or the
support contact in the hosted discovery descriptor. Do not include API keys,
wallet secrets, private prompts, or production payloads.
