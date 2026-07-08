# PRD Scrutinizer

A Claude Code skill that scrutinizes a PRD and iteratively refines it until a **deterministic confidence score** clears 95% — the bar for handing the PRD to an AI coding agent and having it one-shot the implementation without clarifying questions or risky assumptions.

No API keys, no separate app — it runs entirely inside a Claude Code session using Claude's own reasoning for analysis, plus a small dependency-free Node script (`scripts/score.js`) that computes the actual gated score in plain code. That gate is the point: the tool can't claim "95% confident" just because a model felt like saying so — a blocking gap (missing acceptance criteria, contradictions, a missing data model, unconfirmed assumptions) caps the score no matter what the weighted average says.

## What it scores

11 weighted dimensions — scope/goal clarity, functional completeness, data model definition, edge case/error handling, non-functional requirements, acceptance criteria, out-of-scope statements, technical constraints, absence of ambiguous language, an assumptions section, and internal consistency. See `skills/scrutinize-prd/references/rubric.md` for the full rubric and anchors.

## Refinement modes

- **Interactive Q&A** — one targeted clarifying question at a time, each answer merged into the PRD, re-scored after each merge.
- **Batch critique** — a single full report (gaps ranked by severity, ambiguous phrases); you edit the PRD yourself and ask for a re-score.
- **Automated rewrite** — the tool rewrites the full PRD, closing every gap and marking every guess inline as `[ASSUMPTION: ...]`, with a confirm/reject step before the score can clear 95%.

You can switch modes mid-session — the working PRD and score carry over.

## Install

This is a project-level or personal Claude Code skill (a `SKILL.md` + supporting files), not a package to `npm install`.

**Personal (available in every project):**
```bash
mkdir -p ~/.claude/skills
cp -r skills/scrutinize-prd ~/.claude/skills/scrutinize-prd
```

**Project-level (only in a specific repo):**
```bash
mkdir -p /path/to/your-project/.claude/skills
cp -r skills/scrutinize-prd /path/to/your-project/.claude/skills/scrutinize-prd
```

Requires Node.js on PATH (used only for `scripts/score.js`, which has zero npm dependencies).

## Use

In a Claude Code session, invoke it directly by name or just describe the task — e.g. "scrutinize this PRD: `./docs/my-feature-prd.md`" or `/scrutinize-prd docs/my-feature-prd.md`. Claude will walk through analyze → dashboard → refine (in whichever mode you pick) → re-score, looping until confidence hits 95% or you stop.
