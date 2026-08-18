# dsh-community-standard Documentation Plan

> This document answers three questions: **how many documents** the repository should have, **what each one covers**, and **in what order to write them**.
> Positioning: a writing guide for bootstrapping the formal draft repository; it is not itself a specification.

## 0. Overview

The first batch contains **23 documents** in four priority tiers:

- **P0 (8 docs)**: must be complete before the v0.15 freeze — missing one, the standard cannot be implemented or verified
- **P1 (7 docs)**: should be in place when v0.15 ships — the standard can run without them, but nobody could understand it or join in
- **P2 (4 docs)**: Drafts of deferred topics — existing base drafts; migrate them and attach a status
- **P3 (4 docs)**: research and background material — already finished; migrate directly

Reuse of existing material is high: the fabric repository's 4 RFCs, 3 research papers, and 1 disposition record can all be moved over directly. The only documents written **from scratch** are the spec/ split-outs and the registry entries in P0.

```text
dsh-community-standard/
├── README.md                      # done (see repository root)
├── docs-plan.md                   # this document
├── LICENSE                        # MIT
├── GLOSSARY.md                    # P1
├── VERSIONING.md                  # P0
├── rfcs/
│   ├── template.md                # P1
│   ├── 0000-governance.md         # P0
│   ├── 0001-core-contract.md      # P0 (the v0.15 text, i.e. the main RFC)
│   ├── 0002-runtime-presentation.md   # P2 (migrated)
│   ├── 0003-service-composition.md    # P2 (migrated)
│   └── 0004-provenance-diagnostics.md # P2 (migrated)
├── spec/
│   ├── manifest.md                # P0
│   ├── host-descriptor.md         # P0
│   ├── negotiation.md             # P0
│   ├── lifecycle.md               # P0
│   ├── event-envelope.md          # P0
│   ├── facet-model.md             # P1
│   └── conformance.md             # P1
├── registry/
│   ├── README.md                  # P1
│   ├── capabilities/              # P0 (2 entries)
│   └── events/                    # P0 (1 entry)
├── schemas/                       # P0 (3 JSON Schemas, produced alongside the spec)
├── conformance/
│   ├── fixtures/                  # produced alongside the spec
│   └── suites/                    # produced during the Phase 2 implementation period
├── guides/
│   ├── plugin-author.md           # P1
│   ├── host-maintainer.md         # P1
│   └── migration.md               # P2
├── research/                      # P3 (4 docs, migrated)
└── decisions/                     # starts at P3 (appended round by round)
```

Design principle in one sentence: **rfcs/ explains "why and how decisions were made", spec/ states "what is", registry/ + schemas/ are the machine-readable source of truth, guides/ speak plainly, and decisions/ keeps the feedback chain traceable.** A behavior only counts as a contract when it appears in spec + schema/registry + fixtures at the same time (principle ⑧).

---

## 1. Root documents

### README.md — P0, done

The repository's front door. What it is, why it is needed, the status declaration (Draft, unofficial), the four-layer architecture diagram, navigation by role, and how to participate. **No normative details** — details are always linked out to spec/ and rfcs/; the README's only job is to tell a reader within 3 minutes where to go.

### VERSIONING.md — P0

The most easily confused part of the whole standard, worth a document of its own. It must make clear:

- **The six version axes** and what each means: plugin `version` / `manifestVersion` / facet `apiVersion` / per-domain contract versions (evolving independently with the contract coordinate) / host product version / SDK release version
- Contract coordinate rules: `apiVersion + kind` (e.g. `commands.dsh/v1alpha1`), and the semantics of `v1alpha1` (experimental, may break, does not masquerade as a stable `1.x`)
- Breaking-change rules, deprecation windows, the `x-org.*` private-namespace rules, and the officially reserved namespaces
- Source: v0.15 §3.2 + §4.3

### GLOSSARY.md — P1

Glossary, bilingual Chinese–English. Must include at least: Component / Facet / Activation / Participant, Host product, Runtime / Presentation / Control / Transport / Invocation, Adapter, Broker, runtime generation, capability / contract, effect ledger, trusted-in-process, conformance. Each entry: 2–3 plain-language sentences plus a pointer to the spec section that defines it. Writing note: this document is the first door for newcomers — never explain a term with another term.

---

## 2. rfcs/ — proposals and decisions

RFCs cover background, motivation, rejected alternatives, and the decision process; normative details sink into spec/. An Accepted RFC's text is no longer modified; errata go through a new RFC.

### rfcs/template.md — P1

RFC template: metadata table (status / target version / scope / dependencies / discussion channel), one-sentence summary, background, goals / non-goals, design, rejected alternatives, open questions, change log. Defines the state machine: Draft → Review → Accepted → Final, plus Deprecated / Superseded / Withdrawn / Rejected.

### rfcs/0000-governance.md — P0 (the only RFC with no base draft)

Governance rules — the source of the standard's legitimacy. Must answer:

