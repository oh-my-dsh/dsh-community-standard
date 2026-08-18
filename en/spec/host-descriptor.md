# Spec: Host Descriptor

> **Status: Draft v0.15 (community draft — not an official dsh standard)**
> Deliverables: [`schemas/host-descriptor.schema.json`](../../schemas/host-descriptor.schema.json) + fixtures

This document defines the "host descriptor": a machine-readable JSON file published by every compatible host (GUI / Web UI / TUI / launcher) that honestly answers "who am I, which contracts do I actually implement, and at what trust level do I run plugins". Host maintainers write it; negotiators, marketplaces, and CI consume it.

## 1. Scope

This document specifies the per-field semantics of the Host Descriptor and the host's declaration obligations. The following are out of scope:

- Rules for matching a Descriptor against a manifest → [negotiation.md](negotiation.md)
- Contract coordinates and versioning dimensions → [VERSIONING.md](../VERSIONING.md)
- The authoritative list of contract entries → [registry/](../registry/README.md)
- Conformance testing and the phrasing boundaries of "tested" evidence → [conformance.md](conformance.md)

## 2. Normative Definitions

### 2.1 Fields Overview

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `descriptorVersion` | string | **Yes** | Descriptor structure version; in v0.15 MUST equal `"0.15"` |
| `id` | string | **Yes** | Stable, organization-namespaced host ID (reverse-domain syntax, same rules as [manifest §3.4](manifest.md)) |
| `execution` | object | **Yes** | Execution environment and trust level (§2.3) |
| `capabilities` | array | **Yes** | Precise entries of actually implemented contracts (§2.4) |
| `apiVersions` | object | No | Host API versions supported per facet (§2.5) |
| `platforms` | array | No | Supported platform identifiers (§2.6) |

### 2.2 `descriptorVersion`

**MUST** be present and equal `"0.15"`. Fixture: `conformance/fixtures/host-descriptor/invalid/missing-descriptor-version.json`.

### 2.3 `execution`

MUST contain two fields:

| Field | Legal values in v0.15 | Meaning |
| --- | --- | --- |
| `environment` | `"node"` | The runtime in which plugin entrypoints actually execute. v0.15 specifies only the Node.js host-side runtime |
| `trustMode` | `"trusted-in-process"` | Trust level. The only level defined in v0.15 |

Any other value MUST be rejected. Fixtures: `conformance/fixtures/host-descriptor/invalid/unknown-trust-mode.json`, `conformance/fixtures/host-descriptor/invalid/unknown-environment.json`. An isolated execution level (`isolated`) requires separately specified evidence such as process/realm isolation and controlled IPC, owned by a future RFC — until then no host may claim that level.

**Disclosure obligation of trusted-in-process (MUST)**: at this level, plugins run in the same process as the host; capability declarations serve compatibility checks, user authorization, and after-the-fact auditing, and **do not constitute a security boundary** — trusted in-process code can technically bypass the standard APIs and call system interfaces directly. The host **MUST** prominently disclose this fact in its product UI or documentation, and MUST NOT package "the plugin declared it" as "overreach was blocked". (The Host conformance suite checks that the disclosure text exists; see [conformance/suites/](../conformance/suites/); phrasing boundaries also in [conformance.md](conformance.md).)

### 2.4 `capabilities`: Only Precise, Actually-Implemented Entries

- An array; each element **MUST** be a **precise contract coordinate** with both `{ "apiVersion", "kind" }` fields present, and the coordinate **MUST** be a real entry in [registry/](../registry/README.md) (or a private entry conforming to the `x-org.example.*` rules; see [VERSIONING.md](../VERSIONING.md)). Fixture: `conformance/fixtures/host-descriptor/invalid/capability-not-precise.json` (non-precise forms such as a missing `kind`).
- A host **MUST** declare only entries it actually implements and whose semantics it can preserve — declaring "roughly supports" is not allowed. When an upstream change makes a capability unable to preserve its semantics, the host **MUST** take the corresponding entry offline instead of faking compatibility with an approximate implementation (fail closed). Asserted against real behavior by the Host conformance suite ([conformance/suites/](../conformance/suites/)).
- A missing `capabilities` field MUST be rejected. Fixture: `conformance/fixtures/host-descriptor/invalid/missing-capabilities.json`.

### 2.5 `apiVersions`

An object whose keys are facet names and whose values are arrays of Host API versions supported by that facet, e.g. `{ "host": ["v1alpha1"] }`. v0.15 specifies only the `host` facet (see [facet-model.md](facet-model.md)). Matching rules during negotiation: [negotiation.md](negotiation.md).

