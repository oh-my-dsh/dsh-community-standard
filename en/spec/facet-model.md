# Spec: Facet Object Model (Facet Model)

> **Status: Draft v0.15 (community draft — not an official dsh standard)**

What this document governs: it defines "what a plugin looks like in the eyes of the standard" — the four-level object model Component → Facet → Activation → Participant, plus the specification of the `host` facet, the only facet with a complete contract in v0.15. Who should read it: plugin authors (before writing `defineFacet`), host maintainers (before implementing loading and activation).

This model comes from Yan-Zero's proposal in community issue #24 (disposition record in [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)): 9 of the 12 surveyed plugin samples needed both host-side logic and client-side presentation — spanning facets is the norm, not the exception, so the object model spells out the "split personality" first.

## 1. Scope

- This document defines the terminology and relationships of the four-level object model, and the complete contract of the `host` facet (entry location, module format, execution environment).
- v0.15 specifies **only the `host` facet**. `client` / `worker` are reserved names whose contracts belong to [RFC 0002](../rfcs/0002-runtime-presentation.md); until RFC 0002 is accepted, these two names have no defined semantics.
- The declaration syntax of the `facets` field in the manifest (`facets.host.entry` etc.) is defined by [spec/manifest.md](manifest.md) and is not repeated here; the activation and deactivation state machine is defined by [spec/lifecycle.md](lifecycle.md) and is not repeated here.

## 2. Normative Definitions

### 2.1 The Four-Level Object Model

```text
Component (distribution package: one per dsh-plugin.json)
  └── Facet (the plugin's persona at one execution location, e.g. host)
        └── Activation (one activation: the scope of lifecycle and cleanup)
              └── Participant (the entity that negotiates with the Broker on behalf of this activation)
```

- **Component**: the unit of distribution and static analysis. A Component owns exactly one `dsh-plugin.json` ([spec/manifest.md](manifest.md)).
- **Facet**: a persona of a Component, divided by execution location. The only legal facet name defined in v0.15 is `host`; `client` / `worker` are reserved names.
- **Activation**: one bounded activation of a facet. Lifecycle ordering, resource ownership, and cleanup obligations are all scoped to it ([spec/lifecycle.md](lifecycle.md)). The same facet can be activated repeatedly (HMR, profile reassembly); each activation is independent.
- **Participant**: the unit of negotiation. Each Activation MUST correspond to exactly one Participant, which carries the manifest's `requires` declarations and completes negotiation with the Broker (negotiation rules in [spec/negotiation.md](negotiation.md)).

### 2.2 The `host` Facet Contract

The `host` facet executes in the host-side Node.js environment and carries the plugin's logic side. Besides `entry`, every facet declaration MUST also carry `apiVersion` (the Host API version required by that facet; defined in [spec/manifest.md](manifest.md) §3.5; matching rules during negotiation in [spec/negotiation.md](negotiation.md) §2.3).

1. **Entry location**: the `host` facet's entry **MUST** be declared via the manifest's `facets.host.entry`, and the path MUST be inside the package root (declaration syntax and path validation rules in [spec/manifest.md](manifest.md); violations caught by `conformance/fixtures/manifest/invalid/entry-outside-root.json` — the fixture path is a planning convention, delivered together with spec/manifest.md).
2. **Module format**: the entry module **MUST** provide a facet definition created by `defineFacet` as its default export — i.e. `export default defineFacet(activation => ...)`. When loading the entry, the host MUST NOT assume anything beyond the module's top-level side effects: a facet actually starts only when the host invokes that definition. The entry's concrete module format (ESM/CJS) and loading boundaries remain open questions in v0.15 (see [rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) §9); implementers MUST follow the `execution.environment` published in the host's Host Descriptor ([spec/host-descriptor.md](host-descriptor.md)).
3. **Execution environment**: the `host` facet **MUST** depend only on the standard facet context (the object injected by `defineFacet`); it MUST NOT import host-private APIs, Adapter-internal modules, or dsh/Cordis packages (violations caught by package-inspection fixtures: `conformance/fixtures/facet/invalid/private-import/`, path a planning convention). The v0.15 execution level is trusted-in-process — a declaration of supported boundaries, not a security sandbox (see [rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) principle ④).

### 2.3 Minimal API Surface of the `defineFacet` Context

The `defineFacet` callback receives an activation context object; v0.15 specifies only the following three surfaces:

