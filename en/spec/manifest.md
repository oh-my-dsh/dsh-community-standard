# Spec: Plugin Manifest (`dsh-plugin.json`)

> **Status: Draft v0.15 (community draft — not an official dsh standard)**
> Deliverables: [`schemas/dsh-plugin.schema.json`](../../schemas/dsh-plugin.schema.json) + `conformance/fixtures/manifest/{valid,invalid}/`

This document defines every field of the `dsh-plugin.json` file at the root of a plugin package: it is the plugin's "identity card + requirements list", readable by hosts, marketplaces, and CI tools **without running plugin code**. Plugin authors write it; hosts and toolchains consume it.

## 1. Scope

This document specifies the manifest's **file location, staticness requirements, and per-field semantics**. The following are out of scope:

- Execution details of facets (entry module format, execution environment) → [facet-model.md](facet-model.md)
- Contract coordinates and versioning rules (`apiVersion + kind`, the meaning of `v1alpha1`) → [VERSIONING.md](../VERSIONING.md)
- The authoritative list of contract entries → [registry/](../registry/README.md)
- How hosts use the manifest for compatibility decisions → [negotiation.md](negotiation.md)
- Event envelope fields → [event-envelope.md](event-envelope.md)

## 2. File Location and Naming

The manifest MUST satisfy:

1. The file is named **`dsh-plugin.json`** and located at the package root. Violations are caught by `conformance/fixtures/manifest/invalid/` (discovery-phase assertions; see [conformance/suites/](../conformance/suites/)).
2. It is **static JSON**: generating it dynamically by running JavaScript or other code is forbidden. Violations are caught by the suites' discovery checks.

