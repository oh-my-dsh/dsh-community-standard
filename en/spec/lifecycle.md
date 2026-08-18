# Spec: Lifecycle

> **Status: Draft v0.15 (community draft — not an official dsh standard)**

This document governs "when to activate, how to shut down, and who owns the resources": the host state machine, the activation state machine, activation timing (generation-scoped eager activation), shutdown semantics, plus Broker ownership and the minimal effect ledger. Who should read it: **host maintainers** (implement activation/deactivation ordering per this document), **plugin authors** (write cleanup to be re-runnable), **conformance test authors** (the basis for the fixtures lives here).

Normative definitions of the terms (Component / Facet / Activation, etc.) are in [facet-model.md](facet-model.md) and are not repeated here.

## 1. Scope

- This document specifies the lifecycle of the **host-side `host` facet**: the state transitions of the host product itself, and the state transitions of each activation instance of each plugin entrypoint.
- This document does **NOT** specify the lifecycle of `client` / `worker` facets or cross-facet communication (owned by [RFC 0002](../rfcs/0002-runtime-presentation.md)).
- The internal decision rules of negotiation and authorization are in [negotiation.md](negotiation.md); this document specifies only their **position and ordering** in the state machine.

## 2. Normative Definitions

### 2.1 Two State Machines, Kept Separate

The states of the host product and the states of plugin activations are **two independent state machines**; they MUST NOT be collapsed into one field, and the state of an activation MUST NOT be inferred from the host state.

**Host state machine**:

```text
starting → ready → stopping → stopped
```

| State | Meaning |
| --- | --- |
| `starting` | Host is starting; its own initialization is not yet complete |
| `ready` | Host can activate plugins; one runtime generation is assembled in this state |
| `stopping` | Graceful shutdown has begun; no new plugins are activated, activated plugins are deactivated best-effort |
| `stopped` | Host process has terminated; no lifecycle callbacks are guaranteed to be delivered anymore |

**Activation state machine** (each activation of each plugin goes through it independently):

```text
discover → validate → negotiate → authorize
→ activating → active → deactivating → disposed
```

| State | Meaning | Where failures go |
| --- | --- | --- |
| `discover` | Locate the package and static manifest (without executing plugin code) | Skip the plugin; do not enter later states |
| `validate` | Manifest passes schema and static validation | Load rejection, with a user-readable reason |
| `negotiate` | Pure-function negotiation of manifest × Host Descriptor | Missing required → load rejection |
| `authorize` | Sensitive capabilities obtain user or policy authorization | Not authorized → load rejection or pending authorization |
| `activating` | Invoke the plugin's activation hook and construct the activation-scoped context | Exception/timeout → straight to `disposed` (recorded in the ledger) |
| `active` | Plugin works normally; all registrations belong to this activation | — |
| `deactivating` | Best-effort deactivation: abort, drain, release effects in order | Individual failures recorded as `cleanup-failed`, without blocking the whole |
| `disposed` | Terminal state; this activation's resources are released or the residue is recorded | — |

Normative requirements:

- The host **MUST**, while in the ready state and before executing any plugin code, complete the pre-phases in the order `discover → validate → negotiate → authorize` (violations are caught by `conformance/fixtures/lifecycle/activation-order.json` — the fixture scrambles the phase order and asserts the negotiator refuses or the host errors).
- The host **MUST** guarantee the above state order for normal activations; skipping a phase to jump straight into `activating` is illegal (covered by the same fixture).
- The host **SHOULD** catch ordinary exceptions crossing standard callback / Promise boundaries and convert them into stable errors; the trusted-in-process level **CANNOT** isolate `process.exit`, native crashes, or infinite loops, and hosts MUST NOT claim otherwise (phrasing boundaries in [conformance.md](conformance.md)).
- `activate` / `deactivate` are activation-instance hooks invoked by the host, **NOT** ordinary business events a plugin can subscribe to; plugins **MUST NOT** treat a subscription hit as an activation signal (see §2.2).

### 2.2 Generation-Scoped Eager Activation (No On-Demand Activation in v0.15)

v0.15 adopts **generation-scoped eager activation**: when assembling a **runtime generation**, the host activates all plugins selected for that generation that passed negotiation and authorization. A runtime generation is the plugin-composition instance determined by one "startup / HMR / profile reassembly" of the host; it is activated and torn down as a whole, generation by generation.

Normative requirements:

