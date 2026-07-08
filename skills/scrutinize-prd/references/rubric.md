# PRD Scrutiny Rubric

Score the PRD on each of the 11 dimensions below, 0-100, using these anchors:

- **0-20 (absent)** — not addressed at all.
- **21-50 (vague)** — mentioned, but too vague or high-level to implement from.
- **51-80 (present with gaps)** — mostly specified, but has holes, edge cases, or ambiguity that would force an implementer to guess.
- **81-100 (complete)** — specified precisely enough that an implementer would not need to ask a clarifying question or make an unstated assumption.

For every dimension, cite the specific evidence (quote or section reference) behind the score. If the dimension is absent, say so explicitly rather than guessing charitably.

| # | id | Weight | What "complete" looks like |
|---|---|---|---|
| 1 | `scopeGoalClarity` | 10 | The problem, the target user, and what "done" means for the project as a whole are stated explicitly. A reader could describe the goal in one sentence without inferring it. |
| 2 | `functionalCompleteness` | 15 | Every user-facing flow is specified end-to-end: inputs, outputs, states, and transitions. No flow is implied by a feature name alone (e.g. "supports login" without specifying the login flow). |
| 3 | `dataModelDefinition` | 10 | If the PRD involves structured or persisted data, every entity, field, type, and relationship is named. (Score N/A as 100 only if the PRD genuinely involves no structured data — otherwise a missing data model when data is clearly implied is a severe gap, see `dataModelRequiredButMissing` below.) |
| 4 | `edgeCaseErrorHandling` | 10 | Failure modes, empty states, invalid input, concurrency/race conditions, and error messaging are addressed — not just the happy path. |
| 5 | `nonFunctionalRequirements` | 8 | Performance, scale, security, accessibility, and reliability requirements are stated with concrete, testable numbers or standards — not adjectives like "fast" or "secure" alone. |
| 6 | `acceptanceCriteria` | 15 | Every functional requirement has at least one criterion that is objectively testable (pass/fail), not a vague quality bar. |
| 7 | `outOfScope` | 7 | The PRD explicitly states what is *not* being built, preventing scope creep or wrong-guess additions. |
| 8 | `technicalConstraints` | 8 | Required stack, versions, existing systems to integrate with, and hard technical constraints are named explicitly. |
| 9 | `ambiguousLanguage` | 7 | Absence of unquantified qualifiers: "fast", "simple", "intuitive", "robust", "handle appropriately", "etc.", "and so on", "TBD" without a plan to resolve it. Each instance found should be logged in `ambiguousPhrases`. |
| 10 | `assumptionsSection` | 5 | The PRD has an explicit assumptions/open-questions section, so anything not yet decided is visible rather than silently implied. |
| 11 | `consistency` | 5 | No section contradicts another (e.g. two different definitions of the same term, conflicting numbers, a flow described one way in one section and differently in another). |

## Required output shape

Produce a JSON object (this is what gets written to the analysis file passed to `scripts/score.js`, plus the extra fields the skill uses for display and the Q&A/rewrite loops):

```json
{
  "dimensionScores": {
    "scopeGoalClarity": 0,
    "functionalCompleteness": 0,
    "dataModelDefinition": 0,
    "edgeCaseErrorHandling": 0,
    "nonFunctionalRequirements": 0,
    "acceptanceCriteria": 0,
    "outOfScope": 0,
    "technicalConstraints": 0,
    "ambiguousLanguage": 0,
    "assumptionsSection": 0,
    "consistency": 0
  },
  "flags": {
    "hasContradictions": false,
    "dataModelRequiredButMissing": false,
    "acceptanceCriteriaMissing": false
  },
  "ambiguousPhraseCount": 0,
  "unconfirmedAssumptionCount": 0,
  "rationale": {
    "scopeGoalClarity": "one or two sentences of evidence-backed reasoning per dimension",
    "...": "..."
  },
  "gaps": [
    {
      "dimension": "acceptanceCriteria",
      "severity": "blocking | major | minor",
      "title": "short title",
      "description": "what's missing and why it matters",
      "suggestedFix": "concrete instruction on what to add",
      "locationHint": "section heading or quoted line, or null"
    }
  ],
  "ambiguousPhrases": [
    { "phrase": "fast", "locationHint": "Performance section", "suggestedReplacement": "responds within 200ms at p95" }
  ],
  "contradictions": [
    { "description": "...", "locationHintA": "...", "locationHintB": "..." }
  ],
  "detectedAssumptions": ["assumption the PRD makes implicitly without stating it"],
  "nextQuestion": {
    "targetGapTitle": "the single highest-leverage unresolved gap's title",
    "question": "one specific, answerable clarifying question",
    "whyThisMatters": "one sentence on what this unblocks"
  },
  "summary": "2-3 sentence plain-language summary of where the PRD stands"
}
```

`nextQuestion` should target whichever unresolved gap most limits the score: prefer `blocking` severity over `major` over `minor`, and prefer higher-weight dimensions when severity ties. Set it to `null` only when there are no unresolved gaps at all.

Set `dimensionScores.acceptanceCriteria < 70` or `flags.acceptanceCriteriaMissing: true` whenever meaningful functional requirements lack a testable criterion — this directly caps the final score regardless of other dimensions (see the scoring gate in `scripts/score.js`).