The name is deliberately not `plugin.json`: the [Agent Plugins Specification](https://agent-plugins.org/specification) already reserves a root-level `plugin.json` for its own manifest contract. A package may carry both files to support both ecosystems, but neither may override or implicitly extend the other.

## 3. Normative Definitions

### 3.1 Staticness Requirements

- For standard-managed plugins, hosts **MUST** read only the static manifest and MUST NOT execute any dynamic manifest code (fixture: discovery-phase assertion in the suites).
- When loading plugins, hosts **MUST** use the local schema shipped with the host; fetching schemas or other validation policies from the network is forbidden (fixture: offline-environment assertion in the suites).

### 3.2 Top-Level Fields Overview

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `$schema` | string | **Yes** | Canonical schema identifier; the host uses it to select its local validation rules |
| `id` | string | **Yes** | Globally unique plugin ID, reverse-domain syntax (§3.4) |
| `name` | string | **Yes** | Human-readable name |
| `version` | string | **Yes** | The plugin's own SemVer version (versioning dimensions in [VERSIONING.md](../VERSIONING.md)) |
| `manifestVersion` | string | **Yes** | Manifest structure version; in v0.15 it MUST equal `"0.15"` (§3.3) |
| `facets` | object | **Yes** | Facet declarations for each execution location (§3.5) |
| `requires` | object | No | Contract dependencies (§3.7) |
| `permissions` | array | No | Sensitive scopes requested for user/policy authorization (§3.8) |
| `contributes` | object | No | Declarative contribution metadata (§3.9) |
| `subscriptions` | array | No | Event subscriptions (§3.10) |

The top level **MUST** contain only the fields in the table above; any other field (including `provides`) MUST be rejected. Fixtures: `conformance/fixtures/manifest/invalid/unknown-field.json`, `conformance/fixtures/manifest/invalid/provides-rejected.json`.

### 3.3 `$schema` and `manifestVersion`

- `$schema` **MUST** be present and MUST be a canonical identifier the host recognizes. Once the official schema is published, its canonical identifier MUST NOT be reassigned to different content. Fixture: `conformance/fixtures/manifest/invalid/missing-schema.json`.
- `manifestVersion` **MUST** match the schema version selected by `$schema`; it MUST NOT become another negotiation axis. In v0.15 its value **MUST** be `"0.15"`. Fixture: `conformance/fixtures/manifest/invalid/wrong-manifest-version.json`.
- The current canonical identifier is `https://dsh-std.example/schemas/dsh-plugin/v0.15.json` (illustrative; the Registry has the final say).

### 3.4 `id`: Syntax and Namespace Ownership

- `id` **MUST** be lowercase reverse-domain form: at least two dot-separated segments, each containing only lowercase letters, digits, and hyphens (e.g. `com.example.better-sidebar`). Fixture: `conformance/fixtures/manifest/invalid/bad-id.json`.
- Plugin authors **SHOULD** use only domain prefixes under their own control; proof and transfer of namespace ownership belong to the governance process ([RFC 0000](../rfcs/0000-governance.md)) and are not specified in this version.
- The rules for the coordinate namespace of private/experimental contracts (the `x-org.example.*` form) are in [VERSIONING.md](../VERSIONING.md); that namespace and the plugin `id` are two separate namespaces — do not mix them.

### 3.5 `facets`

- `facets` **MUST** contain the `host` facet; every facet declaration **MUST** contain `entry` (the entry file, located inside the package root) and `apiVersion` (the required Host API version). Fixture: `conformance/fixtures/manifest/invalid/missing-facets.json`.
- `client` / `worker` are **reserved names**: a v0.15 manifest containing either key MUST be rejected (ownership and contract in [RFC 0002](../rfcs/0002-runtime-presentation.md)). Fixture: `conformance/fixtures/manifest/invalid/reserved-facet-client.json`.
- v0.15 specifies the complete contract of the `host` facet only; the module format and execution environment of `entry` are covered in [facet-model.md](facet-model.md).

### 3.6 Semantic Boundaries of the Five Declaration Kinds

The manifest contains five kinds of declarations with mutually independent semantics; they **MUST NOT** be treated as the same kind of compatibility or security object just because they live in one file:

| Declaration | Meaning | v0.15 status |
| --- | --- | --- |
| `requires` | Versioned contracts the plugin depends on (required and optional) | Only `requires.contracts` accepted |
| `permissions` | Sensitive scopes needing user or policy authorization; host support ≠ authorized | Accepted (§3.8) |
| `provides` | Exports a service / Provider contract to other plugins or the host | **Rejected** (owned by [RFC 0003](../rfcs/0003-service-composition.md)) |
| `contributes` | Declarative metadata discoverable before plugin code runs | Only `contributes.commands` accepted |
| `subscriptions` | Controls event delivery after eager activation; **not** an activation trigger | Accepted (§3.10) |

Until the service composition contract is accepted, v0.15 **MUST** reject `provides` and `requires.services` outright, rather than silently storing them and presenting them as "already in effect". Fixtures: `conformance/fixtures/manifest/invalid/provides-rejected.json`, `conformance/fixtures/manifest/invalid/requires-services-rejected.json`.

### 3.7 `requires.contracts`

- An array; each element **MUST** contain both `apiVersion` and `kind`, which together form a contract coordinate (e.g. `storage.dsh/v1alpha1` + `LocalStorage`; coordinate rules in [VERSIONING.md](../VERSIONING.md)).
- The `optional` field **MAY** be omitted and defaults to `false` (a required dependency).
- Missing required contract → load rejection; missing optional contract → run along the declared degradation path. Decision rules in [negotiation.md](negotiation.md).
- The v0.15 standard contract entries (`commands.dsh/v1alpha1`, `storage.dsh/v1alpha1`, `messages.dsh/v1alpha1` — all illustrative; the Registry has the final say) have [registry/](../registry/README.md) as their single authoritative source; implementers MUST NOT invent "equivalent" names from the body of this document.

### 3.8 `permissions`

- An array of strings declaring sensitive scopes **beyond contract coordinates**.
- v0.15 does not standardize any standalone sensitive scope yet, so this array is usually empty (`"permissions": []`). Authorization for sensitive capabilities such as message observation is driven by the sensitivity level of registry entries (see [registry/](../registry/README.md) and [negotiation.md](negotiation.md)); do **NOT** re-declare contracts in `permissions`.

### 3.9 `contributes`

- v0.15 defines only `contributes.commands`: an array where each item **MUST** contain `id` and `title`.
- Each `id` **MUST** be globally unique across all installed plugins and **SHOULD** be prefixed with the plugin's own `id`. Fixture: `conformance/fixtures/manifest/invalid/duplicate-contributes-id.json` (duplicates within a single manifest).
- Hosts and marketplaces **MUST** run a cross-plugin static conflict check before installation: on conflict, refuse the co-installation and clearly report "conflict — cannot coexist", instead of letting the plugins overwrite each other at load time (asserted by the conflict scenario in the suites).
- `contributes` is metadata only: it implies no runtime access, authorization, or activation. A command contribution also requires declaring `commands.dsh/v1alpha1` (kind: Command) in `requires.contracts`; plugin code binds handlers by `id` only. Both "declared but not bound" and "bound but not declared" SHOULD be reported by development tools and conformance tests (see [conformance.md](conformance.md)).

### 3.10 `subscriptions`

- An array of strings, each an **event name**; canonical event names are defined by registry event entries, and implementers MUST NOT invent "equivalent" names from the body of this document. The only standard event in v0.15 has the event name `messages.observe` (an immutable observation event; contract coordinate `messages.dsh/v1alpha1`, kind: MessageObserver — illustrative; the Registry has the final say). The authoritative entry is [registry/events/messages.dsh-v1alpha1.md](../registry/events/messages.dsh-v1alpha1.md); the envelope format is in [event-envelope.md](event-envelope.md).
- `subscriptions` only controls event delivery; it is not an activation trigger — matching a subscription does not activate an inactive plugin (activation model in [lifecycle.md](lifecycle.md)).

### 3.11 Authoritative Source for Fields Duplicated in npm Metadata

Fields such as `name` and `version` may duplicate `package.json`. Rule: **for standard consumers (hosts, marketplaces, negotiators), `dsh-plugin.json` is the single authoritative source**; `package.json` continues to serve package managers. The two files **SHOULD** stay consistent, and validation tools SHOULD warn on inconsistency.

## 4. Example

A fully declared v0.15 manifest (i.e. the contents of `conformance/fixtures/manifest/valid/full.json`; coordinates and URLs are illustrative, the Registry has the final say):

```json
{
  "$schema": "https://dsh-std.example/schemas/dsh-plugin/v0.15.json",
  "id": "com.example.better-sidebar",
  "name": "Better Sidebar",
  "version": "1.2.0",
  "manifestVersion": "0.15",
  "facets": {
    "host": { "entry": "dist/host.js", "apiVersion": "v1alpha1" }
  },
  "requires": {
    "contracts": [
      { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
      { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver", "optional": true }
    ]
  },
  "permissions": [],
  "contributes": {
    "commands": [{ "id": "com.example.better-sidebar.toggle", "title": "Toggle Sidebar" }]
  },
  "subscriptions": ["messages.observe"]
}
```

The minimal valid manifest needs only the six fields `$schema`, `id`, `name`, `version`, `manifestVersion`, `facets` (see `conformance/fixtures/manifest/valid/minimal.json`).

## 5. Errors and Edge Cases

| Case | Required behavior | Fixture / test that catches it |
| --- | --- | --- |
| Missing `$schema` or unrecognized value | Reject loading | `invalid/missing-schema.json` |
| `manifestVersion` inconsistent with `$schema` | Reject loading | `invalid/wrong-manifest-version.json` |
| Missing `facets` or missing `host` facet | Reject loading | `invalid/missing-facets.json` |
| `id` not in reverse-domain syntax | Reject loading | `invalid/bad-id.json` |
| Undefined field at top level | Reject loading (fail closed; do not silently ignore) | `invalid/unknown-field.json` |
| `provides` present | Reject loading (owned by RFC 0003) | `invalid/provides-rejected.json` |
| `requires.services` present | Reject loading (owned by RFC 0003) | `invalid/requires-services-rejected.json` |
| Reserved facet name `client` / `worker` present | Reject loading (owned by RFC 0002) | `invalid/reserved-facet-client.json` |
| Duplicate `id` inside `contributes` | Reject loading | `invalid/duplicate-contributes-id.json` |
| Cross-plugin `contributes.id` conflict | Refuse installation before install; report "conflict — cannot coexist" | Suites conflict scenario |
| Manifest is not static JSON / requires running code to generate | Not eligible for standard-managed loading | Suites discovery-phase assertion |

## 6. Corresponding Fixtures

Fixtures are created by a follow-up task; the agreed paths are as follows (each invalid sample violates exactly one rule):

- `conformance/fixtures/manifest/valid/minimal.json`
- `conformance/fixtures/manifest/valid/full.json`
- `conformance/fixtures/manifest/invalid/missing-schema.json`
- `conformance/fixtures/manifest/invalid/wrong-manifest-version.json`
- `conformance/fixtures/manifest/invalid/missing-facets.json`
- `conformance/fixtures/manifest/invalid/bad-id.json`
- `conformance/fixtures/manifest/invalid/unknown-field.json`
- `conformance/fixtures/manifest/invalid/provides-rejected.json`
- `conformance/fixtures/manifest/invalid/requires-services-rejected.json`
- `conformance/fixtures/manifest/invalid/reserved-facet-client.json`
- `conformance/fixtures/manifest/invalid/duplicate-contributes-id.json`
- `conformance/fixtures/manifest/invalid/entry-outside-root.json`

Of these, `duplicate-contributes-id.json` (deduplication by `id` is cross-element semantics) and `entry-outside-root.json` (being inside the root is filesystem semantics) cannot be expressed in JSON Schema: both pass schema validation but MUST be rejected by the validator's static checks beyond the schema (conventions in [conformance/fixtures/README.md](../conformance/fixtures/README.md)).

## 7. Changelog

| Version | Changes |
| --- | --- |
| v0.15 | First complete draft. Contract references fully moved to `apiVersion + kind` coordinates; introduced `facets` (`host` only in this round); froze the semantics of the five declaration kinds; `provides` / `requires.services` explicitly rejected. Originates from the v0.1 design draft §3.1/§4.1 and the round-2 discussion disposition ([decisions/round-2](../decisions/round-2-issue-24.md)). |