- After completing discover / negotiate / authorize, the host **MUST** activate all selected plugins immediately when assembling the runtime generation, and **MUST NOT** wait for first use (violations caught by `conformance/fixtures/lifecycle/no-lazy-activation.json` — the fixture executes a plugin's declared command and hits its subscription while the plugin is not activated, and asserts the plugin stays inactive).
- A contribution only describes discoverable functionality, and a subscription only controls event delivery; executing a command, requesting a Provider, or matching a subscription **CANNOT** activate an inactive plugin (covered by the same fixture).
- Plugins **MUST NOT** be written on the assumption of "start me when I'm used"; any startup side effect happens in `activating`.

**Why no on-demand activation** (rejected alternative; full argument in [RFC 0001](../rfcs/0001-core-contract.md)): on-demand activation implies a second lifecycle (every contribution point is a potential activation point), concurrency races on first call, and delayed failures that push startup errors onto user actions. v0.15 first establishes a verifiable baseline with eager activation; on-demand activation belongs to "future measurement-based proposals", to be revisited with real performance data.

### 2.3 Shutdown Semantics: Best-Effort; Cleanup MUST Be Re-runnable

- On graceful shutdown (host enters `stopping`), the host **MUST** perform a best-effort deactivate on every active plugin: stop accepting new calls, abort and drain within explicit time bounds, release effects in contract order (ordering and bounds recorded as results in the effect ledger, see §2.5; violations caught by `conformance/fixtures/lifecycle/graceful-shutdown.json` — the fixture asserts that on graceful shutdown every active plugin receives deactivate and the ledger reaches a terminal state).
- On process crash, power loss, or force-kill, the host **DOES NOT guarantee** delivery of `deactivate` (this scenario is fixed by `conformance/fixtures/lifecycle/crash-no-deactivate.json`: kill the process, restart, and assert the host reports `orphaned` / `unknown` rather than fabricating cleanup success).
- Therefore plugins **MUST** design cleanup to be **re-runnable**: `deactivate` may be called zero, one, or multiple times, and the next startup may need to recover state left over from a previous crash (violations caught by `conformance/fixtures/lifecycle/cleanup-repeatable.json` — the fixture calls deactivate twice on the same activation and asserts the second call neither throws nor produces duplicate effects).

### 2.4 Repeated Activation Under HMR / Profile Reassembly

While the host stays ready, the same plugin may be **repeatedly activated / disposed** due to HMR or profile reassembly:

- Each re-activation **MUST** create a new activation identity (a new `activationId`); the old activation's ownership history remains queryable, while current resources point to the new owner (violations caught by `conformance/fixtures/lifecycle/duplicate-activation.json` — the fixture activates the same plugin twice and asserts the two `activationId`s differ and all effects of the old activation are released or handed over).
- Plugins **MUST** assume the same entrypoint will be activated repeatedly: module-level global state is not a safe; all resources go onto the activation scope (`activation.scope.add` or an equivalent mechanism) and are uniformly reclaimed by the host at deactivate.
- The full semantics of Provider replacement (cardinality, conflict plans, old/new owner handover) belong to [RFC 0003](../rfcs/0003-service-composition.md); this document specifies only that "replacement produces a new activation identity".

### 2.5 Broker Ownership

All standard registrations (command handlers, subscriptions, Providers, UI contributions, and future registrations owned by an activation) **MUST** go through the Host API Broker, which attributes each one to **which activation of which plugin** (principle ⑥). Plugins or Adapters **MUST NOT** bypass the Broker, register standard capabilities themselves, and then claim they belong to some activation (violations caught by `conformance/fixtures/lifecycle/ledger-ownership.json` — the fixture asserts every standard registration in the ledger carries the current `pluginId` + `activationId`, and a plugin cannot impersonate another owner).

### 2.6 Minimal Effect Ledger

The Broker **MUST** maintain a machine-readable minimal effect ledger: an **append-only, immutable** record of transfers that lets diagnostics and cleanup answer "which plugin created, replaced, or failed to release this resource". This document defines only the v0.15 minimal version; the full version (materialized views, recovery scans, observer metadata, retention policy) is in [RFC 0004](../rfcs/0004-provenance-diagnostics.md) §8–§9 and is not repeated here.

Each record **MUST** contain (field names illustrative; the Registry has the final say):

| Field | Content |
| --- | --- |
| `ledgerVersion`, `recordId`, `sequence`, `recordedAt` | Ledger structure version, record ID, monotonically increasing sequence number, recording time |
| Owner: `pluginId`, `pluginVersion` or `manifestDigest`, `activationId`, `runtimeId` | Who this effect belongs to, and to which activation |
| `effectId`, `effectKind`, contract coordinate (apiVersion + kind + version), `resourceId` (when present) | What this effect is and which contract it corresponds to |
| `operation` and result `state` | At least covering `create` / `bind` / `replace` / `release` / `cleanup-failed` |
| `correlationId` (optional), old/new owner or related effect IDs of a replacement (optional), `outcome` or canonical `errorCode` (optional, no sensitive data) | Diagnostics and replacement chains |
| `sensitivityClass` and the redaction policy actually applied | What sanitization this record went through |

Normative requirements:

- The ledger **MUST** be append-only: existing records MUST NOT be modified or deleted; state changes are expressed as new records (violations caught by `conformance/fixtures/lifecycle/ledger-append-only.json` — the fixture attempts to overwrite/delete existing records and asserts rejection).
- By default the ledger **MUST NOT** contain message bodies, secrets, command arguments, or arbitrary plugin payloads (violations caught by `conformance/fixtures/lifecycle/ledger-no-secrets.json` — the fixture submits a registration containing a secret value to the Broker and asserts the serialized ledger record does not contain that value).
- The Broker **MUST** cooperate with the host's native lifecycle to attempt bounded cleanup at dispose and record the result; cleanup failures **MUST** be recorded as `cleanup-failed`, never silently swallowed (violations caught by `conformance/fixtures/lifecycle/graceful-shutdown.json`).
- Hosts **MAY** attach versioned extension fields beyond the minimal set, but extension fields are not part of the v0.15 contract and are equally subject to the "no sensitive data" constraint.

## 3. Examples

The activation timeline of two plugins in a normal generation (the order within `activating` is up to the host, but the pre-phase order is fixed):

```text
host: starting ──────────────▶ ready ──────────────────────────▶ stopping → stopped
                                 │组装 generation                 │
plugin A: discover→validate→negotiate→authorize→activating→active ──▶ deactivating → disposed
plugin B: discover→validate→negotiate→authorize→activating→active ──▶ deactivating → disposed
```

A minimal effect ledger record (field names and values illustrative; the Registry has the final say):

```json
{
  "ledgerVersion": "0.15.0",
  "recordId": "rec_01J4Z…",
  "sequence": 17,
  "recordedAt": "2026-08-18T03:00:00Z",
  "pluginId": "com.example.message-memory",
  "pluginVersion": "1.2.0",
  "activationId": "act_9d21…",
  "runtimeId": "rt_host_01",
  "effectId": "eff_44ab…",
  "effectKind": "command-handler",
  "contract": { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
  "resourceId": "com.example.message-memory.show-last",
  "operation": "bind",
  "state": "ok",
  "correlationId": "req_7c1e…",
  "sensitivityClass": "low",
  "redactionPolicy": "default-v0.15"
}
```

## 4. Errors and Edge Cases

| Case | Required behavior |
| --- | --- |
| Any pre-phase fails | Does not enter `activating`; missing required gets a readable load-rejection reason, missing optional follows the declared degradation path (decision rules in [negotiation.md](negotiation.md)) |
| Exception or timeout in `activating` | Go straight to `disposed`, record the failure in the ledger; the host continues activating other plugins — one plugin's activation failure does not block the generation |
| A single resource release fails during `deactivating` | Record `cleanup-failed` and continue releasing the rest; does not block the whole activation from reaching `disposed` |
| Residual resources found on restart after a crash | The recovery scan compares persistent resource markers with the last durable ledger and reports `orphaned` / `unknown`; it MUST **NOT** fabricate cleanup success |
| Duplicate contributions with the same ID | The static conflict check intercepts them in the validate phase (rules in [manifest.md](manifest.md)) |
| Plugin invokes standard capabilities outside `active` | Treated as a contract violation; the host MAY refuse and record it in the ledger |

## 5. Corresponding Fixtures

> Fixtures are created by a follow-up task; paths are agreed paths; each invalid sample embeds exactly one fault (conventions in [conformance/fixtures/README.md](../conformance/fixtures/README.md)).

| Fixture (agreed path) | The "MUST" it catches |
| --- | --- |
| `conformance/fixtures/lifecycle/activation-order.json` | Pre-phase ordering; no phase-skipping activation |
| `conformance/fixtures/lifecycle/no-lazy-activation.json` | Eager activation; commands / subscriptions do not activate inactive plugins |
| `conformance/fixtures/lifecycle/graceful-shutdown.json` | Best-effort deactivate on graceful shutdown; cleanup failures recorded as `cleanup-failed` |
| `conformance/fixtures/lifecycle/crash-no-deactivate.json` | Crash: delivery not guaranteed; restart reports `orphaned` / `unknown` |
| `conformance/fixtures/lifecycle/cleanup-repeatable.json` | Plugin cleanup is re-runnable |
| `conformance/fixtures/lifecycle/duplicate-activation.json` | Repeated activation produces a new `activationId`; old effects released or handed over |
| `conformance/fixtures/lifecycle/ledger-ownership.json` | Every standard registration is attributed to plugin + activation; owner impersonation forbidden |
| `conformance/fixtures/lifecycle/ledger-append-only.json` | Ledger is append-only, cannot be modified or deleted |
| `conformance/fixtures/lifecycle/ledger-no-secrets.json` | Ledger contains no message bodies or secrets by default |

## 6. Changelog

| Version | Date | Changes |
| --- | --- | --- |
| v0.15 | 2026-08 | Initial draft: split out from RFC 0001 §7.4 / §7.6, fixture conventions added; full effect ledger linked to [RFC 0004](../rfcs/0004-provenance-diagnostics.md) |
