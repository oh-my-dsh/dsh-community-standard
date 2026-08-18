# Glossary（术语表）

> **Status: Draft v0.15 (community draft — not an official dsh standard)**

What this document does: translate the jargon that recurs throughout the standard into plain language — the first door for anyone new to this standard. Who should read it: everyone — before opening any spec or RFC, match the words up here first.

How to use it: each entry is 2–3 plain-language sentences; the link at the end is where the **normative definition** lives. This table explains, it does not prescribe. If the body text disagrees with this document, spec/ wins.

## How a plugin is put together（对象模型 / object model）

> **Component（组件）**: the "distribution package" of a plugin — the very package you install, with a `dsh-plugin.json` at its root declaring who it is and what it needs. One package, one component. Normative definition: [spec/facet-model.md](spec/facet-model.md).

> **Facet（分面）**: the "avatars" a plugin stations in different places. The host facet runs on the host side and handles logic, the client facet stays close to the UI and handles presentation, and the worker facet does heavy lifting in the background; a plugin may have only a host facet. v0.15 only defines the full rules for the host facet; client / worker are reserved names. Normative definition: [spec/facet-model.md](spec/facet-model.md).

> **Activation（激活）**: "this one time" the host starts up one of a plugin's facets — everything registered between startup and teardown is booked under this activation, and it is responsible for cleaning up on teardown. The same plugin can be activated many times (e.g. hot reload); each run counts as an independent activation. State machine: [spec/lifecycle.md](spec/lifecycle.md); its place in the object model: [spec/facet-model.md](spec/facet-model.md).

> **Participant（参与者）**: the role that "negotiates terms" with the host on behalf of one activation — "what I need, what you can offer" is negotiated per participant. In v0.15, one activation corresponds to exactly one participant. Normative definition: [spec/facet-model.md](spec/facet-model.md).

> **Host product（宿主产品）**: the concrete product that loads and runs plugins — a GUI, Web UI, TUI, or launcher. It tells the outside world what it supports through a machine-readable self-description file. Normative definition: [spec/host-descriptor.md](spec/host-descriptor.md).

> **Host Descriptor（宿主自述）**: the machine-readable descriptor a host product publishes, stating the API versions it supports, its capability list, execution environment, and trust tier. Whether a plugin can be installed is first checked statically against this file and the manifest. Normative definition: [spec/host-descriptor.md](spec/host-descriptor.md).

## Where code runs and where the UI shows up（架构分层 / architecture layers）

> **Runtime / Presentation / Control / Transport / Invocation**: the five independent dimensions describing "one plugin invocation" — where the code executes, where the UI appears, who has the authority to decide, which path the messages travel, and the invocation itself. They are split into five because they compose freely (code running remotely while the UI renders locally is the norm), and no dimension proves another. Normative definition: [rfcs/0002-runtime-presentation.md](rfcs/0002-runtime-presentation.md).

> **Adapter（适配器）**: the only layer in the whole system allowed to touch dsh upstream's internal interfaces. It translates standard capabilities into implementations a specific dsh version understands; when upstream changes, only it changes, and plugins never notice. Normative definition: [rfcs/0001-core-contract.md](rfcs/0001-core-contract.md) principle ⑤.

> **Broker（能力经纪）**: the host-side "chief steward": validation, negotiation, authorization, and lifecycle scheduling all go through it, and every command and every subscription a plugin registers is attributed by it to a specific activation. Normative definition: [spec/lifecycle.md](spec/lifecycle.md).

> **runtime generation（运行时代际）**: one "convoy departure" of the host — all plugins that passed negotiation are activated together in the same batch. v0.15 has no start-on-first-use lazy activation, only batch activation per generation. Normative definition: [spec/lifecycle.md](spec/lifecycle.md).

## Names and versions（契约 / contracts）

> **capability / contract（能力 / 契约）**: a standardized service that a host declares it can provide and a plugin declares it needs, such as registering commands or local storage. Every contract has a versioned name (a coordinate), and the entry in the registry is the sole authority — no inventing "equivalent" names from document prose. Normative definition: [registry/README.md](registry/README.md).

> **Contract coordinate（契约坐标, `apiVersion + kind`)**: the full name of a contract, in the form `commands.dsh/v1alpha1` + `Command`. The first half manages the version line, the second half says "what kind of thing this is". Version semantics and breaking rules: [VERSIONING.md](VERSIONING.md).

## Trust and verification（信任与验证）

> **trusted-in-process（进程内受信任）**: the only execution tier in v0.15 — the plugin and the host run in the same process, so technically a plugin can bypass the standard interfaces and call system capabilities directly. Capability declarations therefore serve compatibility checks, authorization, and auditing — **they are not a security sandbox**, and hosts must disclose this prominently to users. Normative definition: [rfcs/0001-core-contract.md](rfcs/0001-core-contract.md) principle ④.

> **effect ledger（效果台账）**: the Broker's running account — which activation of which plugin created, bound, replaced, or released which resource, with failed cleanups also recorded. It answers "who did this thing, and was it cleaned up?" Minimal recorded fields: [spec/lifecycle.md](spec/lifecycle.md); full version: [rfcs/0004-provenance-diagnostics.md](rfcs/0004-provenance-diagnostics.md).

> **conformance（一致性）**: a "practice what you preach" verification — the host passes the conformance suites, the plugin passes validation, and both produce multi-host, multi-plugin interoperability evidence. Passing conformance only proves behavior matches the standard text; **it does not mean "secure", and even less "officially certified"**. Normative definition: [spec/conformance.md](spec/conformance.md).
