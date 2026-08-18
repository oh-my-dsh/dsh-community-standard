# Spec: Event Envelope and `messages.observe`

> **Status: Draft v0.15 (community draft — not an official dsh standard)**
> ⚠️ The **exact field boundaries for aligning the payload with MCP `ContentBlock` are a key question of this review round (v0.15 §9 question 3); the relevant sections of this document are marked "frozen pending community feedback"**.

This document governs "what events look like, in what order they arrive, and whether they can be modified": the envelope format shared by all standard events, ordering and immutability guarantees, and `messages.observe` — the only event contract in v0.15. Who should read it: **host maintainers** (produce and deliver envelopes), **plugin authors** (subscribe to and consume events), **marketplace / diagnostics tool authors** (rely on `privacyClass` and `redactions` to decide what can be displayed).

## 1. Scope

- This document defines the **envelope format shared by all standard events** and the delivery semantics, plus the usage constraints of the `messages.observe` event.
- The envelope is transport-neutral: in-process calls, IPC, and WebSocket all use the same format.
- This document does **NOT** define the payload schema of specific events (the machine-readable definition of payloads belongs to the Registry entries and their schema files); the registry entry for `messages.observe` is [registry/events/messages.dsh-v1alpha1.md](../registry/events/messages.dsh-v1alpha1.md).
- Mutable / cancellable `before-*` events are **NOT** in v0.15 scope (see §2.5).

## 2. Normative Definitions

### 2.1 Envelope Fields

Every standard event **MUST** be wrapped in a versioned envelope. The v0.15 envelope fields (field names illustrative; the Registry has the final say):

| Field | Necessity | Meaning |
| --- | --- | --- |
| `envelopeVersion` | MUST | The version of the envelope structure itself, evolving independently of event contract versions |
| `eventType` / `eventVersion` | MUST | The two halves of the event contract coordinate (e.g. `messages.dsh` / `v1alpha1`); together they point to exactly one Registry entry |
| `eventId` | MUST | Globally unique event ID |
| `scopeType` / `scopeId` / `scopeSequence` | MUST | The type and ID of the scope the event belongs to (e.g. a session), plus a sequence number that is **monotonically increasing within that scope** |
| `correlationId` | SHOULD | Correlation ID of the same operation chain, for cross-event tracing |
| `privacyClass` | MUST | The sensitivity level of the event (the value set is frozen together with the ContentBlock boundaries; see §3.2) |
| `redactions` | MUST | Summary of redactions already applied; an empty list when nothing was redacted — the field itself MUST NOT be omitted |
| `payloadSchema` | MUST | The canonical schema identifier of the payload; the host uses it to select a locally supported schema and MUST NOT fetch it over the network |
| `payload` | MUST | The event body, **immutable** (see §2.3) |

Normative requirements:

- An envelope missing any "MUST" field is illegal; the host **MUST** refuse delivery and record an error (violations caught by `conformance/fixtures/events/envelope-missing-field.json` — the fixture deletes required fields one by one and asserts delivery is refused).
- `scopeSequence` **MUST** be monotonically increasing and non-repeating within the same `scopeType` + `scopeId` (violations caught by `conformance/fixtures/events/scope-sequence-gap.json` — the fixture delivers out-of-order/duplicate sequence numbers and asserts detection).
- `eventType` / `eventVersion` **MUST** resolve to a precise Registry entry; implementers MUST NOT invent "equivalent" event names (violations caught by `conformance/fixtures/events/unknown-event-type.json`).

### 2.2 Ordering Guarantees: In-Scope Order Only

- The host **MUST** guarantee that delivery order **within the same scope** matches `scopeSequence` (covered by the same fixture `scope-sequence-gap.json`).
- The envelope **implies no global order**: there is no guarantee about the relative order between different scopes or different eventTypes, and plugins **MUST NOT** infer causality from cross-scope arrival order; use `correlationId` when correlation is needed (violations caught by `conformance/fixtures/events/no-global-order.json` — the fixture interleaves events from two scopes and asserts consumers make no global-order assumptions).
- Timestamps (if an implementation adds them itself) likewise do not constitute cross-scope ordering evidence.

