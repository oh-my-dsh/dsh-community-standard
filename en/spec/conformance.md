# Spec: Conformance

> **Status: Draft v0.15 (community draft — not an official dsh standard)**

What this document governs: it defines what proof "conforming to the standard" actually requires — what the four evidence classes are, how each may be publicly stated, and which test-environment records each piece of evidence MUST be bound to. Who should read it: host maintainers (before claiming "compatible"), plugin authors (before labeling a plugin "validation passed"), marketplaces and distribution channels (before displaying compatibility states).

## 1. Scope

- This document defines evidence classification and **phrasing boundaries**, not the tests themselves — test cases live in [conformance/fixtures/](../conformance/fixtures/README.md) and [conformance/suites/](../conformance/suites/README.md).
- The definition of the marketplace five states (declared compatible / pending authorization / tested / incompatible / unknown) and the "no mutual upgrade" rule are specified by [spec/host-descriptor.md](host-descriptor.md) and are not repeated here.
- The full evidence hierarchy (declared / resolved / decided / observed / tested / attested) belongs to [RFC 0004](../rfcs/0004-provenance-diagnostics.md); this document defines only the minimal executable subset for v0.15.

## 2. Normative Definitions

### 2.1 The Four Evidence Classes

v0.15 divides the evidence for "conforming to the standard" into four classes, each standing on its own and none substituting for another:

| # | Evidence | What it is | How to obtain |
| --- | --- | --- | --- |
| 1 | **Schema validation** | The manifest / Host Descriptor is a legal file | Pass the corresponding JSON Schema validation (`schemas/` directory) + pass the corresponding valid/invalid cases under `conformance/fixtures/` |
| 2 | **Host conformance** | The host's behavior conforms to the standard | The host passes the headless suites in [conformance/suites/](../conformance/suites/README.md): required/optional negotiation, unknown versions, authorization denial, activation ordering, best-effort shutdown, standard-callback exception capture, repeated activation, cleanup, and effect ownership |
| 3 | **Plugin validation** | The plugin's declarations match its implementation | The plugin passes validation: manifest and entrypoint are consistent, only declared contracts are used, contribution declaration/binding are consistent with no ID conflicts, optional dependencies have degradation paths, resources are releasable after repeated activation, and error messages are understandable |
| 4 | **Interop evidence** | Different implementations actually interoperate | At least **two independent host products/integrations** and **three example plugins** pass the same set of headless scenarios |

Two hard constraints on Interop evidence:

- The two hosts **MAY** share the same versioned DSH Adapter, but their respective integration and Host Descriptor evidence **MUST** be independent (an interop claim violating this constraint is invalid — caught by the evidence-inventory check of the conformance suites, [conformance/suites/](../conformance/suites/README.md), Phase 2 deliverable).
- No implementation **can self-certify**: volunteering to claim an implementation does not equal passing; evidence MUST be backed by suite run results (source: issue #23 disposition, see [decisions/round-1-issue-23.md](../decisions/round-1-issue-23.md)).

Interop evidence is the acceptance criterion for v0.15 to advance from Draft; dsh-TUI has claimed the first Host conformance ([decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)).

### 2.2 Phrasing Boundaries: What You Can and Cannot Say

After passing any evidence class, public statements **MUST** be precisely bound to the evidence class and the standard version:

- A host may only say: "**This host passes v0.15 Host conformance**".
- A plugin may only say: "**This plugin passes v0.15 plugin validation**".

The following statements are **uniformly forbidden** (violations are phrasing violations, handled by the governance process; see [rfcs/0000-governance.md](../rfcs/0000-governance.md)):

- **"Safe plugin" / "safe host"**: at the trusted-in-process level, capability declarations do not constitute a security boundary, and static validation is even less of a code security audit ([rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) principle ④).
- **"Official certification" / "officially compatible with dsh"**: this standard is a community draft and does not represent the official position of dsh.
- Presenting lower-level evidence as higher-level evidence (e.g. passing off "declared compatible" as "tested") — the marketplace five states MUST NOT be upgraded into one another ([spec/host-descriptor.md](host-descriptor.md)).

### 2.3 Test Environment Record Requirements

Any claim of "tested" or "conformance passed" **MUST** be bound to a machine-readable test environment record containing at least the following (a record missing any field is invalid — caught by the record-format validation of the conformance suites, [conformance/suites/](../conformance/suites/README.md), Phase 2 deliverable):

| Field | Content |
| --- | --- |
| Standard version | E.g. `v0.15`, including the schema version used |
| Host | Host ID (the `id` in the descriptor), version, platform, and architecture |
| Plugin | Plugin ID and version (for interop evidence: all participating plugins) |
| Suite | Conformance suite version and commit |
| Time | When the test was executed |
| Result | Pass / fail and the failing items |

## 3. Example

A test environment record (field names illustrative; the suite implementation has the final say):

```json
{
  "standard": { "version": "0.15", "schemaVersion": "0.15" },
  "host": { "id": "org.example.dsh-tui", "version": "1.4.0", "platform": "darwin-arm64" },
  "plugins": [
    { "id": "com.example.message-memory", "version": "1.2.0" }
  ],
  "suite": { "version": "0.15.0", "commit": "<套件 commit hash>" },
  "runAt": "2026-08-18T00:00:00Z",
  "result": "pass"
}
```

A compliant statement: "dsh-TUI 1.4.0 (darwin-arm64) passes v0.15 Host conformance (suite commit `<hash>`, 2026-08-18)."

Non-compliant statements: "this plugin is a safe plugin", "officially certified compatible", "marketplace listing means review passed".

## 4. Errors and Edge Cases

- **Incomplete record fields**: when an environment record lacks any required field such as host platform or suite commit, the evidence is deemed invalid and the claimant MUST downgrade to a lower-level statement (e.g. fall back to "declared compatible").
- **Reusing old evidence after environment drift**: after the host or plugin version changes, old records are not automatically inherited; a bundle MAY lock the full combination of "standard version + host version + plugin version + suite" and reuse the result ([rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) §8).
- **Evidence independence with a shared Adapter**: when two hosts share an Adapter, one side forging its descriptor does not affect the validity determination of the other's evidence — each side presents its own evidence independently.
- **Fixtures and suites not yet in place**: before the Phase 2 deliverables, any claim of "passes v0.15 Host conformance / plugin validation" has no verifiable basis, and all parties MUST state this honestly beforehand.

## 5. Fixtures

The "MUST" clauses of this spec correspond to the following fixtures / tests (paths are planning conventions):

| Clause | Fixture / test that catches it |
| --- | --- |
| Host integration and descriptor of interop evidence MUST be independent | `conformance/suites/` evidence-inventory check |
| Test environment record MUST contain all required fields | `conformance/suites/` record-format validation |
| The behavioral surface covered by Host conformance | `conformance/suites/` (negotiation / authorization denial / activation ordering / exceptions / repeated activation / cleanup) |
| Declarations match implementation (plugin validation) | `conformance/fixtures/manifest/` + `conformance/fixtures/facet/` |

## 6. Changelog

| Date | Changes |
| --- | --- |
| 2026-08-18 | Initial draft: four evidence classes, phrasing boundaries, test environment record requirements (source: v0.15 §4.4 and §8, issue #23/#24 disposition records) |
