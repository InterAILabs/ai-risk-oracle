# Publishing the SDK packages

Both registries use their official trusted-publishing path. Do not create or store long-lived npm or PyPI tokens in this repository.

## TypeScript SDK: npm

The first publication must be made interactively because npm only allows a trusted publisher to be attached after the package exists.

1. From `sdk/typescript`, run `npm login --auth-type=web` and complete the browser confirmation.
2. Run `npm publish --access public --provenance` for the first release.
3. In the npm package settings, add a GitHub Actions trusted publisher with:
   - organization or user: `InterAILabs`
   - repository: `ai-risk-oracle`
   - workflow: `publish-npm.yml`
   - environment: `npm`
4. For later versions, dispatch **Publish TypeScript SDK to npm** and enter the exact version from `sdk/typescript/package.json`.

The workflow validates the requested version, type-checks the package, and publishes it with provenance.

## Python SDK: PyPI

PyPI supports a pending trusted publisher, so the GitHub workflow can create the project on its first successful publication.

1. In the PyPI account publishing settings, add a pending publisher with:
   - PyPI project name: `interai-risk-oracle`
   - owner: `InterAILabs`
   - repository: `ai-risk-oracle`
   - workflow: `publish-python.yml`
   - environment: `pypi`
2. In GitHub, create the `pypi` environment if it does not already exist.
3. Dispatch **Publish Python SDK to PyPI** and enter the exact version from `python/pyproject.toml`.

The workflow validates the requested version, builds both source and wheel distributions, and publishes with an OIDC identity and attestations.
