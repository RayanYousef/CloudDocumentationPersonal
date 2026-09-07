# Registry

Location: `~/.docs-platform/registry.json` (`%USERPROFILE%\.docs-platform\registry.json` on Windows). It lives outside every repository so no code repo needs platform files.

```json
{
  "version": 1,
  "bundles": [
    {
      "remote": "https://github.com/RayanYousef/CloudDocumentationPersonal",
      "docs": { "kind": "local", "sitePath": "H:/Personal-Projects/CloudDocumentation/site" }
    },
    {
      "remote": "https://github.com/acme/game",
      "docs": { "kind": "content-service", "url": "https://docs.acme.example/api/content", "tokenEnv": "ACME_DOCS_TOKEN" }
    }
  ]
}
```

- `remote` is compared after normalisation: `git@github.com:o/r.git`, `ssh://git@github.com/o/r` and `https://github.com/o/r.git` all equal `https://github.com/o/r`.
- `kind: local`: `sitePath` is the absolute path of the bundle's `site/` folder (docs at `<sitePath>/docs`).
- `kind: content-service`: `url` is the HTTP content service (Phase 2); `tokenEnv` names the environment variable that holds the token. Never store tokens in the registry.
- The docs repository itself may also be registered (its own remote -> its own `site/`), which is how this template repo is found from inside itself.

Adding an entry: create the folder and file if missing, append a bundle object, keep the JSON valid. Confirm with `node <skill>/scripts/resolve-bundle.mjs <repoDir>`.
