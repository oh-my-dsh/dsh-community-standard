# `storage.dsh/v1alpha1` — LocalStorage

> **Status: Draft v0.15 (community draft — not an official dsh standard; coordinates are illustrative — the Registry's final decision prevails)**
> Machine-readable entry: [storage.dsh-v1alpha1.json](storage.dsh-v1alpha1.json)

This contract governs "a plugin's own key-value persistence": read this entry when your plugin needs to store config, caches, or last-run state; read it too if you're a host maintainer implementing a per-plugin isolated storage backend.

## Semantics

**Plugin-private, host-managed persistent storage**, isolated per **Component**:

- Each plugin can only read and write its own namespace; namespace boundaries are enforced at the contract layer by the Broker (the trusted-in-process tier is not a security sandbox — claim boundaries in [spec/conformance.md](../../spec/conformance.md)).
- Stored content lives on the **Component** lifecycle and does not disappear with a single activation — data survives plugin updates, HMR, and repeated activations (activation semantics in [spec/lifecycle.md](../../spec/lifecycle.md)).
- This contract is a negotiated capability: the plugin declares the dependency in its manifest, and the host injects it after negotiation succeeds; the semantics of required-missing load rejection and optional-missing degradation are in [spec/negotiation.md](../../spec/negotiation.md) and are not repeated here.

## Explicitly out of scope

| Out of scope | One-line reason | Owned by |
| --- | --- | --- |
| Cross-plugin shared storage | Sharing is fundamentally an inter-plugin composition problem; provider cardinality, selection, and conflict rules have to be defined first | [RFC 0003](../../rfcs/0003-service-composition.md) (v0.15 §4.2) |

Multi-scope storage and Secret capabilities are likewise deferred topics, each to be revisited once it has its own RFC.

## Usage example

Manifest dependency declaration (field layout illustrative; [spec/manifest.md](../../spec/manifest.md) and the Registry's final decision prevail):

```json
{
  "requires": {
    "contracts": [
      { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" }
    ]
  }
}
```

Using the negotiated, injected capability inside an activation (SDK shape illustrative):

```ts
export default defineFacet(async (activation) => {
  const storage = activation.storage // LocalStorage injected after negotiation

  await storage.set('lastMessageId', 'msg_55d1')
  const last = await storage.get('lastMessageId')
})
```

## Corresponding v0.1 name

`storage.local` (v0.1 flat capability name). From v0.15 on, use the contract coordinate `storage.dsh/v1alpha1` + kind `LocalStorage`; versions evolve independently per contract (see [VERSIONING.md](../../VERSIONING.md)).
