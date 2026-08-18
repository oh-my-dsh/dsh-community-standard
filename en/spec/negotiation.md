# Spec: Meta-Protocol Negotiation Kernel (Negotiation)

> **Status: Draft v0.15 (community draft — not an official dsh standard)**
> Deliverable: [`schemas/negotiation-report.schema.json`](../../schemas/negotiation-report.schema.json)
> Reader's note: half of this spec is written for host developers implementing a negotiator, half for tool authors consuming negotiation reports in CI; §4 gives complete examples of all three outcomes.

This document defines "negotiation": given a plugin manifest and a Host Descriptor, **without running any plugin code**, statically compute "can it be installed, can it run, does the user need to be asked first", and produce a machine-readable report. It is a domain-agnostic pure function, testable without dsh.

## 1. Scope

This document specifies the signature of the negotiation pure function, the matching rules, the three verdicts, and the report format. The following are out of scope:

- Per-field manifest semantics → [manifest.md](manifest.md)
- Per-field Host Descriptor semantics and the marketplace five states → [host-descriptor.md](host-descriptor.md)
- Contract coordinate rules and registry entries → [VERSIONING.md](../VERSIONING.md), [registry/](../registry/README.md)
- Where negotiation sits in the overall activation flow (the `negotiate` phase) → [lifecycle.md](lifecycle.md)

## 2. Normative Definitions

### 2.1 Function Signature and Purity

```text
negotiate(manifest, hostDescriptor, registrySnapshot) → report
```

Negotiation **MUST** be a pure function:

- No I/O, no network access, no reading clocks or randomness sources; identical inputs **MUST** produce identical reports;
- It MUST NOT import dsh / Cordis / any host product code — it MUST be runnable in CI without dsh installed;
- `registrySnapshot` is a frozen snapshot of [registry/](../registry/README.md) entries, passed in as input (in v0.15, the three standard entries); the negotiator MUST NOT invent entries from the body of the spec itself.

The kernel does exactly three things: parse participant declarations, resolve `apiVersion + kind` contract references, and perform requires/supports matching.

### 2.2 Preconditions

Before entering negotiation, the manifest and the Host Descriptor **MUST** each have passed their own schema validation (i.e. the lifecycle `validate` phase has passed; see [lifecycle.md](lifecycle.md)). Negotiator behavior on invalid input is unspecified — tools SHOULD validate before invoking negotiation.

### 2.3 Matching Rules

Run three kinds of checks in order:

1. **Facet check**: for each facet in the manifest's `facets`, its `apiVersion` **MUST** appear in the Descriptor's `apiVersions[facet]` array; failures are recorded in `unsupportedFacets`.
2. **Contract check**: for each item in `requires.contracts`, find an entry in the Descriptor's `capabilities` where `apiVersion` and `kind` are **both exactly equal** (coordinate rules in [VERSIONING.md](../VERSIONING.md)). No match for a required contract → record in `missingRequired`; no match for an optional contract → record in `degradedOptional`.
3. **Sensitivity check**: for all **successfully matched** declarations (including events referenced by `subscriptions`), look up the sensitivity level in the registry snapshot; those marked as requiring authorization are recorded in `awaitingAuthorization`. Optional-and-missing declarations do not enter this step — missing means degraded, no authorization needed.

### 2.4 Verdict Rules

| verdict | Condition | Meaning |
| --- | --- | --- |
| `rejected` | `missingRequired` or `unsupportedFacets` is non-empty | Load rejection: explicitly refuse before installation/activation |
| `pending-authorization` | No rejections, and `awaitingAuthorization` is non-empty | Host supports it, but user or policy authorization is required before activation |
| `compatible` | Neither of the above | Static negotiation passed (`degradedOptional` may be non-empty) |

- **Missing required → load rejection**, and the report **MUST** carry a human-readable reason: what the plugin needs and what the current environment lacks. Example style: "This plugin requires graphical UI capability, which the current terminal does not support." A report that outputs only coordinate strings with no human-readable explanation is non-conformant. Fixture: `conformance/fixtures/negotiation/rejected-missing-required/expected-report.json`.
- **Missing optional → degraded**: the verdict stays `compatible`, the missing items are listed in `degradedOptional`, and the plugin runs along its declared degradation path (semantics in [manifest.md §3.7](manifest.md)). Fixture: `conformance/fixtures/negotiation/degraded-optional/expected-report.json`.
- **Pending authorization is not a rejection**: `pending-authorization` means "usable once authorized"; the authorization flow itself (when to ask, how to record) is the responsibility of the host's `authorize` phase (see [lifecycle.md](lifecycle.md)) and is not part of this pure function.
- The mapping from reports to the marketplace five states (declared compatible / pending authorization / tested / incompatible / unknown, with no mutual upgrades) is in [host-descriptor.md §3](host-descriptor.md) and is not repeated here.

### 2.5 Negotiation Report Format

