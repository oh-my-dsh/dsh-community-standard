# Plugin Author Guide

> **Status: Draft v0.15 (community draft — not an official dsh standard) | This guide is non-normative; the spec/ documents prevail in case of conflict.**
>
> The spec can be serious; a guide has to speak plainly. The goal of this page: get you from zero to a plugin that any standards-compliant host can load, in about 10 minutes.

## 0. First things first: why patching is over

The dsh ecosystem already ran this experiment once: in the loader free-for-all era, the moment upstream unified how plugins register, every third-party loader broke overnight; plugins that lived on source patches blew up in batches with every dsh update. **An ecosystem built on implementation details dies; an ecosystem built on a standard survives upstream's release cycle.**

So under this standard, a plugin no longer "grabs a handle and does whatever it wants". Instead:

1. A static `dsh-plugin.json` declares "who I am and what I need";
2. The host can tell whether it can run your plugin *before* installing or loading it — and if it can't, it rejects the plugin cleanly instead of installing it and blowing up;
3. The code you write only touches the standard capabilities injected after negotiation — never the host's internal functions.

Here's how your old tricks map to the standard path:

| What you used to do | The v0.15 standard path |
| --- | --- |
| Patch host source / monkey-patch internal functions | **No legitimate equivalent.** If you only want to *see what happens*, observe events via `messages.dsh/v1alpha1`; if you want to *change behavior*, that belongs to the `before-*` modifiable events, which are deferred (see §6 of this guide) |
| Hard-code internal event names (e.g. some session event string) | `messages.dsh/v1alpha1` (MessageObserver) + `subscriptions` in the manifest |
| Probe internal host services via `ctx.get()` reflection and use whatever you find | Declare statically in `requires.contracts` in the manifest; the host injects them after negotiation — if the probe would fail, the plugin is rejected before install |
| Write files into the host directory / workspace to store state | `storage.dsh/v1alpha1` (LocalStorage): plugin-private, host-managed persistence |
| Patch UI code to register commands / call internal command-registration functions | `commands.dsh/v1alpha1` (Command) + `contributes.commands` in the manifest |

v0.15 has exactly three contract coordinates, all with machine-readable entries in the [registry/](../registry/README.md). Let's get to work.

## 1. Write a manifest (`dsh-plugin.json`)

