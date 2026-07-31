# Local Validation Record

Validation performed before the first pull request:

```text
Node.js v22.16.0
npm 10.9.2
```

Commands:

```bash
find src tests -type f \( -name '*.js' -o -name '*.mjs' \) -print0 | xargs -0 -n1 node --check
npm test
```

Result:

```text
8 tests passed, 0 failed
```

Covered behavior:

- valid and invalid CRUMB parsing;
- optical frame pack and parse round-trip;
- rejection of unrelated frame bytes;
- LT fountain recovery after 20% deterministic frame loss and reverse-order delivery;
- duplicate-frame handling;
- plain CBM1 envelope round-trip;
- AES-GCM encrypted envelope round-trip;
- wrong-passphrase rejection.

A production Vite build was not run in the isolated authoring environment because npm dependencies were not available locally. GitHub Actions installs dependencies and runs both the test suite and production build on Node 20 and Node 22.
