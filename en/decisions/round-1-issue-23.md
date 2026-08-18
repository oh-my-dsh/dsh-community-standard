# Disposition Record · Round 1: community#23 (13 comments → v0.1)

| Field | Value |
| --- | --- |
| Feedback source | [omdsh-dev/community#23](https://github.com/omdsh-dev/community/issues/23) (first-round RFC + 13 comments) |
| Disposition version | v0.1 |
| Status | Archived |

> **Rule**: new comments never silently rewrite a Draft — changes go through RFC review first, then get registered in this directory. Disposition categories: Adopted / Adopted with limits / Separate RFC / Adapter experiment / Not portable core / Recorded.
> "Adopted" means adopted by the Draft documents; it does not mean all participants have reached formal consensus — formal consensus is produced by the governance process ([RFC 0000](../rfcs/0000-governance.md)).

| Input (author) | Disposition | Landing spot |
| --- | --- | --- |
| `plugin.json` conflicts with the Agent Plugins specification (btspoony) | Adopted | Renamed to `dsh-plugin.json` |
| Borrow Kubernetes type metadata / apiGroup+kind (morlay) | Adopted with limits → **expanded adoption in v0.15** | v0.1 took only the six-axis version model; v0.15 moved contract coordinates wholesale to `apiVersion + kind` |
| Patch churn and the need for credible verification; do not become an unverified plugin dumping ground (mattheliu) | Adopted | [RFC 0004](../rfcs/0004-provenance-diagnostics.md) evidence tiers; a format check ≠ security |
| Pre-installation impact preview + runtime provenance (shine-233) | Adopted | RFC 0004: impact report / validation report / effect ledger |
| dsh-forge / dsh-neoforge runtime mixin PoC and explicit conflict surfacing (r05En1cU) | Adapter experiment | Explicit conflict-surfacing evidence is valuable; private targets do not enter the plugin API |
| Dual version numbers, authoritative registry, globally unique contributes ids with static conflict detection, machine-readable validation report (qing3a / dsh-plugin-verify) | Adopted with limits | Static JSON, authoritative registry, deterministic IDs; the validation report is merged into the negotiation report format |
| dsh-TUI signs up for an early conformance implementation and provenance visualization (T-Auto) | Adopted | An implementation cannot self-certify; `before-*` still does not enter the core |
| Remote SSH counterexample: command tree lost, login method should not be decided at registration time, device codes must not enter persistent logs (Yan-Zero) | Separate RFC | [RFC 0002](../rfcs/0002-runtime-presentation.md) five-concept layering + short-lived interactive message channel |
| Formal Runtime / Presentation / Control / Transport layering; Reference Host included in the standard (T-Auto) | Adopted with limits | RFC 0002 defines the layering and conformance; it does not bless a single product architecture |
| Dependency locking, one-click reproduction, environment observability (T-Auto) | Separate RFC | RFC 0004 records immutable artifacts; lockfile / modpack belong to the packaging proposal |
| Split of requires / provides / contributes with machine-decidable composition rules, hook tiers (Qiuner) | Adopted | Principle ② five declaration kinds; [RFC 0003](../rfcs/0003-service-composition.md) composition rules |
| Unified page → layer → slot → component UI service (r05En1cU / Lipraty) | Separate RFC | Cross-platform declarative UI deferred as a whole; vnode / adapter evidence kept for the UI RFC |
| URL state for multi-panel Web UI (morlay, first round) | Not portable core | Belongs to the Web Presentation capability (v0.15 disposition: [round-2](round-2-issue-24.md)) |

The original comment-by-comment disposition record (with quoted comment text) is at [research/community-issue-23-review.md](../research/community-issue-23-review.md).
