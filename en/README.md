# dsh-community-standard

> A community interoperability standard for the dsh plugin ecosystem.
> **Status: community Draft v0.15 — this is a community discussion draft, not an official dsh standard, and it does not claim to be one.**
>
> Read online: <https://rfc.dshfind.com> (deployed automatically from this repository; updates on every merged PR)

## What this is

In one sentence: a plugin standard for the dsh ecosystem that is **decoupled from upstream dsh versions** — a plugin declares "who I am and what capabilities I need" in a static manifest, and the host (GUI / Web UI / TUI / launcher) negotiates first, then authorizes, then activates the plugin through a unified lifecycle.

An analogy: **we are building the Chrome-extension model (manifest + permission declarations + unified APIs), not letting every browser invent its own plugin mechanism all over again.**

## Why it is needed

The dsh ecosystem already has 3,800+ plugin repositories, but three cracks run underneath:

1. **Plugins live on patches.** Most plugins work through source patches, monkey patches, and internal event names; every dsh update breaks the ecosystem in batches.
2. **You only find out it breaks after installing.** Existing manifests carry only a package name and a patch list; before installing, nobody can answer "will this plugin run on the TUI?" — the only "error report" is a crash.
3. **Last loader wins.** When several plugins change the same behavior, the de facto arbiter is load order, and when something goes wrong nobody can answer "who changed this?"

The first principle of this standard: **the standard's survival does not depend on any decision made by dsh upstream.**

## What is in the repository

Design principle in one sentence: **rfcs/ explains "why and how decisions were made", spec/ states "what is", registry/ + schemas/ are the machine-readable source of truth, guides/ speak plainly, and decisions/ keeps the feedback chain traceable.**

A behavior only counts as a contract when it appears in **spec + schema/registry + fixtures** at the same time (principle ⑧: the reference implementation is not the standard).

```text
├── docs-plan.md        # documentation plan: how many documents, what each covers, in what order (read this first)
├── VERSIONING.md       # the six version axes, contract coordinates, breaking-change rules
├── GLOSSARY.md         # glossary (the first door for newcomers)
├── rfcs/               # proposals and decisions: 0000 governance / 0001 core contract / 0002–0004 deferred topics
├── spec/               # normative text: manifest, Host Descriptor, negotiation, lifecycle, event envelope…
├── registry/           # contract registry (machine-readable entries + plain-language notes)
├── schemas/            # JSON Schemas (produced alongside the spec)
├── conformance/        # fixtures and conformance test suites
├── guides/             # plain-language guides: plugin authors / host maintainers / migration
├── research/           # research snapshots (non-normative)
└── decisions/          # per-round feedback disposition records
```

## What should I read (navigation by role)

- **I only have five minutes** → read §0 and §9 of [rfcs/0001-core-contract.md](rfcs/0001-core-contract.md)
- **I am a plugin author** → [guides/plugin-author.md](guides/plugin-author.md) → [spec/manifest.md](spec/manifest.md) → [registry/](registry/)
- **I am a host / terminal maintainer** → [guides/host-maintainer.md](guides/host-maintainer.md) → [spec/host-descriptor.md](spec/host-descriptor.md) → [spec/negotiation.md](spec/negotiation.md)
- **I want to help make the standard** → [rfcs/0000-governance.md](rfcs/0000-governance.md) → [rfcs/template.md](rfcs/template.md) → the disposition records in `decisions/`
- **I am dsh official** → [§7 Relationship with official dsh](rfcs/0001-core-contract.md#_7-relationship-with-official-dsh) of rfcs/0001 (what we do not ask for / what we ask for / the value to the official project) and [§9 Questions for this round of comment](rfcs/0001-core-contract.md#_9-questions-for-this-round-of-comment-five)

## Current status

The repository is **fully drafted (community Draft v0.15)**: rfcs/, spec/, guides/, registry/, research/, and decisions/ are all complete Drafts; the three JSON Schemas in schemas/ and conformance/fixtures/ landed together with the spec, and the conformance/suites/ test suites are due during the Phase 2 implementation period.

The first batch is 23 documents in four priority tiers (full plan in [docs-plan.md](docs-plan.md)):

- **P0 (8 docs)**: must be complete before the v0.15 freeze — missing one, the standard cannot be implemented or verified
- **P1 (7 docs)**: should be in place when v0.15 ships
- **P2 (4 docs)**: Drafts of deferred topics, migrated from the fabric repository
- **P3 (4 docs)**: research and background material, migrated as-is

## How to participate

- **Feedback / discussion**: open an issue or join a discussion in [omdsh-dev/community](https://github.com/omdsh-dev/community). New comments never silently rewrite a Draft: changes go through review first, then the disposition record in `decisions/` is updated.
- **Claim writing work**: pick a P0/P1 document in the order given in §7 of [docs-plan.md](docs-plan.md) and open a PR.
- **Three writing disciplines** (also pinned in the PR template):
  1. **Write a rule only once**: if the same rule appears in two files, the second occurrence must be a link.
  2. **Every "must" has a fixture**: before writing down a "must", know what the fixture that catches its violation looks like.
  3. **Mark illustrative values as illustrative**: all unfinalized URLs, coordinates, and field names carry the marker "(illustrative; the final Registry entry is authoritative)".

## License

MIT (see the `LICENSE` file at the repository root)
