# Host Maintainer Guide

> **Status: Draft v0.15 (community draft — not an official dsh standard) | This guide is non-normative; the spec/ documents prevail in case of conflict.**
>
> Who this is for: maintainers of a GUI / Web UI / TUI / launcher who want to make their product a "standards-compliant host". The whole page is one checklist — work through it in order and you're done.

## The compliant-host checklist

- [ ] 1. Publish a Host Descriptor — a machine-readable "here's what I support"
- [ ] 2. Implement negotiation, with human-readable load-rejection messages when a required contract is missing
- [ ] 3. Guarantee lifecycle ordering
- [ ] 4. Wire up the conformance suite and pass the headless scenarios
- [ ] 5. Fulfill the trustMode disclosure obligation

Each item below says what to do, why, and what "done" looks like. Normative details always live in spec/ and are not repeated here.

## 1. Publish a Host Descriptor

The Host Descriptor is the machine-readable self-description your product ships with every release; marketplaces, launchers, and negotiators all consume it. Example (coordinates and URLs illustrative; the Registry's final decision prevails):

```json
{
  "descriptorVersion": "0.15",
  "id": "org.example.dsh-tui",
  "apiVersions": { "host": ["v1alpha1"] },
  "execution": {
    "environment": "node",
    "trustMode": "trusted-in-process"
  },
  "capabilities": [
    { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
    { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
    { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver" }
  ],
  "platforms": ["darwin-arm64", "linux-x64", "win32-x64"]
}
```

There is exactly one hard rule, and it matters most: **only declare exact [registry](../registry/README.md) entries that you actually implement and whose semantics you can maintain.** When an upstream dsh update makes a capability's observation point disappear, take it out of the Descriptor — negotiation will naturally reject or degrade the plugins that depend on it, which is far more honest than "declared, but the semantics quietly changed". Private capabilities go in the explicit `x-org.*` namespace and must not masquerade as standard entries.

Field-by-field definitions: [spec/host-descriptor.md](../spec/host-descriptor.md); schema: [schemas/host-descriptor.schema.json](../../schemas/host-descriptor.schema.json).

## 2. Implement negotiation, with human-readable rejection messages

Negotiation is a pure function: plugin manifest × your Host Descriptor → a verdict plus a machine-readable report (format in [spec/negotiation.md](../spec/negotiation.md) and [schemas/negotiation-report.schema.json](../../schemas/negotiation-report.schema.json)). Three outcomes: **compatible** (activate), **pending authorization** (sensitive scopes wait for the user/policy to say yes), **load rejection** (a required contract is missing).

The rejection path is where user experience is won or lost, and it's an explicit requirement the standard places on hosts: **errors must be human-readable and must list what's missing.**

Failing example:

```text
Error: contract resolution failed: undefined
```

Passing example:

```text
Plugin "Message Memory" (com.example.message-memory) was not loaded:
it requires the host to provide the "message observation (messages.dsh/v1alpha1 MessageObserver)" capability,
which this terminal does not implement yet.
You can: ① upgrade the terminal; ② ask the plugin author to make the capability optional.
```

Two more interaction rules:

- Show incompatible plugins in the marketplace as **visible but disabled**, listing the missing capabilities — hiding them outright makes plugins look like they vanished into thin air across devices/profiles.
- When an optional capability is missing, degrade **deterministically**: the corresponding API simply doesn't exist and the plugin's own fallback branch takes over — you must not silently inject a look-alike substitute.

## 3. Guarantee lifecycle ordering

Two state machines, authoritatively defined in [spec/lifecycle.md](../spec/lifecycle.md):

- The host itself: `starting → ready → stopping → stopped`
- Each plugin activation: `discover → validate → negotiate → authorize → activating → active → deactivating → disposed`

Implementation points:

- **Negotiate and authorize first, execute code second.** discover / validate / negotiate / authorize must all complete before activating begins. Running plugin code before validation and negotiation are done breaks the bottom line of the whole compatibility story.
- **v0.15 is generation-scoped eager activation — no on-demand activation.** Once the host is ready, it assembles one runtime generation and activates every selected plugin; executing a command or matching a subscription must not "wake up" an inactive plugin.
- **Normal shutdown deactivates best-effort; crashes guarantee nothing.** On the normal shutdown path, call each activation's cleanup in a bounded way (with a timeout), but promise nothing for crash scenarios — plugins are required to design cleanup as idempotent.
- **HMR / profile reorganization means repeated activation.** While ready, the same plugin may activate/dispose many times; your Broker attribution and resource reclamation must be tracked per activation instance, not per plugin.
- **Every standard registration is attributed to a specific plugin + activation**, tracked in a minimal effect ledger (create / bind / replace / release / cleanup-failed), with bounded cleanup on dispose. Fields: see [spec/lifecycle.md](../spec/lifecycle.md).

## 4. Wire up the conformance suite

The sentence "I'm standards-compliant" has to be backed by tests, not by a README. Do three things:

1. Run the valid/invalid samples in [conformance/fixtures/](../conformance/fixtures/README.md) through your manifest validation and your negotiator;
2. Run the [conformance/suites/](../conformance/suites/README.md) consistency suite in a headless environment — it covers required/optional negotiation, unknown versions, authorization denial, activation ordering, best-effort shutdown, exceptions thrown from standard callbacks, and more;
3. **Publish the test environment and results**: standard version, host ID/version/platform, suite commit, test time, and results.

Claim boundaries ([spec/conformance.md](../spec/conformance.md)): you may only claim "**this host passes the v0.15 Host conformance suite**" — never "secure host", never "officially certified". Likewise, the five marketplace states (declared compatible / pending authorization / verified by test / incompatible / unknown) must never be silently upgraded into one another: declared compatibility is not a verified test result, and still less a security audit.

## 5. The trustMode disclosure obligation

The reference execution tier in v0.15 is **trusted-in-process**: plugins run **as trusted code** inside your process. Capability declarations serve compatibility checks, authorization, and audit — **they do not constitute a security sandbox**: they can't stop a malicious plugin from directly `import`ing Node APIs, calling `process.exit`, or spinning in an infinite loop.

So the standard places one disclosure obligation on hosts: **state this fact prominently in a user-visible location**, and never describe or imply that trusted-in-process is "isolation", a "sandbox", or "secure execution". Reference wording for an honest disclosure:

> This terminal runs standard plugins in trusted-in-process mode: plugins are trusted code executing in the same process as the terminal. Capability declarations are used for compatibility checks and authorization prompts; they do not constitute a security boundary. Only install plugins from sources you trust.

A future isolated tier (process/realm isolation, controlled IPC, resource limits) must be specified separately and backed by evidence; without that evidence, you may not claim permissions are enforced.

## Case study: dsh-TUI claims the first standards-compliant host

[dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) claimed the first standards-compliant host slot in [community#23, comment 8](https://github.com/omdsh-dev/community/issues/23); its public plan maps onto this checklist item by item:

- **Strict manifest validation**: side-loading is shut off completely — only static declarations are accepted; a missing required capability (e.g. a plugin demanding a graphics capability) is intercepted up front with a prompt instead of crashing silently at runtime; optional capabilities degrade.
- **Public host capability list**: a machine-readable list maintained with every release (explicitly supported `session.*`, `storage.local`, and the TUI-subset capabilities), with private capabilities uniformly prefixed `x-tui.` so marketplaces and launchers can filter them silently.
- **Lifecycle ordering delivered**: the TUI rendering pipeline is already event-driven with differential terminal output, and the first standard lifecycle implementation is underway, guaranteeing trigger order from activation to deactivation.
- **Linked validation and provenance**: records what each plugin registered, depends on, and modified, supporting troubleshooting, cleanup, and rollback; build/layout regression assertions will be wired into the community validation tool dsh-plugin-verify.

In comment 10, T-Auto went further: the TUI is willing to be **one of the first reference hosts**, running the full verification pipeline (static manifest validation → capability negotiation → lifecycle and event ordering → presentation capabilities at concrete call sites), and proposed Remote Runtime attach/detach as a real verification scenario. If your product wants to be an early compliant host too, work through the five-item checklist above, then claim interop evidence in [omdsh-dev/community](https://github.com/omdsh-dev/community) (two hosts × three plugins is the standard evidence bar for v0.15 graduation).

## Related

- [spec/host-descriptor.md](../spec/host-descriptor.md) — authoritative field-by-field Descriptor definition
- [spec/negotiation.md](../spec/negotiation.md) — negotiation rules and load-rejection semantics
- [spec/lifecycle.md](../spec/lifecycle.md) — state machines and the effect ledger
- [spec/conformance.md](../spec/conformance.md) — evidence categories and claim boundaries
- [registry/](../registry/README.md) — the contract entries you may declare
- [Plugin Author Guide](plugin-author.md) — what the other end of your negotiation report looks like