The report is a single JSON object; schema: [`schemas/negotiation-report.schema.json`](../../schemas/negotiation-report.schema.json):

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `reportVersion` | string | **Yes** | Report format version; in v0.15 MUST equal `"0.15"` |
| `verdict` | string | **Yes** | One of `compatible` / `rejected` / `pending-authorization` |
| `message` | string | **Yes** | Human-readable conclusion; for `rejected` it MUST contain the readable reason required by §2.4 |
| `missingRequired` | array | No | Missing required contract coordinates (`{ apiVersion, kind }`) |
| `degradedOptional` | array | No | Missing optional contract coordinates (degraded items) |
| `awaitingAuthorization` | array | No | Coordinates of sensitive declarations awaiting authorization |
| `unsupportedFacets` | array | No | Facet API version mismatches (`{ facet, requiredApiVersion, supportedApiVersions }`) |

Hosts, marketplaces, launchers, and CI **MUST** all consume the same report format — the community's earlier plugin-validation report requirements (the format requests from qing3a / dsh-plugin-verify) have been merged into this format and no longer exist separately (background in [decisions/round-1](../decisions/round-1-issue-23.md)).

## 3. Example Input

The following examples share one Descriptor (coordinates illustrative; the Registry has the final say):

```json
{
  "descriptorVersion": "0.15",
  "id": "org.example.dsh-tui",
  "apiVersions": { "host": ["v1alpha1"] },
  "execution": { "environment": "node", "trustMode": "trusted-in-process" },
  "capabilities": [
    { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
    { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" }
  ]
}
```

## 4. Complete Examples of the Three Outcomes

### 4.1 Compatible (`compatible`)

The manifest declares required `storage.dsh/v1alpha1` plus optional `messages.dsh/v1alpha1`. storage matches; messages does not match but is optional → degraded.

```json
{
  "reportVersion": "0.15",
  "verdict": "compatible",
  "message": "静态协商通过；可选的消息观察能力不可用，插件将按声明的降级路径运行。",
  "degradedOptional": [
    { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver" }
  ]
}
```

### 4.2 Load Rejection (`rejected`)

The manifest declares required `x-org.example.gui.panel/v1alpha1` (kind: Panel); the Descriptor does not provide that coordinate.

```json
{
  "reportVersion": "0.15",
  "verdict": "rejected",
  "message": "该插件需要图形面板能力（x-org.example.gui.panel），当前终端宿主不支持，无法安装。",
  "missingRequired": [
    { "apiVersion": "x-org.example.gui.panel/v1alpha1", "kind": "Panel" }
  ]
}
```

### 4.3 Pending Authorization (`pending-authorization`)

The manifest declares required `messages.dsh/v1alpha1` (kind: MessageObserver); the Descriptor supports the coordinate, but the registry entry marks it as sensitive (sensitivity: high; see [registry/events/messages.dsh-v1alpha1.md](../registry/events/messages.dsh-v1alpha1.md)).

```json
{
  "reportVersion": "0.15",
  "verdict": "pending-authorization",
  "message": "宿主支持该插件，但它需要观察消息内容，等待用户授权后才能激活。",
  "awaitingAuthorization": [
    { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver" }
  ]
}
```

## 5. Errors and Edge Cases

| Case | Required behavior | Fixture / test that catches it |
| --- | --- | --- |
| manifest / Descriptor failed schema validation | Does not enter negotiation (already rejected in the validate phase) | invalid fixtures for manifest and host-descriptor |
| No match for a required contract | verdict `rejected`, with a human-readable explanation of what is missing | `negotiation/rejected-missing-required/` |
| Facet `apiVersion` not in the host's supported list | verdict `rejected`, recorded in `unsupportedFacets` | `negotiation/rejected-unsupported-facet/` |
| No match for an optional contract | verdict `compatible`, recorded in `degradedOptional` | `negotiation/degraded-optional/` |
| Sensitive declaration matched but not authorized | verdict `pending-authorization` | `negotiation/pending-authorization/` |
| Contract coordinate not in registry (including `x-org.*` private coordinates) | Not an error: match by coordinate as usual; if the host didn't declare it, it simply doesn't match | `negotiation/rejected-missing-required/` |
| `requires.contracts` empty and no sensitive declarations | verdict `compatible` | `negotiation/compatible/` |
| Negotiating the same input multiple times | MUST produce byte-identical reports (purity) | Suites determinism assertion |

## 6. Corresponding Fixtures

Fixtures are created by a follow-up task. Each case directory contains three files: `manifest.json`, `host-descriptor.json`, `expected-report.json`:

- `conformance/fixtures/negotiation/compatible/`
- `conformance/fixtures/negotiation/degraded-optional/`
- `conformance/fixtures/negotiation/rejected-missing-required/`
- `conformance/fixtures/negotiation/rejected-unsupported-facet/`
- `conformance/fixtures/negotiation/pending-authorization/`

## 7. Changelog

| Version | Changes |
| --- | --- |
| v0.15 | First complete draft. The negotiation kernel was refactored into a domain-agnostic meta-protocol (contracts are pluggable and independently versioned; this round's disposition in [decisions/round-2](../decisions/round-2-issue-24.md)); verdicts converged to three: compatible / rejected / pending-authorization; the machine-readable report format was finalized, with the community's validation-report requirements merged into this format. |
