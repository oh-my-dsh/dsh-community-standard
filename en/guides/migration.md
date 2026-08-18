# Migration Guide

> **Status: Draft v0.15 (community draft — not an official dsh standard) | This guide is non-normative; the spec/ documents prevail in case of conflict.**
>
> Who this is for: you have an **existing plugin** — the kind that stays alive through source patches, monkey patches, internal event names, and reflection into internal interfaces — and you want to migrate it onto the community standard.
>
> Source material: the community's source-code survey of 12 open-source plugins ([research/dsh-plugin-needs.md](../research/dsh-plugin-needs.md), a survey snapshot, non-normative). The four steps below are distilled from the breakpoints of those real plugins.

## Set expectations first

Migration is not "rewrite the patch in a new syntax". The standard's bargain is:

- **You give up**: every assumption about the host's internals (internal functions, internal event names, load order);
- **You get**: upstream dsh updates no longer break your plugin in batches; hosts can judge compatibility *before* installing; when multiple plugins coexist, it's no longer "whoever loads last wins".

The cost: some tricks **have no standard counterpart yet** — §3 lists them honestly. Don't migrate halfway only to discover your core feature can't land.

## Step 1: Identify the patch points

List every host-internal interface your plugin touches today. The 12 surveyed plugins cluster into six categories of coupling — check against them:

1. **patch / monkey patch**: which host file, which function did you change? Is the goal to "observe" or to "modify behavior"? — this distinction decides where step 2 maps it.
2. **Internal event names**: which internal event strings do you hard-code subscriptions to (e.g. the various session / message events)?
3. **Internal service probing**: which internal host services do you reach via `ctx.get()`, structural probing, or reflection?
4. **Direct file I/O**: what do you write into the host directory, workspace, or profile directories? (Config, caches, export artifacts)
5. **Internal UI / command registration**: patching UI code, calling internal command-registration functions, stuffing things into internal slots?
6. **Self-built channels**: your own loopback HTTP/WS routes, private RPC, DOM observation (MutationObserver), generated CSS classes?

An honest inventory example (modeled on a real plugin from the survey):

| My plugin | What it touches | Purpose |
| --- | --- | --- |
| session-export style | Reads internal session events; writes to the workspace via Node fs | Observe + export files |
| notify style | Listens to internal event names; self-built RPC to a settings page | Observe + persist settings + cross-face communication |
| sidebar style | Patches a UI slot; registers internal commands; private HTTP routes | Modify UI + register commands |

## Step 2: Map to standard contracts

Look up every patch point in this table. **The left column is what you do today; the right column is the v0.15 standard path. Where the right column says "none yet", go to §3.**

| What you do today | The v0.15 standard path |
| --- | --- |
| Hard-code internal event names for **read-only observation** | `messages.dsh/v1alpha1` (MessageObserver) + manifest `subscriptions` (event envelope: [spec/event-envelope.md](../spec/event-envelope.md)) |
| `ctx.get()` / reflection probing of internal services | Declare statically in manifest `requires.contracts`; the host injects them after negotiation — the probing itself is the thing being eliminated |
| Write config / store state into host directories | `storage.dsh/v1alpha1` (LocalStorage), plugin-private and host-managed |
| Patch UI / internal functions to register commands | `commands.dsh/v1alpha1` (Command, flat action leaf) + manifest `contributes.commands` declarations |
| Patch host source to **modify behavior** (intercept sends, rewrite messages, alter settlement) | **None yet** — the `before-*` modifiable events are deferred, see §3 |
| Register search / model / tool providers; plugins calling each other | **None yet** — `provides` is deferred (RFC 0003), see §3 |
| Custom UI panels, rich views, slots, themes | **None yet** — cross-platform declarative UI is deferred wholesale (RFC 0002), see §3 |
| Self-built loopback HTTP/WS for Host↔Client communication | **None yet** — the cross-face bridge belongs to RFC 0002, see §3 |
| Network requests, arbitrary file read/write, subprocesses / PTY | **None yet** — sensitive capabilities each need their own RFC, see §3 |

The authoritative source for contract coordinates is the [registry/](../registry/README.md); every entry has a machine-readable JSON plus a plain-language description (e.g. [commands.dsh-v1alpha1](../registry/capabilities/commands.dsh-v1alpha1.md)). **Check the semantics entry by entry before mapping** — for example, a v0.15 command is only a flat action leaf; if your old command carries a subcommand tree, the subcommand part falls under RFC 0002 — don't cram it into one handler and parse it yourself.

## Step 3: Add the manifest

Add `dsh-plugin.json` to your package root, turning the step-2 mapping into declarations. Field details: [spec/manifest.md](../spec/manifest.md) and [Plugin Author Guide](plugin-author.md) §1–§2. Here is only the migration-perspective checklist:

- [ ] `$schema` is filled in (required — without it, validation fails at the first step)
- [ ] `id` uses a reverse domain; every id in `contributes` carries your prefix (globally unique, statically conflict-checked)
- [ ] `requires.contracts` covers **all** runtime dependencies — the price of an unreported one is a missing API at runtime; mark the "can live without it" ones `optional` and write fallback branches
- [ ] `subscriptions` matches the events your code actually subscribes to
- [ ] `contributes.commands` corresponds one-to-one with the ids your code publishes (declared-but-unbound and bound-but-undeclared both get flagged)
- [ ] You did **not** write `provides` or `requires.services` — the v0.15 schema rejects both fields outright

