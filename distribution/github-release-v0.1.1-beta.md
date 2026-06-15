# v0.1.1-beta Readiness Draft

Before an agent executes, InterAI verifies.

This draft is prepared for a future `v0.1.1-beta` pre-release. It has not been
published as a GitHub release yet.

## Highlights

- Hosted OpenAPI remains on OpenAPI 3.1.0 and has been polished for directory
  validation.
- Public readiness state reflects the real APIs.guru submission:
  issue #2665 is open and pending review.
- MCP/A2A claims remain scoped to hosted metadata, controlled partner review,
  and future registry submission work.
- Beta pricing remains unchanged at 0.0006 USDC per verification request.
- Distribution docs continue to avoid approval, listing, or official directory
  claims until a maintainer confirms them.

## Distribution State

- APIs.guru / OpenAPI Directory:
  https://github.com/APIs-guru/openapi-directory/issues/2665
- Status: submitted pending review.
- Not approved.
- Not listed.
- Next action: monitor issue #2665 and respond if maintainers request changes.

## OpenAPI Validation Notes

The hosted OpenAPI contract is intended for:

- API directories;
- agent tooling;
- developer API discovery;
- controlled technical beta integration.

Do not describe this beta as a broad high-volume production service.

## Pricing Notes

The current beta price remains:

```text
0.0006 USDC/request
600 microusdc/request
Base USDC
```

Use `https://ai-risk-oracle.fly.dev/pricing` as the source of truth.

## Manual Release Checklist

- Confirm build, tests, contracts, benchmark, and secrets check pass.
- Confirm hosted smoke passes after any deploy.
- Confirm OpenAPI validation has no blocking errors.
- Confirm APIs.guru issue #2665 is still described as pending unless accepted.
- Confirm no secrets or API keys appear in release notes.
- Publish as a pre-release only after operator approval.

## Manual GitHub Release Instructions

GitHub CLI authentication was not valid during the final readiness audit, so the
release was not created automatically.

Create manually:

```text
Tag: v0.1.1-beta
Title: InterAI Risk Oracle v0.1.1-beta
Target: latest public main commit after the final readiness pass
Release type: pre-release
Body file: distribution/github-release-v0.1.1-beta.md
```

Do not claim:

- APIs.guru approval;
- APIs.guru listing;
- MCP Registry listing;
- broad high-volume production readiness;
- enterprise readiness.
