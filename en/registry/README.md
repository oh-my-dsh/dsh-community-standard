# Registry: Contract Registry

> **Status: Draft v0.15 (community draft — not an official dsh standard)**

What this file governs: how to read, write, add, and change entries in this directory (the contract registry). Who should read it: every implementer — **contract names and versions are authoritatively defined by the entries here, and only here**; no inventing "equivalent" names from RFC or spec prose — and anyone who wants to register a new contract.

## 1. Entry format

Each contract entry = **one JSON file** (machine-readable, authoritative source) + **one same-named `.md` file** (plain-language explanation + usage examples). Both live in the same directory under the same basename:

```text
capabilities/commands.dsh-v1alpha1.json   # machine-readable entry
capabilities/commands.dsh-v1alpha1.md     # plain-language explanation
```

Capability entries go in `capabilities/`; event entries go in `events/`. The file basename = the coordinate's `apiVersion` part with `/` replaced by `-` (e.g. `commands.dsh/v1alpha1` → `commands.dsh-v1alpha1`).

### 1.1 JSON fields

Using [`capabilities/commands.dsh-v1alpha1.json`](capabilities/commands.dsh-v1alpha1.json) as the working sample, the fields are:

| Field | Meaning |
| --- | --- |
| `apiVersion` | The version-line part of the coordinate, e.g. `commands.dsh/v1alpha1` |
| `kind` | The category part of the coordinate, e.g. `Command`. Together, `apiVersion + kind` form the contract coordinate (rules in [VERSIONING.md](../VERSIONING.md)) |
| `status` | Entry status: `Draft`, etc.; values and transitions follow the RFC state machine ([rfcs/template.md](../rfcs/template.md)) |
| `owningSpec` | The spec file that defines the contract's behavioral semantics (repo-relative path) |
| `owningRFC` | The RFC that decided this contract exists (repo-relative path) |
| `schema.id` | Canonical identifier of the contract's input/output schema (currently an illustrative URL; this Registry's final decision prevails) |
| `schema.hash` | Immutable hash of the schema; `null` before the schema is frozen, and once frozen it must be filled in and must never change again |
| `sensitivity` | Sensitivity level: `low` / `high`, used by authorization and redaction policies |
| `lifecycleScope` | The scope a registration of this contract belongs to: `activation` (one activation) or `component` (the whole component) |
| `deprecation` | Deprecation info; `null` when not deprecated; when deprecated, records the replacement coordinate and the deprecation window (window rules in [VERSIONING.md](../VERSIONING.md)) |
| `$comment` | A note for readers; carries no normative force |

Any field not listed for an entry is treated as nonexistent — do not assume undocumented extension fields.

## 2. Coordinate rules

- Contract coordinate = `apiVersion + kind`, e.g. `commands.dsh/v1alpha1` + `Command`.
- The semantics of `v1alpha1` (experimental period, may break, does not masquerade as a stable `1.x`) and the breaking-change / deprecation-window rules live in [VERSIONING.md](../VERSIONING.md) and are not repeated here.
- Host Descriptors and manifests may only reference **exact entries** that exist in this Registry — product-local aliases are not a substitute (host obligations: [rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md)).

## 3. Registration and change process

Adding a contract, modifying an entry, deprecating and replacing — all go through the RFC process: the review period, decision-making, name registration, and stewardship of the officially reserved namespace are defined by the [RFC 0000 governance document](../rfcs/0000-governance.md). Process in brief: file an RFC first (template: [rfcs/template.md](../rfcs/template.md)); once Accepted, the entry lands together with its schema and fixtures — a contract only counts as entering the standard when it has **spec semantics + a registry entry + a schema + fixtures** at the same time (principle ⑧).

## 4. Officially reserved namespace

The `*.dsh` coordinate domain (i.e. every coordinate whose `apiVersion` ends in `.dsh/`, including `commands.dsh`, `storage.dsh`, `messages.dsh`, and all future entries under that domain) is an **officially reserved namespace**: this community standard only holds the space in stewardship, and future official dsh capabilities can move in directly as first-class citizens. Community members must not register new coordinates under this domain on their own; the intake and handover rules for reserved namespaces are governed by [RFC 0000](../rfcs/0000-governance.md).

## 5. `x-org.*` private extensions

Organization-internal experimental contracts use an organization namespace, of the form `x-org.example.tui.keymap` (syntax and conflict rules in [VERSIONING.md](../VERSIONING.md)). Rules:

- `x-org.*` contracts do **not** enter this official Registry, and must not masquerade as standard entries in any way;
- It is recommended to manage them yourself in the same entry format used in this directory (JSON + same-named `.md`), which makes a future promotion proposal easier;
- A private capability that wants into the standard must go through its own RFC per §3, with multiple hosts demonstrating that its semantics are portable.

## 6. Current entries

| Coordinate | kind | Category | Status |
| --- | --- | --- | --- |
| [`commands.dsh/v1alpha1`](capabilities/commands.dsh-v1alpha1.md) | `Command` | capability | Draft |
| [`storage.dsh/v1alpha1`](capabilities/storage.dsh-v1alpha1.md) | `LocalStorage` | capability | Draft |
| [`messages.dsh/v1alpha1`](events/messages.dsh-v1alpha1.md) | `MessageObserver` | event | Draft |

(Coordinates are illustrative; this Registry's final decision prevails.)

## 7. Changelog

| Date | Change |
| --- | --- |
| 2026-08-18 | Initial draft: entry format (aligned with the existing JSON fields), coordinate rules, pointers to the registration process, the officially reserved namespace, and `x-org.*` rules |