### 2.6 `platforms`

An array of strings, each a platform identifier of the form `<os>-<arch>`, e.g. `"darwin-arm64"`, `"win32-x64"`, `"linux-x64"`. Omitting it means platform-independent.

### 2.7 The Overarching Principle of Honest Declaration

The Descriptor reports only the runtime and trust level the host **actually** provides; fields like `hostType` or `isRemote` MUST NOT be used to replace the three independent dimensions of execution location, UI capability, and authorizing party (rationale in [RFC 0002](../rfcs/0002-runtime-presentation.md)). A statically declared UI type does not thereby become a capability within activation scope.

## 3. The Five Marketplace States and the No-Upgrade Rule

The compatibility states shown by marketplaces and launchers before installation **MUST** distinguish exactly the following five states:

| State | Meaning | Source |
| --- | --- | --- |
| Declared compatible | Static negotiation passed | Negotiation verdict `compatible` (see [negotiation.md](negotiation.md)) |
| Pending authorization | Host supports it, but a sensitive capability has not been authorized by the user | Negotiation verdict `pending-authorization` |
| Tested | A specific combination of host, system, plugin, and test suite has actually passed | Conformance test evidence (see [conformance.md](conformance.md)) |
| Incompatible | A required contract or API range cannot be satisfied | Negotiation verdict `rejected` |
| Unknown | Insufficient information to decide | Missing manifest / Descriptor / registry entry, etc. |

The five states **MUST NOT be upgraded into one another** (MUST): "declared compatible" never equals "tested", let alone "safe"; no UI may present a static negotiation result as tested evidence or a security-review conclusion. Display copy is checked by the Host conformance and marketplace-side suites ([conformance/suites/](../conformance/suites/)).

The default interaction **SHOULD** show but disable incompatible plugins and list the missing contracts, rather than hiding them outright — hiding makes plugins appear to vanish across devices or profiles.

## 4. Example

```json
{
  "descriptorVersion": "0.15",
  "id": "org.example.dsh-webui",
  "apiVersions": { "host": ["v1alpha1"] },
  "execution": {
    "environment": "node",
    "trustMode": "trusted-in-process"
  },
  "capabilities": [
    { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
    { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
    { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver" }
  ],
  "platforms": ["darwin-arm64", "win32-x64", "linux-x64"]
}
```

(Coordinates and IDs are illustrative; the Registry has the final say.)

## 5. Errors and Edge Cases

| Case | Required behavior | Fixture / test that catches it |
| --- | --- | --- |
| Missing `descriptorVersion` or value other than `"0.15"` | Reject the Descriptor | `invalid/missing-descriptor-version.json` |
| Missing `execution` | Reject (the trust level MUST be explicitly disclosed) | `invalid/missing-execution.json` |
| `trustMode` / `environment` has an undefined value | Reject | `invalid/unknown-trust-mode.json`, `invalid/unknown-environment.json` |
| `capabilities` element is not a precise coordinate (missing fields) | Reject | `invalid/capability-not-precise.json` |
| Missing `capabilities` | Reject | `invalid/missing-capabilities.json` |
| Declared an entry that is not actually implemented | Conformance test failure; MUST NOT claim a pass | Suites behavior-comparison assertions |
| Describing trusted-in-process as a sandbox | Violates the disclosure obligation; MUST NOT claim Host conformance | Suites disclosure check |

## 6. Corresponding Fixtures

Fixtures are created by a follow-up task; the agreed paths are as follows:

- `conformance/fixtures/host-descriptor/valid/minimal.json`
- `conformance/fixtures/host-descriptor/valid/full.json`
- `conformance/fixtures/host-descriptor/invalid/missing-descriptor-version.json`
- `conformance/fixtures/host-descriptor/invalid/missing-execution.json`
- `conformance/fixtures/host-descriptor/invalid/missing-capabilities.json`
- `conformance/fixtures/host-descriptor/invalid/capability-not-precise.json`
- `conformance/fixtures/host-descriptor/invalid/unknown-trust-mode.json`
- `conformance/fixtures/host-descriptor/invalid/unknown-environment.json`

## 7. Changelog

| Version | Changes |
| --- | --- |
| v0.15 | First complete draft. `capabilities` changed from a name–version map to precise registry coordinate entries; `trustMode` converged to the single defined level `trusted-in-process` with the disclosure obligation implemented; the marketplace five-state rule finalized here. Originates from the v0.1 design draft §3.1 deliverable 2 and principles ③④. |