- The RFC state machine and the entry / exit conditions of each state
- Minimum public review period (recommend 14 days and up), decision-making (recommend lazy consensus with maintainer council as backstop), objection and appeal process
- Merge permissions: who is a maintainer, how maintainers join and leave, conflict-of-interest recusal (how a host maintainer reviews an RFC related to their own product)
- Registration process for capability / event names; management of the officially reserved namespaces
- A private disclosure channel for security issues
- The wording boundary between "community standard" and "official standard"
- The relationship between the reference implementation and the specification (the governance landing of principle ⑧)

### rfcs/0001-core-contract.md — P0

The main RFC: migrate the v0.15 text (plain-language edition) in, with three adjustments: ① normative details become pointers into the spec/ files (avoid maintaining the same sentence in two places); ② the §5 change log and Appendix A disposition table move to decisions/, leaving links here; ③ add a "rejected alternatives" section (dynamic manifest, flat capability names vs contract coordinates, on-demand activation — 3 sentences each: what it is, why rejected, under what conditions to reconsider).

### rfcs/0002 / 0003 / 0004 — P2

Migrate from the fabric repository as-is, changing three things: paths and cross-references, a "migrated from" source in the metadata table, and a uniform Draft status. Content unchanged — they are already rigorous enough; at the v0.15 stage they only need to "exist and be citable".

- **0002** (Runtime / Presentation / Control / Transport / Invocation): the Remote SSH counterexample, the five-concept layering, command tree, short-lived interactive messages, `presentation.urlState`
- **0003** (Service Providers and deterministic composition): the five declaration kinds, provider cardinality, composition plans, the preconditions for opening the `provides` / `requires.services` gates. **Highest priority of the next phase**; both the README and the Phase 3 plan must point to it
- **0004** (provenance, validation, diagnostics): the six evidence tiers, immutable subject identity, installation-impact reports, the full version of the effect ledger

---

## 3. spec/ — the normative text (P0's main battlefield)

Every spec has a fixed structure: scope → normative definitions (must / should / may) → examples → errors and edge cases → corresponding fixture list → change log. **Every "must" must be able to answer "which fixture or test catches a violation"** — if it cannot, either downgrade it to a "should" or add the fixture.

### spec/manifest.md — P0

