# Versioning and Contract Coordinates

> **Status: Draft v0.15 (community draft — not an official dsh standard)**

This document manages one thing: what every "version number" in this standard means, when it changes, and who is affected when it does. This is the most easily confused part of the whole standard, so it gets its own file. **Plugin authors, host maintainers, and tool authors should all read it** — afterwards you should be able to answer: "for the thing I want to change, which version number should move?"

## 1. The six version axes

Six versions coexist in this ecosystem, and they **must not be collapsed into one field**:

| # | Version | Meaning | Who moves it | Example |
| --- | --- | --- | --- | --- |
| 1 | Plugin `version` | The plugin's own SemVer version | The plugin author, on every release | `"version": "1.2.0"` |
| 2 | `manifestVersion` | The version of the `dsh-plugin.json` file structure | The standard, when it revises the manifest structure | `"manifestVersion": "0.15"` |
| 3 | Facet `apiVersion` | The host-API compatibility range a plugin facet requires | The standard, when it revises the facet host API | See [spec/facet-model.md](spec/facet-model.md) |
| 4 | Domain contract version | The `apiVersion` inside a contract coordinate (`apiVersion + kind`); each contract **evolves independently** | The contract itself, when it is revised | `commands.dsh/v1alpha1` |
| 5 | Host product version | The product version of each GUI / Web UI / TUI / launcher | Each host, on its own releases | `dsh-webui 1.4.0` |
| 6 | SDK release version | The release version of the type definitions and developer toolkit | The SDK, on every release | `@dsh-std/sdk@0.15.2` (illustrative; the final Registry entry is authoritative) |

Three corollaries:

- **Compatibility decisions only look at 2, 3, and 4 — never 5.** Whether a host is compatible depends on the contract coordinates it declares, not on product version numbers like `gui>=2.0`. Negotiation rules: [spec/negotiation.md](spec/negotiation.md).
- **An SDK version does not automatically equal a standard version.** An SDK upgrade implies no contract change; a contract change always produces a new coordinate.
- **`manifestVersion` is not a negotiation axis.** It only declares the file structure and selects the validation rules together with `$schema`; "what capabilities a plugin needs" is always expressed through contract coordinates. See [spec/manifest.md](spec/manifest.md).

## 2. Contract coordinates: `apiVersion + kind`

From v0.15 on, every capability, event, and extension point is identified by a two-part coordinate: **`apiVersion + kind`**. The design borrows from Kubernetes type metadata, but takes only the coordinate and version semantics, not the whole resource model (disposition records: [decisions/round-1](decisions/round-1-issue-23.md), [decisions/round-2](decisions/round-2-issue-24.md)).

The first three coordinates of v0.15 (the authoritative definitions live in the Registry entries; this is only an index):

| Contract coordinate | kind | Contents | Registry entry |
| --- | --- | --- | --- |
| `commands.dsh/v1alpha1` | Command | flat action leaf: one global ID bound to one handler | [commands.dsh-v1alpha1](registry/capabilities/commands.dsh-v1alpha1.md) |
| `storage.dsh/v1alpha1` | LocalStorage | private persistence isolated per plugin | [storage.dsh-v1alpha1](registry/capabilities/storage.dsh-v1alpha1.md) |
| `messages.dsh/v1alpha1` | MessageObserver | non-modifiable message-observation events | [messages.dsh-v1alpha1](registry/events/messages.dsh-v1alpha1.md) |

Three usage rules:

- **Coordinates are opaque.** Tools must not parse segments like `dsh` out of a coordinate string and infer semantics on their own; semantics always come from the Registry entry.
- **Names only exist once registered in the Registry.** Implementers must not invent "equivalent" names from RFC text or source code; manifests and Host Descriptors may only reference exact Registry entries. Registration process: [RFC 0000](rfcs/0000-governance.md) and [registry/README.md](registry/README.md).
- **Independent contract versioning is deliberate.** Domains such as Model Providers and progressive tool disclosure are pushed hard by the upstream model ecosystem and evolve extremely fast; a centralized, fixed SDK cannot keep up. When one domain's contract upgrades, only that contract and the plugins using it need to move — the kernel, unrelated plugins, and hosts do not need a re-release. Validated by an existing independent exploration: [Yan-Zero/dsh-std](https://github.com/Yan-Zero/dsh-std). (Historical footnote: during v0.1, contract versions temporarily followed a unified `apiVersion`; from v0.15 they evolve independently with the coordinate.)

## 3. The semantics of `v1alpha1` and `0.x`

- **`v1alpha1` is an experimental coordinate: it may break and makes no stability promise.** The alpha semantics must be stated plainly: it is not "the first minor of a stable 1.0"; the upgrade path is publishing a new coordinate (`v1alpha2` → `v1beta1` → `v1`), not patching the old coordinate in place.
- **`manifestVersion: "0.x"` works the same way**: the v0 phase is explicitly labeled with the experimental rule "**minor may break**" — `0.15` → `0.16` may adjust the manifest structure and does not pretend to be a stable `1.x`.
- No document, tool, or marketplace page may present an alpha / 0.x version as "stable".

## 4. Breaking changes and deprecation windows

- **A breaking change to a contract must be published as a new coordinate** (a new `apiVersion` or a new kind); semantics must never be modified in place under an old coordinate. Registering a new coordinate follows the RFC process defined in [RFC 0000](rfcs/0000-governance.md).
- The old coordinate enters the **deprecated** state: the Registry entry must record the deprecation info, the replacement coordinate, and the removal plan. Entry format: [registry/README.md](registry/README.md).
- **Deprecation windows are declared entry by entry — no global one-size-fits-all**: each coordinate's window is written in its own Registry entry, and hosts should keep supporting it for the duration. The window's length is justified by the RFC registering the contract — the wider the usage, the longer the window.
- Breaking changes to the manifest structure work the same way: when a new standard version ships, the migration requirements for the old structure are written into the same change RFC.

## 5. Namespaces: private extensions and official reservations

### 5.1 The `x-org.*` private namespace

- Private / experimental capabilities use an explicit namespace with organizational ownership, e.g. `x-org.example.tui.keymap`, `x-web.panel.urlState` (the latter's origin: [decisions/round-2](decisions/round-2-issue-24.md)). Short, collision-prone names must not be used.
- Private coordinates may be written into Host Descriptors and manifests and take part in negotiation, but **must not masquerade as standard coordinates**, and the `x-` prefix must not be omitted.
- `x-` is an escape hatch, not the main road: once a private capability has been implemented independently by multiple hosts and its semantics have proven portable, it should be registered as a standard coordinate through an RFC.

### 5.2 Officially reserved namespaces

- The Registry reserves a set of namespaces for dsh official; community entries must not occupy them, so future official capabilities can move in as first-class citizens. The reserved list: [registry/README.md](registry/README.md).
- A non-conflict confirmation request for the `dsh-plugin.json` filename and the `dsh-*` naming prefix has been sent to the official project (see [RFC 0001](rfcs/0001-core-contract.md) §7.2); the outcome will be registered in the `decisions/` disposition records through the feedback chain.
