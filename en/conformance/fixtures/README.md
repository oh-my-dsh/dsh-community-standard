# conformance/fixtures

> **Status: Draft v0.15**. Fixtures are produced alongside each spec — **every "must" in a spec must have a fixture here that catches its violation** (writing discipline #2).

## Directory layout

```text
fixtures/
├── manifest/              # produced alongside spec/manifest.md
│   ├── valid/             # valid manifest samples (minimal / full)
│   └── invalid/           # invalid samples: one file violates exactly one rule, the filename says which
├── host-descriptor/       # produced alongside spec/host-descriptor.md (also split into valid/ and invalid/)
├── negotiation/           # produced alongside spec/negotiation.md: one directory per case
│   └── <case>/            #   manifest.json + host-descriptor.json + expected-report.json
├── lifecycle/             # produced alongside spec/lifecycle.md: scenario fixtures
├── events/                # produced alongside spec/event-envelope.md: scenario fixtures
└── facet/                 # produced alongside spec/facet-model.md: package-inspection fixtures
    └── invalid/<case>/    #   entry.js (the entry under inspection) + scenario.json (assertion description)
```

## Conventions

- **Naming**: invalid manifest / host-descriptor samples are `invalid/<rule-shorthand>.json`; one file plants exactly one error, and the filename says which rule it violates.
- **Schema-validatable fixtures** (manifest / host-descriptor / negotiation inputs and expected reports): samples under `valid/` must pass the corresponding schema, samples under `invalid/` must be rejected by the schema. Verification command: `npx --yes ajv-cli@5 validate -s schemas/<corresponding-schema>.json -d <fixture>`.
- **negotiation fixtures**: negotiation is a pure function, and each case directory is an "input pair + expected output" structure — `manifest.json` and `host-descriptor.json` must each pass their own schema (a precondition of negotiation, see [spec/negotiation.md](../../spec/negotiation.md) §2.2), and `expected-report.json` must pass `schemas/negotiation-report.schema.json`; the suites run the negotiator on the same input and assert the report matches `expected-report.json`.
- **Scenario fixtures** (lifecycle/ and events/): the specified behavior is runtime semantics that JSON Schema cannot express, so each file describes a scenario: `rule` (the asserted "must" and its spec citation), `steps` (the action sequence the suites drive the host through), `expect` (the assertion list). They are not schema-validation targets.
- **Package-inspection fixtures** (facet/): each directory is a minimal plugin package — `entry.js` is the entry file under inspection, and `scenario.json` describes the violation and the expected assertions.
- **Manifest rules JSON Schema cannot express** (asserted by the validator / suites outside schema validation, see [spec/conformance.md](../../spec/conformance.md)):
  - `manifest/invalid/duplicate-contributes-id.json`: deduplicating `contributes.commands` by `id` is cross-element semantics that draft-07 cannot express — the file passes the schema but must be rejected by static conflict detection.
  - `manifest/invalid/entry-outside-root.json`: "`entry` must live inside the package root" is filesystem semantics — the file passes the schema but must be rejected by path validation.
