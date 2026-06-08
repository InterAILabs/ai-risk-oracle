# Domain And Hosting Roadmap

The current hosted beta is available at:

```text
https://ai-risk-oracle.fly.dev
```

This is acceptable for controlled technical beta, hosted metadata discovery, and
first-wave directory research. A brand-owned domain is recommended before broad
distribution because it improves trust, memorability, SEO, and registry review.

## Options

### Continue with `ai-risk-oracle.fly.dev`

Pros:

- live today
- already used by hosted `.well-known` metadata
- fastest for current beta testers
- no DNS migration risk

Cons:

- less brand-owned trust
- less memorable
- weaker long-term canonical URL for directory listings

Recommended use:

- keep for current `v0.1.0-beta`
- keep compatible after a future custom domain launch

### Use `oracle.interailabs.com`

Pros:

- product-specific
- clear fit for InterAI Risk Oracle
- strong enough for public listings and partner review
- easy to present as the canonical product endpoint

Cons:

- narrower than a platform-wide API domain
- may need redirects if InterAI later consolidates products

Recommended use:

- make this the canonical product domain for InterAI Risk Oracle

### Use `api.interailabs.com`

Pros:

- best long-term platform API shape
- can host multiple future InterAI services
- familiar to developers

Cons:

- less product-specific
- requires more careful versioning and path ownership

Recommended use:

- reserve for future platform-level APIs
- consider routing Risk Oracle under this domain only after the platform shape is
  clearer

## Recommendation

Use `ai-risk-oracle.fly.dev` for the current controlled beta and first-wave
distribution research. Plan `oracle.interailabs.com` as the next canonical
product endpoint. Reserve `api.interailabs.com` for future platform-level APIs.

## Future Migration Steps

1. Confirm domain ownership and DNS access.
2. Add a Fly custom domain and verify TLS.
3. Keep `ai-risk-oracle.fly.dev` working for compatibility.
4. Update hosted metadata only after the custom domain is live.
5. Update public docs and submission assets to the canonical domain.
6. Add redirects or canonical links where supported.
7. Re-run readiness, discovery, and smoke checks.

Do not change hosted metadata until DNS, TLS, and compatibility are verified.
