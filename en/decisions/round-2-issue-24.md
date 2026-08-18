# Disposition Record · Round 2: community#24 (5 comments → v0.15)

| Field | Value |
| --- | --- |
| Feedback source | [omdsh-dev/community#24](https://github.com/omdsh-dev/community/issues/24) (v0.1 final draft + third-round 5 comments) |
| Disposition version | v0.15 |
| Status | Archived |

> **Rule**: new comments never silently rewrite a Draft — changes go through RFC review first, then get registered in this directory. Disposition categories: Adopted / Adopted with limits / Separate RFC / Adapter experiment / Not portable core / Recorded.

| Input (author) | Disposition | Landing spot |
| --- | --- | --- |
| The kernel should be a domain-agnostic meta-protocol; contracts should be pluggable and independently versioned, avoiding frequent re-releases of a centralized SDK (Yan-Zero, with the [dsh-std](https://github.com/Yan-Zero/dsh-std) exploration) | **Adopted** | Principle ⑦; meta-protocol kernel rework ([spec/negotiation.md](../spec/negotiation.md)); contracts versioned independently ([VERSIONING.md](../VERSIONING.md)) |
| Introduce Facets and Scoped Context to specify multi-platform plugin shapes (Yan-Zero, with the [dsh-codex refactoring proof](https://github.com/Yan-Zero/dsh-codex/tree/agent/std-facet-runtime)) | **Direction adopted, scope narrowed** | The four-level object model enters the standard vocabulary ([spec/facet-model.md](../spec/facet-model.md)); v0.15 only specifies `host`; the reserved names `client` / `worker` belong to [RFC 0002](../rfcs/0002-runtime-presentation.md) |
| Message content should align with MCP `ContentBlock` to avoid information loss and serialization overhead (morlay) | **Adopted** | [spec/event-envelope.md](../spec/event-envelope.md); the exact field boundary is listed in the v0.15 §9 consultation |
| URL query state persistence/restore (Grafana-dashboard-style, coping with random desktop ports) (morlay) | **Adopted with limits** | Belongs to the Web Presentation capability (working name `x-web.panel.urlState`), with a field whitelist, size caps, per-plugin isolation, and no secrets; does not enter the core and is not imposed on TUI / headless hosts (per Qiuner's suggestion) |
| RFC 0003 (inter-plugin service composition) stays the highest priority of the next phase (Qiuner) | **Adopted** | Review starts in Phase 3; provider cardinality, selection, conflict plans, health, and replacement are its must-answer questions ([RFC 0003](../rfcs/0003-service-composition.md)) |
| Repeated emphasis that the reference implementation is not the standard (Qiuner) | **Adopted** | Promoted from an acceptance criterion to principle ⑧ |
| TUI signs up for the first batch of standard-compatible hosts and tests (T-Auto) | **Adopted** | v0.15 §4.4 acceptance evidence; Phase 2 ([spec/conformance.md](../spec/conformance.md)) |

> **Table note**: Issue #24 actually has 5 comments, but this table has 7 rows — one comment from Yan-Zero contains two suggestions (meta-protocol kernel, Facets), and one comment from Qiuner contains three (RFC 0003 priority, URL query ownership, reference-implementation positioning); each is registered suggestion by suggestion.
