# Benchmark Baseline

This benchmark is a calibration aid for the current trust layer. It is not a
truth guarantee and should not be used as proof that every future answer will be
classified correctly.

Run it locally:

```bash
npm run benchmark
```

Write a JSON report:

```bash
npm run benchmark -- --write-json
```

## v0.0.1-beta.1 Baseline

| Metric | Result |
| --- | ---: |
| Cases | 60 |
| Passed | 58 |
| Failed | 2 |
| Accuracy | 96.67% |
| False positives | 1 |
| False negatives | 1 |

## Accuracy By Expected Action

| Expected Action | Passed | Cases | Accuracy |
| --- | ---: | ---: | ---: |
| accept | 20 | 20 | 100.00% |
| review | 22 | 23 | 95.65% |
| reject | 16 | 17 | 94.12% |

## Confusion Matrix

| Expected | Actual Accept | Actual Review | Actual Reject |
| --- | ---: | ---: | ---: |
| accept | 20 | 0 | 0 |
| review | 0 | 22 | 1 |
| reject | 0 | 1 | 16 |

## Known Misses

| Case | Expected | Actual | Risk | Notes |
| --- | --- | --- | --- | --- |
| `overconfident-wrong-fact` | reject | review | medium | The current deterministic trust layer flags the answer for review but does not reject it outright. |
| `ambiguous-answer` | review | reject | high | The current policy is conservative for ambiguity and may over-block vague answers. |

## Interpretation

The baseline is good enough for a technical beta focused on machine-to-machine
gating, signed receipts, idempotent billing, and operational traceability.

It is not enough to claim universal hallucination detection or factual
verification. Future benchmark work should add externally evidenced cases,
domain-specific datasets, and regression thresholds once deeper verification
modes are implemented.