Create `dsh-plugin.json` in your package **root** — deliberately not named `plugin.json`, because that name is already taken by the [Agent Plugins Specification](https://agent-plugins.org/); one package can carry both files and support both ecosystems.

Copy this complete example (a plugin that "remembers the last message"):

```json
{
  "$schema": "https://dsh-std.example/schemas/dsh-plugin/v0.15.json",
  "id": "com.example.message-memory",
  "name": "Message Memory",
  "version": "1.0.0",
  "manifestVersion": "0.15",
  "facets": {
    "host": { "entry": "dist/host.js", "apiVersion": "v1alpha1" }
  },
  "requires": {
    "contracts": [
      { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
      { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
      { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver" }
    ]
  },
  "permissions": [],
  "contributes": {
    "commands": [
      { "id": "com.example.message-memory.show-last", "title": "Show Last Message" }
    ]
  },
  "subscriptions": ["messages.observe"]
}
```

(The `$schema` URL is illustrative; the Registry's final decision prevails.)

The authoritative field-by-field definition lives in [spec/manifest.md](../spec/manifest.md); here we only cover the traps people actually fall into:

- **`$schema` is required.** The host uses it to pick the schema it ships locally to validate your manifest — it never fetches anything over the network. Without it, you fail the very first validation step.
- **Use a reverse-domain `id`** (`com.example.xxx`), not a short name — your `id` and the command ids in `contributes` must be globally unique; two plugins contributing the same id get stopped by static conflict detection before install.
- **The manifest must be static JSON.** No generating it dynamically with JS — marketplaces, launchers, and validation tools must be able to read it without executing your code.
- **v0.15 rejects the `provides` and `requires.services` fields outright** — write them and validation fails. Inter-plugin service composition is the scope of [RFC 0003](../rfcs/0003-service-composition.md); don't pre-declare it in the manifest.

## 2. Declare dependencies: required vs. optional in `requires.contracts`

Each entry in `requires.contracts` is an exact registry entry (`apiVersion + kind`), and it is **required** by default:

- **One missing required contract and the host rejects the load outright**, telling the user in the rejection exactly what's missing. That's a feature, not a bug: better not installed than installed and broken.
- **optional** — add `"optional": true`: if the host lacks the capability, the plugin still activates, but the corresponding API doesn't exist; your code must take its own fallback path:

```json
{ "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver", "optional": true }
```

```ts
// Optional capabilities must be checked before use (illustrative; the SDK's final form prevails)
if (activation.capabilities.messages) {
  activation.capabilities.messages.observe(handler)
} else {
  activation.log.info('This host does not support message observation; related features are disabled')
}
```

Rule of thumb: **if your core feature is dead without it, mark it required; if the plugin only loses a nice-to-have, mark it optional and write the fallback branch for real.**

## 3. Write a command with `defineFacet`

The host-side entry (the file `facets.host.entry` points to) exports a `defineFacet` call. The example below follows the community-validated shape (the dsh-codex refactor branch; see the [community#24 discussion](https://github.com/omdsh-dev/community/issues/24)); **the SDK package name and signatures are not frozen — [spec/facet-model.md](../spec/facet-model.md) and the final SDK prevail**:

```ts
// src/host.ts (illustrative; the SDK's final form prevails)
import { defineFacet } from '@dsh-std/sdk'

export default defineFacet((activation) => {
  // Capabilities injected after negotiation: only what you declared in manifest requires shows up
  const { storage, messages } = activation.capabilities

  // Observe message events (corresponds to subscriptions in the manifest)
  const observer = messages.observe(async (event) => {
    await storage.set('lastMessageId', event.payload.id)
  })

  // Bind a handler to an id declared in manifest contributes.commands
  activation.extensions.publish(
    { apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' },
    'com.example.message-memory.show-last',
    async () => {
      const lastMessageId = await storage.get('lastMessageId')
      activation.log.info('Last observed message', { lastMessageId })
    }
  )

  // Cleanup hangs off the activation scope and runs automatically on deactivate
  activation.scope.add(() => observer.dispose())
})
```

Three rules of discipline:

1. **Declare what you bind; bind what you declare.** Both "a command declared in `contributes` with no published handler" and "a published id that was never declared in the manifest" get flagged by validation and consistency tests.
2. **A v0.15 command is a flat action leaf**: one globally unique id maps to one handler, done. Subcommand trees, interactive prompts, and streaming output are all out of v0.15 scope (they belong to [RFC 0002](../rfcs/0002-runtime-presentation.md)) — don't stuff short-lived interactive content like device codes or QR codes into a command.
3. **Cleanup must be repeatable.** On a normal shutdown the host deactivates on a best-effort basis, but nothing guarantees your cleanup runs on a crash, power loss, or force-kill; HMR or a profile reorganization may also activate/dispose the same plugin repeatedly. Write cleanup as idempotent logic that survives running twice.

## 4. Run validation locally

You don't have to install into a host to find out what's wrong. Validation tools statically check your manifest against [schemas/dsh-plugin.schema.json](../../schemas/dsh-plugin.schema.json):

```bash
# Illustrative: the validator CLI's exact form depends on the tool
npx dsh-plugin-verify ./dsh-plugin.json
```

The community validation tool [dsh-plugin-verify](https://github.com/omdsh-dev/community/issues/23) (community#23, comment 7) has committed to consistency-checking against the standard schema. Coverage includes: whether `$schema` exists and is recognized, whether fields conform to the schema, whether contract coordinates resolve in the registry, whether `contributes` ids collide with other known plugins, and whether declarations match bindings.

## 5. Read the negotiation report

Validation passed; next comes host-side **negotiation**: your manifest × the host's Host Descriptor → a machine-readable negotiation report (authoritative format in [spec/negotiation.md](../spec/negotiation.md) and [schemas/negotiation-report.schema.json](../../schemas/negotiation-report.schema.json)). Three outcomes:

- **Compatible**: the host implements every required contract — good to activate;
- **Pending authorization**: the capabilities exist, but sensitive scopes need a user or policy approval first;
- **Load rejection**: a required contract is missing; the report lists which ones and why.

A rejection report looks like this (field names illustrative; the schema's final form prevails):

```json
{
  "reportVersion": "0.15",
  "plugin": { "id": "com.example.message-memory", "version": "1.0.0" },
  "host": { "id": "org.example.dsh-tui", "version": "2.1.0" },
  "verdict": "rejected",
  "missing": [
    {
      "apiVersion": "messages.dsh/v1alpha1",
      "kind": "MessageObserver",
      "required": true,
      "reason": "host does not implement this registry entry"
    }
  ]
}
```

Once you hold a rejection report you have exactly three moves: make the missing capability optional and write a fallback path; switch to a host that implements it; or wait — and push the community to bring that capability into the standard.

## 6. Load-rejection error reference

> Error wording is illustrative; exact formats follow [spec/negotiation.md](../spec/negotiation.md), [spec/manifest.md](../spec/manifest.md), and the schemas as finalized.

| Error (illustrative) | What it means | How to fix |
| --- | --- | --- |
| `missing required contract: commands.dsh/v1alpha1 Command` | The host doesn't implement this registry entry, and you marked it required | Make it optional and write a fallback path; or switch hosts |
| `unknown contract coordinate: command.dsh/v1alpha1` | The coordinate is misspelled or self-invented; it doesn't resolve in the registry | Fix it against the exact entries in the [registry/](../registry/README.md) |
| `$schema is required` | The manifest is missing the `$schema` field | Add the canonical schema identifier (see the §1 example) |
| `unsupported declaration: provides` | v0.15 rejects the `provides` field | Remove it; inter-plugin service composition waits for [RFC 0003](../rfcs/0003-service-composition.md) |
| `unsupported declaration: requires.services` | Same — v0.15 rejects `requires.services` | Remove it, same as above |
| `duplicate contribution id: com.example.foo.bar` | A command id you contribute collides with another plugin's | Prefix ids with your own reverse domain |
| `contribution declared but not bound` | The manifest declares a command, but the code never publishes a handler | Add the binding, or drop the declaration |
| `bound but not declared` | The code publishes an id the manifest never declared | Add the declaration under `contributes.commands` |
| `apiVersion range not satisfied` | The contract version you declared is outside the host's supported range | Check `apiVersions` in the host's Host Descriptor, align, and retry |

## 7. What the standard can't handle yet (the honest list)

v0.15 has no standard path for the following needs — before writing a plugin, confirm you don't depend on them:

- **Modifying / intercepting messages and behavior** (`before-*` modifiable events) → deferred; the precondition checklist is in [RFC 0002](../rfcs/0002-runtime-presentation.md)
- **Plugins calling each other, registering providers** (search providers, model providers, etc.) → [RFC 0003](../rfcs/0003-service-composition.md)
- **Custom UI panels, rich views, command trees, interactive prompts, short-lived presentation channels** (device codes / QR codes / confirmation requests) → [RFC 0002](../rfcs/0002-runtime-presentation.md)
- **Network access, filesystem read/write, subprocesses / PTY** → sensitive capabilities; each needs its own RFC and an authorization UX
- **Cross-face bridges** (strongly-typed Host ↔ Client RPC) → [RFC 0002](../rfcs/0002-runtime-presentation.md)

If you're migrating from an existing patch-style plugin, go straight to the [Migration Guide](migration.md).

## Related

- [spec/manifest.md](../spec/manifest.md) — authoritative field-by-field manifest definition
- [spec/facet-model.md](../spec/facet-model.md) — the minimal API surface of the `defineFacet` context
- [spec/negotiation.md](../spec/negotiation.md) — negotiation and load-rejection semantics
- [spec/lifecycle.md](../spec/lifecycle.md) — the activation lifecycle
- [registry/](../registry/README.md) — contract coordinates and machine-readable entries
- [Migration Guide](migration.md) — migrating away from patch-style plugins