| API | Semantics |
| --- | --- |
| `activation.extensions.publish(contract, id, handler)` | Publishes an implementation to the Broker by contract coordinate (`apiVersion + kind`, e.g. `{ apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' }`). The coordinate **MUST** be a precise entry present in [registry/](../registry/README.md), and the plugin MUST have declared the corresponding dependency in its manifest (violations caught by the negotiation report: the use-without-declaration cases under `conformance/fixtures/negotiation/`, path a planning convention). |
| `activation.scope.add(dispose)` | Registers a cleanup function owned by this Activation, invoked by the host at deactivate. Cleanup **MUST** be designed to be re-runnable, and MUST NOT assume it will definitely be called (delivery is not guaranteed on crash; see [spec/lifecycle.md](lifecycle.md)). |
| Post-negotiation capability injection | The context exposes only the APIs of contracts that passed negotiation: when a required contract is missing the plugin is not activated; when an optional contract is missing the corresponding API does not exist, and the plugin MUST take an explicit degradation path (decision rules in [spec/negotiation.md](negotiation.md)). |

Beyond this, hosts MUST NOT expose through this context any private capability not registered in the registry, and plugins MUST NOT assume methods beyond this table exist on the context (violations caught by the context-surface checks in the conformance suites; see [conformance/suites/](../conformance/suites/README.md), Phase 2 deliverable).

## 3. Example

Minimal `host` facet (paired with the manifest example in [spec/manifest.md](manifest.md)):

```ts
export default defineFacet(activation => {
  activation.extensions.publish(
    { apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' },
    'codex', commandHandler)
  activation.scope.add(() => commandHandler.dispose())
})
```

The plugin depends only on the standard facet context: it touches no host-private API, is not tied to a specific runtime, and its lifecycle is automatically reclaimed by the scope.

Reference example: the [dsh-codex refactor branch (`agent/std-facet-runtime`)](https://github.com/Yan-Zero/dsh-codex/tree/agent/std-facet-runtime) is an exploration sample of a real plugin reworked to this model, validating the feasibility of "one plugin publishing multiple contract kinds through protocol extension points". Note: per principle ⑧, it is a reference implementation, not the standard itself; where it conflicts with the spec, the spec wins.

## 4. Errors and Edge Cases

- **Entry file missing or path escapes the package root**: fails in the validate phase; the plugin MUST NOT enter activate (fixture owned by [spec/manifest.md](manifest.md)).
- **Default export is not a facet definition** (not created via `defineFacet`, or no default export at all): fails in the validate phase; the host MUST give a human-readable error (fixture: `conformance/fixtures/facet/invalid/not-a-facet/`, path a planning convention).
- **Cleanup function throws**: the host MUST catch it and record `cleanup-failed`; it MUST NOT interrupt other plugins' deactivation (effect ledger rules in [spec/lifecycle.md](lifecycle.md)).
- **Repeated activation**: when the same facet is activated again due to HMR / profile reassembly, it is a brand-new Activation — resources registered last time MUST first be cleaned up by the previous Activation's scope (see [spec/lifecycle.md](lifecycle.md)).
- **Declaring `client` / `worker` facets**: v0.15 has no activatable semantics for them; whether the schema rejects them is specified by [spec/manifest.md](manifest.md). Plugins MUST NOT assume any behavior from these two names.
- **The trusted-in-process boundary**: a plugin can technically bypass the context and call system interfaces directly; every "MUST NOT" in this document is a supported contract, not a security enforcement ([rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) principle ④).

## 5. Fixtures

The "MUST" clauses of this spec correspond to the following fixtures / tests (all planning paths, delivered with the corresponding spec and Phase 2):

| Clause | Fixture / test that catches it |
| --- | --- |
| Entry MUST be inside the package root | `conformance/fixtures/manifest/invalid/entry-outside-root.json` |
| Entry MUST default-export a facet definition | `conformance/fixtures/facet/invalid/not-a-facet/` |
| Depend only on the standard facet context | `conformance/fixtures/facet/invalid/private-import/` |
| Published coordinates MUST be in the registry and declared | `conformance/fixtures/negotiation/` (use-without-declaration cases) |
| Context contains no unregistered private capabilities | `conformance/suites/` context-surface checks |

## 6. Changelog

| Date | Changes |
| --- | --- |
| 2026-08-18 | Initial draft: four-level model definition; v0.15 narrowed to specifying only the `host` facet; minimal `defineFacet` API surface (source: issue #24 comment 4; disposition in [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)) |
