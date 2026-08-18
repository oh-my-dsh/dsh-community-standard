# RFC 0000: `<Title>`

> **Status: Draft v0.15 (community draft — not an official dsh standard)**
>
> What this file governs: it is the **writing template** for all RFCs, and it also defines the RFC state machine. Who should read it: anyone who wants to propose a change to the standard.
>
> Usage: copy this file, name it `NNNN-<kebab-title>.md` (`NNNN` is the next available number, four digits, zero-padded), replace all angle-bracket content, and delete this note.

An RFC tells "why, and how the decision was made"; normative details sink into the `spec/` directory — each rule is written in exactly one place (writing discipline #1). An Accepted RFC's body is never modified again; errata go through a new RFC.

## State machine

```text
Draft → Review → Accepted → Final
  │        │         │
  ▼        ▼         ▼
Withdrawn Rejected  Deprecated / Superseded
```

| State | Meaning | Entry condition | Exit condition |
| --- | --- | --- | --- |
| Draft | Draft; anyone may propose one; it does not represent a community position | PR submitted following this template | Enters Review, or Withdrawn by the author |
| Review | Public review in progress; collecting substantive feedback | The author considers it ready for public review and requests it | Passed → Accepted; failed → Rejected or back to Draft |
| Accepted | The community has accepted the direction; implementation and spec writing may proceed against it | No unresolved substantive objections during the review period | Implementation and conformance evidence complete → Final; replaced by a new RFC → Superseded; proven infeasible → Deprecated |
| Final | Finalized, backed by implementation and conformance evidence | The corresponding spec, fixtures, and conformance tests are all in place | Replaced by a new RFC → Superseded; no longer recommended → Deprecated |
| Rejected | Explicitly refused after review | Unresolved substantive objections remain at the end of Review | Terminal; the same idea needs a new number to be re-proposed |
| Withdrawn | Withdrawn by the author | The author withdraws during Draft / Review | Terminal; may be resubmitted under a new number |
| Deprecated | Still usable but no longer recommended | An Accepted / Final RFC is deemed outdated | Usually accompanied by a Superseded pointer to its replacement |
| Superseded | Replaced by a newer RFC | The new RFC is Accepted and declares that it replaces this one | Terminal; the replacement's number must be noted in the metadata |

> Review-period lengths, decision-making, and objection/appeal processes for each state are defined by the [RFC 0000 governance document](0000-governance.md); this table defines only state semantics, and 0000 wins in case of conflict.

## Metadata

| Field | Value |
| --- | --- |
| Number | 0000 |
| Title | `<Title>` |
| Status | Draft (values per the table above; only values from the state machine are allowed) |
| Target version | `<e.g. v0.16>` |
| Scope | `<what this RFC governs and what it does not>` |
| Depends on | `<dependent RFCs / specs / registry entries, as repo-relative paths>` |
| Discussion | `<issue / discussion link>` |

## One-sentence summary

`<Under 50 words, understandable to a layperson: what this proposal does.>`>

## Background

`<What the problem is, why it must be solved now, relevant counterexamples or data.>`>

## Goals

- `<A verifiable goal — one that can answer "how do we know it is done">`>

## Non-goals

- `<Things explicitly not done, to prevent scope creep>`>

## Design

`<The proposal body; explain "why it is decided this way". Normative details (field definitions, "must/should/may" clauses) should sink into spec/; leave only links here.>`>

## Rejected alternatives

`<Three sentences per alternative: what it is, why rejected, under what conditions to reconsider.>`>

## Open questions

- `<Undecided questions that need community feedback>`>

## Changelog

| Date | Change |
| --- | --- |
| YYYY-MM-DD | Initial draft |
