# RFC 0000: Governance

> **Status: Draft v0.15 (community draft — not an official dsh standard)**

| Field | Value |
| --- | --- |
| Number | 0000 |
| Title | Governance |
| Status | Draft |
| Target version | v0.15 |
| Scope | RFC process, review and decision-making, merge permissions, name registration, security disclosure, wording boundaries; it does not govern any technical contract content |
| Depends on | None (this RFC is a prerequisite for every other RFC) |
| Discussion | [omdsh-dev/community](https://github.com/omdsh-dev/community) |

This document answers one question: **who decides this standard, how it changes, and what happens when people disagree.** Governance rules are the source of the standard's legitimacy — anyone who wants to participate in making the standard should read this first; people who only write plugins or hosts may skip it. Following the recommendation in [docs-plan.md](../docs-plan.md) §7, a governance document should not be finalized by one person, so this RFC solicits 2–3 co-authors and joint reviewers.

## One-sentence summary

Defines how an RFC moves from Draft to Final, a minimum 14-day public review period, decision-making by lazy consensus with a maintainer panel as backstop, plus name registration, security disclosure, and the wording boundary that a community standard must not call itself official.

## Background

The standard's first principle is that "the standard's survival does not depend on any decision by dsh upstream" — which requires the community's own decision rules to exist before disputes do. [RFC 0001](0001-core-contract.md) explicitly lists governance as a prerequisite in its base draft (review period, merge permissions, and dispute resolution are among the open questions left by issue #23); the two rounds of disposition records already in `decisions/` are a working sample of the "changes are reviewed before they are registered" rule, but the rule itself was never written down. This RFC writes it down.

## Goals

- Every spec change is traceable: who proposed it, who reviewed it, how objections were handled, and which file it landed in.
- Decision rules exist before disputes, rather than being improvised after one starts.
- Anyone who finishes this document knows: how to propose, how to object, and how to appeal when an objection fails.

## Non-goals

- Does not govern the technical content of plugins / hosts (that belongs to RFC 0001+ and spec/).
- Does not establish a foundation, board, or any other legal or quasi-legal structure.
- Does not require or presume official dsh participation (the request and boundaries for official participation are in [RFC 0001](0001-core-contract.md) §7).

## Design

### 1. RFC state machine

The state machine itself is defined in [template.md](template.md): `Draft → Review → Accepted → Final`, with terminal or replacement states `Deprecated / Superseded / Withdrawn / Rejected`. Entry and exit conditions for each state:

| State | Meaning | Entry condition | Exit condition |
| --- | --- | --- | --- |
| Draft | Being written and early-discussed; may change at any time | Author opens a PR following the template | Requests review → Review; author withdraws → Withdrawn |
| Review | Public review period | Draft content is complete, and at least one maintainer considers it reviewable | Review period ends with no unresolved objections → Accepted; substantive objections → back to Draft; voted down by the panel → Rejected |
| Accepted | Direction settled; awaiting landing evidence | Review passed | Spec text + schema/registry + fixtures + conformance tests all in place → Final; replaced by a newer RFC → Superseded |
| Final | Contract frozen | Landing evidence complete | Deprecated → Deprecated; replaced → Superseded |
| Deprecated | Still usable but not recommended | A Final / Accepted RFC marked by a deprecation RFC | Removal timeline declared by the deprecation RFC |
| Superseded | Replaced by another RFC | The replacing RFC enters Accepted | Terminal |
| Withdrawn | Withdrawn by the author | Author actively withdraws during Draft / Review | Terminal |
| Rejected | Explicitly not adopted after review | Panel votes it down during Review | Terminal (the same topic may be re-proposed under a new number) |

**An Accepted / Final RFC's body is never modified again**; errata and revisions go through a new RFC.

### 2. Review period and decision-making

- **Minimum public review period: 14 days.** An RFC that has been in Review for less than 14 days must not move to Accepted. For high-impact changes (breaking change, namespace occupation, wording boundaries), maintainers should extend the review period and publish the reason.
- **Decision-making: lazy consensus with a maintainer panel as backstop.** If no substantive objection is raised during the review period, the RFC passes; objections are handled one by one (author responds → revise → re-announce); if discussion cannot converge, the maintainer panel rules, and the ruling must publicly state its reasons.
- "Silence = consent" presumes "sufficient visibility": an RFC entering Review must have a dedicated discussion entry in the community forum, reachable from the repository README.

### 3. Objections and appeals

- An objection must be **public, specific, and answerable**: identify which design point, what consequence it causes, and a suggested alternative. Simply expressing dislike does not count as a substantive objection, but it is recorded.
- The author gives a disposition for every substantive objection (adopted / partially adopted / rejected + reason); dispositions are registered in `decisions/`.
- **Appeal**: anyone who disagrees with a panel ruling may appeal publicly within 14 days of its publication; a maintainer who did not participate in the original ruling reviews it once, and the review result is final.

### 4. Merge permissions and maintainers

- **A maintainer = a person with merge rights on this repository.** The current roster awaits community announcement and confirmation (see Open Question 1).
- **Adding**: any maintainer may nominate; the nomination is announced in the community for 14 days and decided by lazy consensus. The nominee must publicly declare their interests (which hosts / plugins / distribution channels they maintain).
- **Leaving**: anyone may step down at any time; someone unresponsive to both reviews and panel calls for 6 consecutive months is removed after a 14-day notice.
- **Duties**: give an "acknowledged" response to each RFC during its review period; participate in panel rulings; observe conflict-of-interest recusal.
- **Composition**: 3–7 people recommended, and they must not all come from the same host product or the same organization.

### 5. Conflict-of-interest recusal

- When reviewing an RFC directly related to oneself (e.g., a host maintainer reviewing conformance rules that affect their own host), one must **declare the interest** in that RFC's discussion.
- After declaring, one may still participate in discussion and take positions, but **does not join the panel backstop ruling** on that topic.
- When the RFC author is a maintainer, they do not exercise panel ruling power over their own RFC.

### 6. Name registration and the officially reserved namespace

- The single authoritative source for capability / event / extension-point coordinates is [registry/](../registry/README.md); nobody may invent "equivalent" names from RFC text or implementation code.
- **Registration flow**: a new coordinate = one RFC (it can be lightweight: coordinate, kind, semantic boundary, owning spec, fixture plan) + a registry entry PR. Entry format and required fields: see [registry/README.md](../registry/README.md).
- The **rules themselves** for the `x-org.*` private namespace and the officially reserved namespace live in [VERSIONING.md](../VERSIONING.md) §5; this section defines only the process: occupying or releasing an officially reserved namespace requires a maintainer panel decision; if the official side already participates in governance, their representative's opinion should also be sought.

### 7. Private disclosure of security issues

- **Channel**: submit a private report to this repository via GitHub Security Advisories (illustrative channel; the repository Security page is authoritative).
- **Process**: a maintainer acknowledges receipt within 7 days; the fix-and-disclosure timeline is negotiated between the reporter and the maintainers, with a default embargo of no more than 90 days; details must not be made public before the fix is released.
- **Scope**: both specification defects (e.g., a constraint that can be bypassed with serious consequences) and reference-implementation vulnerabilities use this channel.

### 8. Wording boundary between "community standard" and "official standard"

- All documents and outward statements of this repository must be labeled "community Draft / community standard, **not an official standard**"; no version may call itself an official standard or imply official endorsement.
- The normative rules for conformance wording ("what passing conformance lets you say and not say") live in [spec/conformance.md](../spec/conformance.md); this section only restates the floor: no "secure plugin", no "official certification".
- Official participation in governance in any capacity does not change the community nature of this standard; whether to adopt it as an official standard is the official side's own decision and is not announced on their behalf by this repository.

### 9. Relationship between reference implementations and the specification (governance landing of Principle 8)

- **The standard is defined only by the quartet: specification text (spec/) + registry/schemas + fixtures + conformance tests.** No implementation — including the fabric reference implementation — is the standard itself.
- When an implementation conflicts with the specification, the specification wins; if an implementation proves the specification wrong, an errata RFC amends the specification — "implementation first, specification ratifies later" is not allowed.
- **An implementation cannot self-certify**: conformance evidence must be re-run or reviewed by a party independent of the implementation's authors. Acceptance requirements: see [spec/conformance.md](../spec/conformance.md).
- License: both the specification text and the reference implementation are MIT (see the `LICENSE` file at the repository root).

### 10. Feedback loop and decisions/

New comments do not silently rewrite a Draft: substantive input from issues / discussions first goes through the review process defined by this RFC and is then registered in `decisions/`; disposition categories and format follow the existing records (see the rules note in the header of [round-1](../decisions/round-1-issue-23.md)).

## Rejected alternatives

1. **BDFL single-person ruling.** One core author has the final word on every dispute. Rejected because: a single decision-maker contradicts the positioning of a "community standard", and the single-point risk is high — the process stalls the moment that person leaves. Conditions for reconsideration: if the community chronically cannot field 3 active maintainers, it should honestly downgrade to personal-project governance and say so publicly, rather than keeping a nominal community process.
2. **No process; commit straight to main.** Like an ordinary open-source project: "merge whatever PR looks fine". Rejected because: a standard's value comes from a predictable change cadence; without a review period and disposition records, the ecosystem cannot tell when it is safe to follow with an implementation. Note: typos, broken links, and other non-substantive edits never needed an RFC; this process applies only to semantic changes to the specification.
3. **Weighted voting by stars / downloads / funding.** Replace consensus with quantifiable metrics. Rejected because: metrics can be gamed, and this pushes the ecosystem toward "the biggest host decides", which betrays the multi-host checks-and-balances design intent. Conditions for reconsideration: if the panel chronically fails to rule and the community grows so large that lazy consensus stops working in practice, this may be re-proposed as a supplementary mechanism.

## Open questions

1. The initial maintainer roster and headcount — must be announced and confirmed in the community before this RFC is finalized.
2. If the official side accepts the participation invitation (see [RFC 0001](0001-core-contract.md) §7.2), how should its governance seat (observer / reviewer / co-maintainer) be arranged?
3. The concrete landing of the security disclosure channel (Security Advisories or a mailing list), and whether the response deadlines need harder commitments.
4. Whether the 14-day review period works in practice — run one retrospective after the first RFC reaches Final.

## Changelog

| Date | Change |
| --- | --- |
| 2026-08-18 | Initial draft (written from the issue #23 / #24 discussions and the mandatory questions in docs-plan §2) |