## Step 4: Run validation and read the negotiation report

```bash
# Illustrative: the validator CLI's exact form depends on the tool
npx dsh-plugin-verify ./dsh-plugin.json
```

Run two layers of verification:

1. **Static validation**: check the manifest against [schemas/dsh-plugin.schema.json](../../schemas/dsh-plugin.schema.json); then self-check against the invalid samples in [conformance/fixtures/](../conformance/fixtures/README.md). The community validation tool dsh-plugin-verify has committed to tracking the standard schema ([community#23, comment 7](https://github.com/omdsh-dev/community/issues/23)).
2. **Negotiation report**: run your manifest × the target host's Host Descriptor through negotiation ([spec/negotiation.md](../spec/negotiation.md)), and focus on rejections for missing required contracts — each one is a place you haven't finished migrating, or a place the target host can't catch you yet.

Fix against the [error reference in Plugin Author Guide §6](plugin-author.md#6-load-rejection-error-reference) until no rejections remain. Then self-test to the plugin validation bar: resources are released after repeated activate/dispose cycles, fallback paths actually run when an optional capability is missing, and error messages make sense to a human ([spec/conformance.md](../spec/conformance.md)).

## 3. These tricks have no standard counterpart yet (the honest list)

Before migrating, confirm item by item that your plugin doesn't depend on the following. If it does, you have a choice: wait for the corresponding RFC, support only hosts that keep a legacy path, or cut the feature.

| Trick | Status | Where it's headed |
| --- | --- | --- |
| Modify / intercept messages and behavior (before-send-style cancellable, modifiable events) | Deferred; not in v0.15 | [RFC 0002](../rfcs/0002-runtime-presentation.md) precondition checklist: multi-plugin ordering, modification merging, cancel semantics, timeouts, rollback, and privacy redaction all need answers before it opens |
| Plugins calling each other, registering providers (search / model / tool), depending on a "capability" rather than a concrete plugin | Deferred; the v0.15 schema rejects `provides` / `requires.services` outright | [RFC 0003](../rfcs/0003-service-composition.md) — top priority of the next phase; community#24 comment 2 also explicitly demands it stay high-priority |
| Custom UI panels / rich views / themes / command trees / interactive prompts / short-lived presentation channels (device codes, QR codes, confirmation requests) | Deferred | [RFC 0002](../rfcs/0002-runtime-presentation.md) (cross-platform declarative UI and the Runtime / Presentation split are deferred wholesale) |
| Strongly-typed Host ↔ Client cross-face bridge (replacing self-built loopback RPC) | Deferred | [RFC 0002](../rfcs/0002-runtime-presentation.md) |
| Networking (`net.*`), filesystem read/write (`fs.*`), subprocesses / PTY | On hold | Sensitive capabilities; each needs its own RFC, and an authorization UX contract has to come first |
| Install-impact previews, runtime provenance, "who changed what" troubleshooting | Beyond v0.15's minimal effect ledger | [RFC 0004](../rfcs/0004-provenance-diagnostics.md) |

This list doesn't mean "never" — it means "through the RFC process". If your plugin is stuck on one of these cells, the most effective move is to post your real usage in the corresponding RFC's discussion — much of v0.15's design was pushed into shape by community counterexamples exactly that way.

## 4. Coexisting with legacy paths during migration

The standard does **not** require hosts to remove built-in, legacy, or non-standard plugin paths. The migration-era boundary is drawn like this:

- **Standard plugins must enter through the standard door**: static manifest declaration → negotiation → authorization → lifecycle activation. There is exactly one normative path for anything in standard scope; don't invent side doors for the same standard capability.
- **Legacy / built-in extensions are the host's product boundary**: they don't participate in standard-conformance claims, and they don't stop working because the standard exists. The host keeps owning them; the standard neither endorses nor forbids them.
- **No riding both horses**: a host must not "quietly approximate" a capability it can't map equivalently through internal interfaces and then claim support; a plugin must not take the standard contracts with one hand while still patching the same behavior with the other. Behavior on the legacy path doesn't count as standards-compliant.
- **One package can walk on both legs**: during migration your package can carry both the old entry (serving legacy hosts) and `dsh-plugin.json` (serving standard hosts), evolving independently; but for standard hosts, the manifest must declare your complete, true requirements.

In one sentence: **the standard governs standard plugins, legacy governs legacy plugins, and neither pretends to be the other.** As RFC 0002/0003/0004 land one by one, the cells in §3 get absorbed into the standard, and the reasons for legacy paths to exist shrink with them.

## Related

- [Plugin Author Guide](plugin-author.md) — ten-minute quickstart and the error reference
- [spec/manifest.md](../spec/manifest.md) — authoritative field-by-field manifest definition
- [spec/negotiation.md](../spec/negotiation.md) — negotiation and load-rejection semantics
- [spec/conformance.md](../spec/conformance.md) — evidence requirements for plugin validation
- [research/dsh-plugin-needs.md](../research/dsh-plugin-needs.md) — the coupling-point survey of 12 real plugins (this guide's main source material)
