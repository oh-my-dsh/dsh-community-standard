# RFC 0001: Core Contract — Manifest, Capability Negotiation, and Event Contract

> **Status: Draft v0.15 (community draft — not an official dsh standard)**

| Field | Value |
| --- | --- |
| Number | 0001 |
| Title | Core Contract: Manifest, Capability Negotiation, and Event Contract |
| Status | Draft (v0.15 body) |
| Target version | v0.15 |
| Scope | The plugin–host interoperability contract: manifest, host descriptor, negotiation, lifecycle, events |
| Depends on | [RFC 0000 Governance](0000-governance.md) |
| Discussion | [community#23](https://github.com/omdsh-dev/community/issues/23) → [community#24](https://github.com/omdsh-dev/community/issues/24) |
| Migrated from | dsh-community-fabric RFC 0001 (v0.1 base draft) + community#24 second-round revisions |

This is the main RFC; it answers "**what this standard is and why it looks this way**". The normative text is not in this document — it lives in [spec/](../spec/manifest.md) and [registry/](../registry/README.md); this document covers only the decisions and their rationale. **Readers with five minutes: read §0 and §9; official dsh readers: read §7 and §9.**

## 0. One-page summary

**Problem.** The dsh plugin ecosystem is expanding fast: the awesome-directory snapshot already lists **3,809 plugin repositories**. A source-code survey of 12 representative open-source plugins shows that most plugins implement their features through source patches, internal functions, or private service probing — one upstream update breaks them in bulk; plugins for the GUI / Web UI / TUI hosts are mutually incompatible; users cannot judge compatibility before installing and only find out when it blows up.

**What the community did.** The ecosystem's major plugin authors, the maintainers of all three host ends, and the distribution channels held two rounds of public discussion (13 substantive comments on issue #23, 5 on issue #24) and converged on a four-layer interoperability model and a **deliberately small** v0.15:

```text
plugin code ──depends only on──▶ Fabric SDK / stable contract
                                      ▼
              Capability Broker (validation, negotiation, authorization,
                                 lifecycle, resource ownership)
                                      ▼
              versioned DSH Adapter (the only layer allowed
                                     to absorb upstream change)
                                      ▼
              official dsh / Cordis runtime (no changes required)
```

**What v0.15 is (five sentences).** A static JSON manifest (`dsh-plugin.json`) plus a machine-readable host capability description (Host Descriptor); a pure-function required/optional contract negotiator; a deterministically ordered activate/deactivate lifecycle; three low-risk contract coordinates — `commands.dsh/v1alpha1` (Command), `storage.dsh/v1alpha1` (LocalStorage), `messages.dsh/v1alpha1` (MessageObserver); and conformance tests that run in headless environments. **No sandbox promises, no modifiable interception, no inter-plugin services, no cross-platform UI — all of these are explicitly deferred to separate RFCs (§4.5).**

**Requests to the official side (§7):** ① advance changelog marking of changes to core observation points; ② confirmation that the `dsh-plugin.json` filename and namespace do not conflict; ③ participation in the standard's governance at any depth. **Explicitly not requested:** kernel changes, removal of existing loading paths, or us speaking on the official side's behalf.

## 1. Problem and evidence

Three structural problems (data and samples: [research/dsh-plugin-needs.md](../research/dsh-plugin-needs.md)):

1. **Implementation coupling.** Most of the 12 sampled plugins implement their features through source patches, monkey patches, internal event names, or `ctx.get()` reflection probing. This is not the plugin authors' fault — they had no choice while official seams were missing — but the result is that every upstream update triggers a round of mass breakage in the ecosystem. History has already played this out once: early community loaders were wiped out overnight when the official side introduced a unified registration mechanism.
2. **Missing compatibility information.** Existing manifests contain only a package name and a list of patch files; hosts, markets, and launchers cannot tell before executing code: does this plugin need a graphical interface? Does it read sessions? Can it run on a TUI? 9 of the 12 samples need both the Host and Client faces — cross-face is the norm, not the exception — but no declaration mechanism exists today.
3. **Composition uncertainty.** When multiple plugins modify the same behavior, there are no declaration, ordering, or conflict rules; the de facto arbiter is "last loaded wins"; distribution channels are forced to pin whole-package versions against interface instability.

## 2. Design principles (eight)

All corrections from the first two rounds converge into the following eight principles. Each is backed by concrete counterexamples; sources are in the `decisions/` disposition records.

1. **Statically analyzable.** The manifest is static JSON at the package root; generating it by running code is forbidden; hosts do not fetch schemas from the network at load time. Tooling can discover, validate, and negotiate without executing plugin code.
2. **Five declaration classes are not conflated.** `requires` (what it depends on), `permissions` (what authorization it requests), `provides` (what service it can implement), `contributes` (what static metadata it contributes), and `subscriptions` (what events it subscribes to) are five different semantics and must not be compressed into one generic `capabilities` container. The v0.15 schema accepts only subsets that already have concrete contracts, and **rejects** `provides` and `requires.services`.
3. **Negotiation + honest degradation.** Missing required → clearly refuse to load before install/activation, with the reason stated; missing optional → follow the declared degradation path. Markets display five states and must never promote one into another: **declared compatible / awaiting authorization / tested / incompatible / unknown**. "Declared compatible" never equals "tested", let alone "safe".
4. **Tiered trust; capability is not a sandbox.** v0.15 is the trusted-in-process tier: a trusted plugin running in-process can technically bypass the standard API and call system interfaces directly. Capability declarations serve compatibility judgment, user authorization, and audit; **they do not constitute a security boundary**, and hosts must prominently disclose this fact.
5. **Upstream change converges in the Adapter, fail closed.** Plugins depend only on standard contracts; the versioned DSH Adapter is the only layer allowed to import the upstream runtime. When upstream no longer exposes an observation point a capability needs, the Adapter must retire that capability and report the reason — **it must not guess semantics with private patches or return an approximate result that "looks successful"**.
6. **Determinism and attributability.** Load order is never a conflict-arbitration mechanism. Every standard registration goes through the Broker and is attributed to a specific activation of a specific plugin, recorded in a minimal effect ledger — so diagnostics can answer "who created this command / panel / leftover resource, and was it cleaned up after deactivation".
7. **Meta-protocol kernel; contracts versioned independently.** The negotiation kernel recognizes only `apiVersion + kind` coordinates and requires/supports declarations, with no business fields built in; each domain contract (capabilities, events, extension points) evolves independently with its coordinate, so an upgrade in one domain does not drag the kernel, unrelated plugins, and hosts into a re-release.
8. **Reference implementations are not the standard.** The standard is defined only by specification text + registry + fixtures + conformance tests; no implementation — including the fabric reference implementation — is the standard itself, and an implementation cannot self-certify. Governance landing: [RFC 0000](0000-governance.md) §9.

Principles 7 and 8 were added in the second round (issue #24); disposition records: [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md).

## 3. Core model

### 3.1 Four-layer model

See the architecture diagram in §0. There is only one key point: **the versioned DSH Adapter is the only layer allowed to absorb upstream change** (Principle 5); plugin code depends neither on dsh, Cordis, nor any Adapter package — only on standard contracts.

### 3.2 Terminology and object model

- Plugin shape is described by a four-level object model: **Component** (distribution package) → **Facet** (static facet, e.g. `host` / `client` / `worker`) → **Activation** (one bounded activation; the scope of lifecycle and resource ownership) → **Participant** (runtime negotiation entity). Normative definitions: [spec/facet-model.md](../spec/facet-model.md); v0.15 specifies only the full contract of the `host` facet; `client` / `worker` are reserved names owned by [RFC 0002](0002-runtime-presentation.md).
- A **Host product** is the GUI / Web UI / TUI / launcher product that carries plugins; **Runtime / Presentation / Control / Transport** are four independent dimensions and cannot be compressed into a `hostType` or `isRemote` field (Remote SSH counterexample: [RFC 0002](0002-runtime-presentation.md)).
- Plain-language definitions of terms are maintained centrally in [GLOSSARY.md](../GLOSSARY.md) and are not repeated here.

### 3.3 Trust and execution tiers

Capabilities distinguish four things: **support** (the host declares it can provide), **request** (the plugin asks), **grant** (the user or policy allows), and **enforcement** (the host actually prevents bypass). v0.15 defines only the **trusted-in-process** tier: plugins run as trusted code; capabilities serve compatibility, authorization, and audit and do not constitute a security sandbox; hosts must disclose this fact in the Host Descriptor (disclosure obligation: [spec/host-descriptor.md](../spec/host-descriptor.md)). An isolated tier (process/realm isolation, mediated IPC, resource limits) is a separate follow-up RFC; a host without that evidence must not claim that permissions are enforced.

### 3.4 Manifest (static declaration)

Decisions below; **field-by-field normative text: [spec/manifest.md](../spec/manifest.md)**; machine-readable definition: [schemas/dsh-plugin.schema.json](../../schemas/dsh-plugin.schema.json):

- The manifest is frozen as a static JSON file **`dsh-plugin.json`** at the package root; generating it dynamically by running JavaScript is forbidden. The distinct name is deliberate: `plugin.json` is already taken by the Agent Plugins Specification; one package may carry both files to support both ecosystems, but neither may override or implicitly extend the other.
- The top-level `$schema` is required and holds the canonical identifier; hosts use it to select a locally bundled schema and must not fetch schemas or validation policies from the network at load time.
- The semantic boundaries of the five declaration classes are hard-coded in the schema (Principle 2); until the composition contract is accepted, **the v0.15 schema must reject `provides` and `requires.services`**, and hosts must not silently store unsupported fields and then present them as "in effect".
- `manifestVersion: "0.15"` declares only the file structure and is not another negotiation axis (version model: [VERSIONING.md](../VERSIONING.md)).

```jsonc
// Illustrative; the Registry and spec/manifest.md are authoritative
{
  "$schema": "<canonical dsh-plugin.json schema identifier>",
  "manifestVersion": "0.15",
  "id": "com.example.message-memory",
  "version": "1.2.0",
  "requires": {
    "contracts": [
      { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
      { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
      { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver", "optional": true }
    ]
  }
}
```

### 3.5 Host Descriptor and negotiation

Decisions below; **normative text: [spec/host-descriptor.md](../spec/host-descriptor.md) and [spec/negotiation.md](../spec/negotiation.md)**:

- Every compatible host must publish a machine-readable Host Descriptor: exact entries of supported contract coordinates, execution environment and trust tier, platform. It may declare only Registry exact entries it **actually implements** — no product-local aliases, and no capabilities whose semantics it cannot sustain.
- The negotiator is a **pure function**: manifest × Host Descriptor → compatible / refuse-to-load / authorization-pending + a machine-readable report (report format: [schemas/negotiation-report.schema.json](../../schemas/negotiation-report.schema.json)); it is testable without dsh.
- Missing required → clear refusal with a reason users can understand; missing optional → a deterministic degradation result. The five market states (declared compatible / awaiting authorization / tested / incompatible / unknown) must never be promoted into one another (Principle 3).

### 3.6 Lifecycle and events

Decisions below; **normative text: [spec/lifecycle.md](../spec/lifecycle.md) and [spec/event-envelope.md](../spec/event-envelope.md)**:

- The host state machine (`starting → ready → stopping → stopped`) and the plugin activation state machine (`discover → validate → negotiate → authorize → activating → active → deactivating → disposed`) are two independent state machines.
- v0.15 uses generation-scoped **eager activation, with no on-demand activation** (rationale in §6.3). Normal shutdown deactivates best-effort; on crash, power loss, or force-kill, delivery is not guaranteed, so plugin cleanup must be designed to be repeatable.
- Events use a versioned minimal envelope: a monotonically increasing sequence number within a scope, ordered within a scope, with no implied global order across scopes; payloads are immutable and carry a sensitivity level and a redaction summary. The field-by-field envelope spec is in [spec/event-envelope.md](../spec/event-envelope.md) and is not repeated here. The exact field boundary for aligning payloads with MCP `ContentBlock` is **under consultation** (§9 question 3).
- Modifiable / cancellable `before-*` events are not in v0.15 (rationale in §6.4).

### 3.7 Broker and the minimal effect ledger

All standard registrations must go through the Broker, which attributes resources to a specific activation of a specific plugin and maintains a machine-readable minimal effect ledger: five operations `create / bind / replace / release / cleanup-failed`; message bodies and secrets are not recorded by default. It improves provenance and diagnostics, but trusted-in-process code can still bypass the Broker — the ledger is not proof of sandbox enforcement (Principles 4, 6). Record-field normative text: [spec/lifecycle.md](../spec/lifecycle.md).

## 4. Precise scope of v0.15

Principle: **every capability entering scope must ship with a schema, fixtures, and headless conformance tests; anything that cannot be tested is deferred.**

### 4.1 Deliverables

| # | Deliverable | Spec location |
| --- | --- | --- |
| 1 | `dsh-plugin.json` Manifest Schema | [spec/manifest.md](../spec/manifest.md) + [schemas/dsh-plugin.schema.json](../../schemas/dsh-plugin.schema.json) |
| 2 | Host Descriptor Schema | [spec/host-descriptor.md](../spec/host-descriptor.md) + [schemas/host-descriptor.schema.json](../../schemas/host-descriptor.schema.json) |
| 3 | Capability / Event Registry | [registry/](../registry/README.md) (machine-readable entries + immutable schema hashes) |
| 4 | Pure-function capability negotiator | [spec/negotiation.md](../spec/negotiation.md) + [schemas/negotiation-report.schema.json](../../schemas/negotiation-report.schema.json) |
| 5 | Lifecycle contract | [spec/lifecycle.md](../spec/lifecycle.md) |
| 6 | Three contract coordinates | §4.2 |
| 7 | Broker + minimal effect ledger | [spec/lifecycle.md](../spec/lifecycle.md) |
| 8 | Conformance suite | [spec/conformance.md](../spec/conformance.md) + [conformance/](../conformance/fixtures/README.md) |

### 4.2 Three domain contracts

| Contract coordinate | kind | Includes | Explicitly excludes (and ownership) |
| --- | --- | --- | --- |
| `commands.dsh/v1alpha1` | Command | flat action leaf: one global ID maps to one declared action and one handler owned by an activation | command tree / subcommand, CLI option parser, interactive prompt, streaming output, background session (owned by [RFC 0002](0002-runtime-presentation.md)) |
| `storage.dsh/v1alpha1` | LocalStorage | plugin-private, host-managed persistence | cross-plugin sharing, multiple scopes, Secrets (owned by [RFC 0003](0003-service-composition.md) and later RFCs) |
| `messages.dsh/v1alpha1` | MessageObserver | observe **immutable** message events with a versioned envelope | modifiable / cancellable `before-*` (separate future RFC; prerequisites in [spec/event-envelope.md](../spec/event-envelope.md)) |

Authoritative definitions live in the Registry entries: [commands.dsh-v1alpha1](../registry/capabilities/commands.dsh-v1alpha1.md), [storage.dsh-v1alpha1](../registry/capabilities/storage.dsh-v1alpha1.md), [messages.dsh-v1alpha1](../registry/events/messages.dsh-v1alpha1.md).

### 4.3 Version model

Six version dimensions must not be conflated into one field; contract coordinates `apiVersion + kind` evolve independently; both `v1alpha1` and `0.x` carry experimental semantics and do not pretend to be stable. **Full rules: [VERSIONING.md](../VERSIONING.md); not repeated here.**

### 4.4 Acceptance criteria and conformance evidence

v0.15 needs four classes of evidence to graduate from Draft (definitions and wording boundaries: [spec/conformance.md](../spec/conformance.md)):

1. **Schema validation**: public schemas, Registry, and valid/invalid fixtures.
2. **Host conformance**: headless tests for negotiation, authorization denial, activation order, exception capture, duplicate activation, cleanup, and so on.
3. **Plugin validation**: manifest consistent with the entrypoint, only declared contracts used, contribution declaration/binding consistency, optional degradation paths.
4. **Interop evidence**: **at least two independent host products/integrations** (they may share one versioned DSH Adapter, but integration and descriptor evidence must be independent) and **three sample plugins** completing the same set of headless scenarios. dsh-TUI has claimed the first batch of compatible host implementations and tests ([decisions/round-2](../decisions/round-2-issue-24.md)).

Wording floor: a host may only claim "passed v0.15 Host conformance"; a plugin may only claim "passed v0.15 plugin validation" — **neither may be phrased as "secure plugin" or "officially certified"**.

### 4.5 Explicitly not in v0.15

Each item below was confirmed in discussion as "a valuable direction, but forcing it into v0.15 would plant mines"; each has been split into a separate Draft RFC and will not silently expand v0.15:

| Deferred item | One-line reason | Owner |
| --- | --- | --- |
| Modifiable / cancellable `before-*` events | Ordering, merging, cancel, timeout, rollback, and privacy redaction are all undefined | Separate future RFC (§6.4) |
| Runtime / Presentation / Control / Transport layering, command tree, short-lived interactive messages | The Remote SSH counterexample proves `isRemote` / `hostType` are wrong abstractions | [RFC 0002](0002-runtime-presentation.md) |
| Inter-plugin services (`provides` / `requires.services`) and deterministic composition | Provider cardinality, user selection, conflict plans, health, and replacement must be defined first | [RFC 0003](0003-service-composition.md) (top priority of the next phase) |
| Install-impact preview, validation reports, full provenance | Evidence must be classified and bound to immutable artifact digests | [RFC 0004](0004-provenance-diagnostics.md) |
| On-demand activation | A second lifecycle + first-use concurrency races + delayed failure | Future measurement-based proposal (§6.3) |
| Isolated execution / sandbox | A host without isolation evidence must not claim permissions are technically enforced (Principle 4) | Separate future RFC |
| Cross-platform declarative UI, `net.*` / `fs.*` / session writes | Sensitive capabilities each need their own authorization UX, scope, and resource-limit contracts | Separate RFCs each |
| Market certification, lockfile / bundle specs, migration tooling | Belong to the packaging / distribution layer | Future proposals |
| Runtime mixin (dsh-neoforge PoC) | The conflict-detection evidence is valuable, but private targets never enter the plugin-visible API | Adapter experiment, permanently capped |

## 5. Feedback disposition and changelog

This RFC converged from two rounds of public discussion; **the comment-by-comment disposition tables are not maintained in this document**:

- Round 1: issue #23, 13 comments → [decisions/round-1-issue-23.md](../decisions/round-1-issue-23.md) (v0.1 finalized).
- Round 2: issue #24, 5 comments → [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md) (v0.1 → v0.15: contract coordinates switched to `apiVersion + kind`, the four-level Facet model introduced, Principles 7 and 8 added, payload aligned with MCP `ContentBlock`).
- Round 3 (official repository discussion): feedback being collected → decisions/round-3-discussion-2714.md.

New comments do not silently change a Draft: changes go through the review process defined by [RFC 0000](0000-governance.md) first and are then registered in the disposition records, closing a traceable feedback loop.

## 6. Rejected alternatives

### 6.1 Dynamic manifest (JS-generated)

**What it is**: the manifest may be executable JavaScript that generates declarations at runtime. **Why rejected**: static analyzability is Principle 1 — validators, markets, and launchers all rely on "reading declarations without executing code"; dynamic generation would break the entire compatibility system (both the validation tooling and the host maintainers explicitly opposed it in issue #23). **Conditions for reconsideration**: when a declaration need arises that static JSON cannot express, and restricted evaluation (no IO, provably terminating) can preserve equivalent analyzability.

### 6.2 Flat capability names + a unified apiVersion (the v0.1 scheme)

**What it is**: all capabilities use flat short names (`commands`, `storage.local`) sharing one unified `apiVersion`. **Why rejected**: a unified version binds every domain contract to the same release cadence — fast-moving domains driven by the upstream model ecosystem, such as Model Provider, would force the entire SDK, the Broker, and every plugin and host in the ecosystem to re-release with every tweak (the argument from issue #24, validated by the [dsh-std](https://github.com/Yan-Zero/dsh-std) exploratory implementation); v0.15 therefore switched to `apiVersion + kind` contract coordinates (Principle 7). **Conditions for reconsideration**: if coordinate fragmentation makes toolchain complexity unmanageable, surface naming may be simplified while preserving independent contract versioning ([VERSIONING.md](../VERSIONING.md)).

### 6.3 On-demand activation (activation events)

**What it is**: plugins declare trigger conditions (e.g., "when a certain command runs") and activate only when first needed. **Why rejected**: it introduces a second lifecycle, first-use concurrency races, and delayed failure — the problem shifts from "visible immediately at startup" to "blows up on first use"; generation-scoped eager activation comes first to establish a verifiable baseline. **Conditions for reconsideration**: when real performance measurements prove eager activation is a bottleneck and the trigger-condition set can be fully covered by static analysis, propose it as a separate RFC.

### 6.4 Introducing modifiable `before-*` events in v0.15

**What it is**: plugins may modify or cancel events before delivery (intercept messages, rewrite behavior). **Why rejected**: multi-plugin execution order, merging multiple modifications, whether to continue after cancel, timeout / exceptions / rollback / reentrancy, privacy redaction — none of these is defined; naming a listener `before` solves nothing and just returns to "last loaded wins". **Conditions for reconsideration**: after contracts for all of the above ship with a separate RFC and pass review (prerequisite checklist: [spec/event-envelope.md](../spec/event-envelope.md)).

## 7. Relationship with official dsh

### 7.1 What we do not request

1. **No kernel changes, and no immediate adoption of this standard.** The standard is proven on the community side first; the official package manifest, Cordis services, slots, and profile composition mechanisms keep working as-is.
2. **No removal or freezing of any existing loading path.** Standard-managed plugins use the standard entry; non-standard plugins and built-in extensions are an explicit product boundary during migration and are unaffected.
3. **We do not speak for the official side.** All documents are labeled "community standard, not official"; conformance wording has explicit boundaries (§4.4, [RFC 0000](0000-governance.md) §8).

### 7.2 What we request

1. **Visibility into observation-point changes.** The Adapter is the only layer in the whole system that absorbs upstream change; what it needs is not "upstream, stop changing" but "tell us when you change". Request: when observation points for core business events — session / message / tool calls — change or are removed, mark them in the changelog or release notes. This is the cheapest request with the largest ecosystem-stability payoff.
2. **Namespace confirmation.** Request confirmation that the package-root `dsh-plugin.json` filename and the `dsh-*` contract naming prefix do not conflict with existing or near-term official plans; the Registry reserves an official namespace so future official capabilities can enter as first-class citizens (rules: [VERSIONING.md](../VERSIONING.md) §5.2).
3. **Participate in governance, at a self-chosen depth.** Governance rules: [RFC 0000](0000-governance.md). The official side may participate as observer, reviewer, or co-maintainer; direct opinions are also welcome on the choice of v0.15's three contract coordinates and the payload field boundary of `messages.dsh/v1alpha1` — the two concrete questions that most need an official perspective today (§9).

### 7.3 Value to the official side

- Behind the 3,809 plugin repositories, the patch and internal-interface dependencies are currently "blamed on" every official update. Once the interoperability layer lands, compatibility pressure converges from "official vs. all plugins" to "one point: the Adapter".
- Once compatibility information is static, markets and launchers can set clear expectations before installation, and "installs and immediately breaks" experiences stop being attributed to dsh itself.
- The standard is community-governed and community-maintained; the cost of official adoption at any point is low (mapping one Adapter layer), and not adopting costs nothing.

## 8. Landing plan

| Phase | Content | Status |
| --- | --- | --- |
| Phase 0: standard foundation | Governance RFC 0000; Manifest / Host Descriptor schemas; Registry; fixtures; pure-function negotiator; headless test skeleton | Documents ready; schemas being frozen |
| Phase 1: trusted reference Adapter | Single Node.js host environment; full lifecycle; Broker attribution + minimal ledger | Started on the fabric side |
| Phase 2: events and minimal contribution points | `messages.dsh` + `storage.dsh` + flat `commands.dsh`; failure / duplicate-ID / cancellation / shutdown fixtures; **two hosts × three plugins interop evidence** (§4.4) | Three-end maintainers have claimed integrations |
| Phase 3: inter-plugin composition | [RFC 0003](0003-service-composition.md) enters review: provider cardinality, selection, conflict plans, health and replacement | Top priority of the next phase ([decisions/round-2](../decisions/round-2-issue-24.md)) |

## 9. Questions for this round of comment (five)

1. Are the choices and cuts of the three v0.15 contract coordinates (`commands.dsh` / `storage.dsh` / `messages.dsh`) appropriate? Is there a fourth item "without which this cannot work"?
2. Which message fields should the `messages.dsh/v1alpha1` payload contain, and how should sensitive-field redaction rules be set?
3. The exact field boundary for aligning payloads with MCP `ContentBlock` — initial draft in [spec/event-envelope.md](../spec/event-envelope.md), marked "pending community feedback freeze"; the focus of this round.
4. Does the official side have conflicts or plans for the `dsh-plugin.json` filename and the `dsh-*` naming prefix (corresponds to §7.2 request ②)?
5. At what depth does the official side wish to participate in governance — observer, reviewer, or co-maintainer (process: [RFC 0000](0000-governance.md))?

## Appendix: source index

- First-round RFC and full discussion: [community#23](https://github.com/omdsh-dev/community/issues/23); second-round finalization and comments: [community#24](https://github.com/omdsh-dev/community/issues/24).
- Disposition records: [decisions/round-1-issue-23.md](../decisions/round-1-issue-23.md), [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md).
- Research snapshots (non-normative): [research/](../research/README.md) (plugin-needs 12-sample survey, mature frameworks, the VS Code extension model).
- Deferred topics: [RFC 0002](0002-runtime-presentation.md) / [0003](0003-service-composition.md) / [0004](0004-provenance-diagnostics.md).
