# `commands.dsh/v1alpha1` — Command

> **Status: Draft v0.15 (community draft — not an official dsh standard; coordinates are illustrative — the Registry's final decision prevails)**
> Machine-readable entry: [commands.dsh-v1alpha1.json](commands.dsh-v1alpha1.json)

This contract governs "a plugin registering an executable action with the host": the user triggers a command from a palette, menu, button, or TUI, and the plugin's handler runs. Read this entry if you're a plugin author declaring commands and binding handlers; read it too if you're a host maintainer implementing command presentation and routing.

## Semantics

**flat action leaf**: one globally unique command ID maps to one declared action and one handler owned by an activation. Done.

- The authoritative source of command metadata (ID, title) is the manifest `contributes` — the host can discover it before the plugin ever runs; plugin code only binds handlers to already-declared IDs (the declaration/binding consistency rules are in [spec/manifest.md](../../spec/manifest.md) and are not repeated here).
- The host may surface the same action in a palette, a menu, a button, or a TUI command line, but it **must not change its identity**: the same ID triggers the same handler from every entry point.
- Handler registration is owned by the activation: created with the activation, released on deactivate, and recorded in the effect ledger (see [spec/lifecycle.md](../../spec/lifecycle.md) §2.5–2.6).

## Explicitly out of scope

The following capabilities are **all outside** this contract; ownership in the right column (basis: v0.15 §4.2):

| Out of scope | One-line reason | Owned by |
| --- | --- | --- |
| Nested command trees / subcommands / CLI-style option parsers | The Remote SSH counterexample: subcommand trees get lost halfway across the transport | [RFC 0002](../../rfcs/0002-runtime-presentation.md) |
| Interactive prompts (device codes, confirmation requests, and other short-lived interactions) | Short-lived interactive messages need their own presentation channel | [RFC 0002](../../rfcs/0002-runtime-presentation.md) |
| Streaming output / background command sessions | Depends on the Runtime / Presentation layering contract | [RFC 0002](../../rfcs/0002-runtime-presentation.md) |

## Usage example

Manifest declaration (field layout illustrative; [spec/manifest.md](../../spec/manifest.md) and the Registry's final decision prevail):

```json
{
  "contributes": {
    "commands": [
      { "id": "com.example.message-memory.show-last", "title": "Show Last Message" }
    ]
  }
}
```

Publishing a handler inside an activation (SDK shape illustrative):

```ts
export default defineFacet((activation) => {
  activation.extensions.publish(
    { apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' },
    'com.example.message-memory.show-last',
    async () => {
      // Do one thing and return; no interactive prompts, no streaming output
    },
  )
})
```

## Corresponding v0.1 name

`commands` (v0.1 flat capability name). From v0.15 on, use the contract coordinate `commands.dsh/v1alpha1` + kind `Command`; versions evolve independently per contract (see [VERSIONING.md](../../VERSIONING.md)).