The complete definition of `dsh-plugin.json`. Contents: file location and naming (including why `plugin.json` is avoided), the staticness requirement (no dynamic generation, no fetching the schema over the network), mandatory `$schema` and the canonical identifier rule, field-by-field definitions (id syntax and namespace ownership, facets, requires.contracts, permissions, contributes, subscriptions), the semantic boundaries of the five declaration kinds (v0.15's rules rejecting `provides` and `requires.services` are hard-coded here), global uniqueness of contributes ids and static conflict detection, and the authoritative source for fields duplicated with npm metadata. Deliverables: `schemas/dsh-plugin.schema.json` + `conformance/fixtures/manifest/{valid,invalid}/`.

### spec/host-descriptor.md — P0

The host's self-description file. Field-by-field definitions (descriptorVersion, id, apiVersions, execution.environment / trustMode, exact capabilities entries, platforms), the rule that a host "may only declare exact registry entries it actually implements", the disclosure obligation of trusted-in-process, the five marketplace states (declared compatible / awaiting authorization / actually tested / incompatible / unknown) and the rule that they must not upgrade each other. Deliverables: `schemas/host-descriptor.schema.json` + fixtures.

### spec/negotiation.md — P0

The meta-protocol negotiation kernel. Pure function signature (manifest × Host Descriptor → verdict + report), requires/supports matching rules, the refuse-to-load semantics of missing required entries (including the human-readable error requirement), the degradation semantics of missing optional entries, and the machine-readable format of the negotiation report (qing3a's validation report is merged into this format). Deliverable: `schemas/negotiation-report.schema.json`. Writing note: half of this spec's readers are implementers and half are CI tool authors — the examples must cover all three outcomes (compatible / refused / awaiting authorization).

### spec/lifecycle.md — P0

Write the host state machine (starting → ready → stopping → stopped) and the activation state machine (discover → validate → negotiate → authorize → activating → active → deactivating → disposed) separately; generation-scoped eager activation (no on-demand activation, with the reasons); best-effort deactivation on graceful shutdown, no delivery guarantee on crash, and plugin cleanup must be repeatable; repeated activation under HMR / profile recomposition; Broker ownership and the recorded fields of the minimal effect ledger (create / bind / replace / release / cleanup-failed).

### spec/event-envelope.md — P0

The event envelope and `messages.observe`. Envelope fields (envelopeVersion, eventType/Version, eventId, scopeType/Id/Sequence, correlationId, privacyClass, redactions, payloadSchema, immutable payload); the exact field boundary where payload aligns with MCP `ContentBlock` — **this is where §9 consultation question 3 lands; the first draft is marked "pending community feedback before freezing"**; ordering guarantees within a scope and no implied global order; a referential note that `before-*` does not enter v0.15 (pointing to 0002's precondition list).

### spec/facet-model.md — P1

The normative definition of the four-level Component → Facet → Activation → Participant model; v0.15 only specifies the full contract of the `host` facet (entry location, module format, execution environment); the reserved names `client` / `worker` and their ownership (RFC 0002); the minimal API surface of the `defineFacet` context (extensions.publish, scope.add, negotiated capability injection). The dsh-codex refactoring branch is cited as a reference example.

### spec/conformance.md — P1

Definitions and wording boundaries of the four evidence kinds: Schema validation / Host conformance / Plugin validation / Interop evidence (two hosts × three plugins); what "passing conformance" may and may not claim (no "secure plugin", no "officially certified"); test-environment recording requirements (standard version, host ID / version / platform, suite commit, time, result).

---

## 4. registry/ — the contract registry (machine-readable source of truth)

### registry/README.md — P1

Entry format, coordinate rules, registration and change process (pointing to RFC 0000), the list of officially reserved namespaces, and the `x-org.*` private-extension rules.

### First batch of entries — P0

Each entry = one JSON (machine-readable: coordinate, version, status, owning spec/RFC, schema identifier + immutable hash, sensitivity level, lifecycle scope, deprecation info) + one same-named .md (plain-language explanation + usage examples):

| Entry | Key contents |
| --- | --- |
| `capabilities/commands.dsh-v1alpha1` | flat action leaf semantics; explicitly lists what it does not include (command tree / prompt / streaming) and their ownership |
| `capabilities/storage.dsh-v1alpha1` | isolated per Component; no cross-plugin sharing (belongs to 0003) |
| `events/messages.dsh-v1alpha1` | MessageObserver; envelope in spec/event-envelope.md; ContentBlock alignment boundary |

---

## 5. guides/ — plain-language guides (non-normative)

The spec may be solemn; the guides must speak plainly. Each opens with "this document is non-normative; on conflict, spec/ wins".

### guides/plugin-author.md — P1

Ten minutes to get started: write a manifest → declare dependencies → write a command with `defineFacet` → run the validator locally → read the negotiation report. A lookup table for common refuse-to-load errors. Focus on explaining "why you can no longer patch, and which standard path replaces each of your old wild-west tricks".

### guides/host-maintainer.md — P1

The checklist for becoming a compatible host: publish a Host Descriptor → implement negotiation and refuse-to-load messaging → lifecycle ordering → wire up the conformance suites → the trustMode disclosure obligation. dsh-TUI is cited as the first signed-up case.

### guides/migration.md — P2

The path for migrating existing plugins (the patch / internal-interface schools) onto the standard: identify patch points → map them to standard contracts → fill in the manifest → run validation. Honestly list which wild-west tricks have no standard counterpart yet (pointing to the corresponding deferred RFC), and the boundary for coexistence with legacy paths during migration.

---

## 6. research/ and decisions/ — P3, migration and continuous appending

**research/**: four finished papers migrated directly — the plugin-needs study (12 samples), the mature-framework study (Koishi / Chrome / VS Code), the VS Code extension-model study, and the comment-by-comment archive of issue #23 (community-issue-23-review). Add a uniform header: "Research snapshot — non-normative, not a recommendation".

**decisions/**: the archive of the feedback chain. First batch of three: `round-1-issue-23.md` (13 dispositions, migrating the existing record), `round-2-issue-24.md` (5 dispositions, extracted from v0.15 §5), `round-3-discussion-2714.md` (follow-up feedback from the official repository discussion, to be collected). Uniform format: input (author, link) / disposition (Adopted / Adopted with limits / Separate RFC / Adapter experiment / Not portable core / Recorded) / landing spot. The rule is written at the top of each file: new comments never silently rewrite a Draft; changes go through RFC review first, then get registered.

---

## 7. Suggested writing order

```text
Week 1    VERSIONING.md → spec/manifest.md (+schema+fixtures) → spec/host-descriptor.md (+schema)
          └ once these three land, the first registry entries and the negotiator have a foundation
Week 2    spec/negotiation.md → spec/lifecycle.md → first 3 registry entries
Week 3    spec/event-envelope.md (ContentBlock boundary marked "under consultation") → rfcs/0000-governance.md
          └ 0000 is best co-written by 2–3 people; a governance document written alone picks up blind spots
Then      rfcs/0001 migration and rework → all of P1 (facet-model / conformance / guides / GLOSSARY / registry README / template)
Anytime   P2 / P3 migration in parallel (mechanical work; whoever is free does it)
```

Three writing disciplines, pinned in every PR template:

1. **Write a rule only once**: if the same rule appears in two files, the second occurrence must be a link.
2. **Every "must" has a fixture**: before writing down a "must", know what the fixture that catches its violation looks like.
3. **Mark illustrative values as illustrative**: all unfinalized URLs, coordinates, and field names carry "(illustrative; the final Registry entry is authoritative)", so placeholders are not propagated as decisions — the placeholder URL `dsh-std.example` already escaped into the wild once.

---

> **Note (2026-08): this plan is fully complete** (see [README.md §Current status](README.md) for the drafting status of each tier); later changes no longer go through this plan — they all go through the RFC process ([rfcs/0000-governance.md](rfcs/0000-governance.md)).