### 2.3 Immutable Payload

- Once an envelope is delivered to an observer, its `payload` **MUST NOT** be modifiable: any write by an observer MUST NOT affect other observers or host-side state (violations caught by `conformance/fixtures/events/payload-mutation.json` — the fixture's observer attempts to rewrite payload fields, and the test asserts other observers and the host see the original values).
- "Not modifiable" is a semantic guarantee; the host **MAY** implement it with frozen objects, copies, or read-only views.

### 2.4 `messages.observe` Is an Immutable Observation Event

The only event contract in v0.15 is `messages.observe` (contract coordinate `messages.dsh/v1alpha1`, kind: MessageObserver). The event's **canonical event name** is `messages.observe`: a manifest's `subscriptions` subscribes by event name (see [spec/manifest.md](manifest.md) §3.10), while in envelopes the same event is identified by the two halves of the contract coordinate — `eventType: "messages.dsh"` / `eventVersion: "v1alpha1"`; the mapping between event name and coordinate is defined by the registry entry ([registry/events/messages.dsh-v1alpha1.md](../registry/events/messages.dsh-v1alpha1.md)):

- It is an **observation** event: observers can only read — they cannot modify, cancel, or block the message itself (violations caught by `conformance/fixtures/events/observer-cannot-modify.json` — the fixture's observer attempts to return modification instructions or a blocking signal and asserts they are ignored with no side effects).
- Subscriptions are declared via the manifest `subscriptions` field and control event delivery; a subscription hit **does NOT** activate an inactive plugin (activation semantics in [lifecycle.md](lifecycle.md) §2.2).
- Message content is highly sensitive data: observer plugins **MUST** declare the corresponding subscription in the manifest and pass authorization; hosts **MUST** apply `redactions` according to `privacyClass` (see §3.2; violations caught by `conformance/fixtures/events/redactions-required.json` — the fixture delivers a high-sensitivity event to an unauthorized observer and asserts the payload is redacted or delivery is refused).
- Backpressure, timeouts, error isolation, and drain behavior on shutdown are fixed by the conformance suites; an observer throwing an exception **MUST NOT** affect the main message flow or other observers (violations caught by `conformance/fixtures/events/observer-throws.json`).

### 2.5 Mutable `before-*` Events Are Not in v0.15

Mutable / cancellable `before-*` events do **NOT** exist in v0.15 — until multi-plugin execution order, modification merging, cancel semantics, timeout and rollback, cross-session concurrency, and privacy redaction are all defined, naming a listener `before` solves nothing. The entry preconditions for the standard are listed in [RFC 0002](../rfcs/0002-runtime-presentation.md); only after the whole list is answered and backed by fixtures may a concrete `before-*` event be proposed in a standalone RFC. In v0.15, hosts **MUST NOT** offer mutable message events under any name and claim conformance to this standard.

## 3. Examples

### 3.1 Complete Envelope Example

```json
{
  "envelopeVersion": "0.15.0",
  "eventType": "messages.dsh",
  "eventVersion": "v1alpha1",
  "eventId": "evt_01J4ZEXAMPLE7YQ8",
  "scopeType": "session",
  "scopeId": "sess_8f3a2c",
  "scopeSequence": 42,
  "correlationId": "req_7c1e9b",
  "privacyClass": "content",
  "redactions": ["payload.content[1].resource.uri"],
  "payloadSchema": "https://dsh-std.example/schemas/messages.dsh/v1alpha1.json",
  "payload": {
    "direction": "received",
    "messageId": "msg_55d1",
    "content": [
      { "type": "text", "text": "帮我看下这个报错" },
      { "type": "resource", "resource": { "uri": "[redacted]", "mimeType": "image/png" } }
    ]
  }
}
```

(The `payloadSchema` URL, `scopeType` values, and `privacyClass` values are illustrative; the Registry has the final say.)

### 3.2 Aligning the Payload with MCP `ContentBlock` (**Frozen Pending Community Feedback**)

The message content structure of `payload.content` aligns with [MCP `ContentBlock`](https://modelcontextprotocol.io/specification/2026-07-28/schema#contentblock). Rationale (morlay, round-2 discussion): the return results of ACP / MCP / ToolCall have converged on `ContentBlock[]`; inventing a bespoke format has zero benefit, while alignment avoids information loss and reduces serialization overhead (disposition record in [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)).

**This section is a request for comments; none of the following boundaries are frozen (v0.15 §9 question 3)**. Initial-draft proposals:

| Open question | Initial-draft leaning | Awaiting community feedback |
| --- | --- | --- |
| Which ContentBlock types enter the v0.15 envelope | `text`; `image` / `audio` / `resource` / `resource_link` enter by reference | Whether to accept all in the first version |
| Optional fields such as `annotations` | Kept, but listed as optional | Whether to cut them |
| Binary content | Not in the payload, only by reference (`resource_link` / `resource.uri`) | Thresholds and limits |
| `privacyClass` value set | Two levels to start: `metadata` (no body) / `content` (includes body) | How to design the levels to minimize misuse |
| `redactions` notation | List of JSON paths (see example) | Whether a stronger structured form is needed |

Before freezing, implementers **MAY** prototype against the initial-draft table above, but **MUST NOT** propagate any of these values as a stable contract.

## 4. Errors and Edge Cases

| Case | Required behavior |
| --- | --- |
| Envelope missing required fields / unrecognized version | Refuse delivery and record a stable error code; MUST NOT "parse best-effort" and deliver half an event |
| `scopeSequence` out of order / duplicate / gap | Detect and record; the host MAY drop the event or mark the scope degraded, but MUST NOT silently reorder |
| Observer throws or times out | Isolate the observer: record the error, MAY cancel its subscription; do not affect the main message flow or other observers |
| Observer attempts to modify the payload or returns modification instructions | Ignore; repeated violations MAY cancel the subscription |
| Unauthorized / high-sensitivity events | Deliver after redaction per `privacyClass`, or refuse delivery; MUST NOT hand the full body to an unauthorized observer |
| Queue not drained when the host shuts down | Best-effort drain; full delivery not guaranteed (shutdown semantics in [lifecycle.md](lifecycle.md) §2.3) |

## 5. Corresponding Fixtures

> Fixtures are created by a follow-up task; paths are agreed paths; each invalid sample embeds exactly one fault (conventions in [conformance/fixtures/README.md](../conformance/fixtures/README.md)).

| Fixture (agreed path) | The "MUST" it catches |
| --- | --- |
| `conformance/fixtures/events/envelope-missing-field.json` | Required fields: not one less |
| `conformance/fixtures/events/unknown-event-type.json` | eventType/eventVersion MUST resolve to a precise Registry entry |
| `conformance/fixtures/events/scope-sequence-gap.json` | In-scope sequence monotonic; delivery ordered |
| `conformance/fixtures/events/no-global-order.json` | No implied global order |
| `conformance/fixtures/events/payload-mutation.json` | Payload immutable |
| `conformance/fixtures/events/observer-cannot-modify.json` | Observation events cannot be modified / cancelled |
| `conformance/fixtures/events/observer-throws.json` | Observer exception isolation |
| `conformance/fixtures/events/redactions-required.json` | Authorization and redaction of high-sensitivity events |

## 6. Changelog

| Version | Date | Changes |
| --- | --- | --- |
| v0.15 | 2026-08 | Initial draft: split out from RFC 0001 §7.4; payload alignment with MCP `ContentBlock` field boundaries put up for comment (frozen pending community feedback) |

## Related

- Registry entry: [events/messages.dsh-v1alpha1](../registry/events/messages.dsh-v1alpha1.md)
- Lifecycle and the "subscriptions don't activate" semantics: [lifecycle.md](lifecycle.md)
- `before-*` precondition checklist: [RFC 0002](../rfcs/0002-runtime-presentation.md)
