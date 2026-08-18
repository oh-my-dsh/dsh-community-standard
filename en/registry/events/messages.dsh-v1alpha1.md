# `messages.dsh/v1alpha1` — MessageObserver

> **Status: Draft v0.15 (community draft — not an official dsh standard; coordinates are illustrative — the Registry's final decision prevails)**
> Machine-readable entry: [messages.dsh-v1alpha1.json](messages.dsh-v1alpha1.json)
> ⚠️ The payload's ContentBlock alignment boundary is **pending community feedback before freezing** (v0.15 §9, question 3).

This contract governs "a plugin observing messages": read this entry when your plugin needs to be notified as messages are sent and received (for logging, statistics, or automation); read it too if you're a host maintainer implementing message-event delivery and redaction.

## Semantics

**Non-modifiable message-observation events**; the normative event name for this event is **`messages.observe`** (carried over from v0.1):

- An observer can only **read** events: it cannot modify them, cannot cancel them, and cannot block the message itself.
- The authoritative definitions of envelope fields, in-scope ordering guarantees, and immutable payloads live in [spec/event-envelope.md](../../spec/event-envelope.md) — this entry only covers usage and doesn't repeat the rules.
- Subscriptions are declared via manifest `subscriptions` and only control event delivery; a subscription hit does **not** activate an inactive plugin (activation semantics in [spec/lifecycle.md](../../spec/lifecycle.md) §2.2).

## Sensitivity level

**Message content is high-sensitivity data** (`sensitivity: high` in the machine-readable entry):

- Subscribing to this event requires explicit authorization — host support does not mean the user has authorized it (the negotiation/authorization relationship is in [spec/negotiation.md](../../spec/negotiation.md)).
- The host must apply `redactions` according to the envelope's `privacyClass` and must not hand full message bodies to unauthorized observers (rules and fixtures in [spec/event-envelope.md](../../spec/event-envelope.md) §2.4).
- How much data a plugin actually receives depends on the authorization scope, not on how much it declared it wants to see.

## Payload alignment with MCP `ContentBlock` (**pending community feedback before freezing**)

The exact field boundary where `payload.content` aligns with the [MCP `ContentBlock`](https://modelcontextprotocol.io/specification/2026-07-28/schema#contentblock) — which fields enter the envelope, which get redacted, how `privacyClass` is graded — is this round's open consultation point (v0.15 §9, question 3, raised by morlay; disposition in [decisions/round-2-issue-24.md](../../decisions/round-2-issue-24.md)). The draft proposal and open questions are in [spec/event-envelope.md](../../spec/event-envelope.md) §3.2 and are not repeated here. **Until frozen, no field value may be propagated as a stable contract.**

## Usage example

Manifest subscription declaration — the elements of `subscriptions` are **event names** (per [spec/manifest.md](../../spec/manifest.md) §3.10):

```json
{
  "subscriptions": ["messages.observe"]
}
```

Registering an observer inside an activation (SDK shape illustrative):

```ts
export default defineFacet((activation) => {
  const dispose = activation.messages.observe((envelope) => {
    // envelope.payload is read-only; rewriting it has no effect
    console.log(envelope.scopeSequence, envelope.payload.messageId)
  })
  activation.scope.add(dispose) // owned by this activation; released automatically on deactivate
})
```

## Event name vs. contract coordinate

- **Event name `messages.observe`** (carried over from the v0.1 flat capability name): manifest `subscriptions` uses it to declare subscriptions (see [spec/manifest.md](../../spec/manifest.md) §3.10).
- **Contract coordinate `messages.dsh/v1alpha1` + kind `MessageObserver`**: `requires.contracts`, Host Descriptor `capabilities`, negotiation reports, and the envelope's `eventType` / `eventVersion` (`messages.dsh` / `v1alpha1`) use it for exact references; versions evolve independently per contract (see [VERSIONING.md](../../VERSIONING.md)).

Both notations point at the same Registry entry; they serve different purposes and must not be used interchangeably.
