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

This repo is a Claude Code plugin (with a bundled marketplace manifest), so it installs with two slash commands inside any Claude Code session — no `git clone` required:

```
/plugin marketplace add amirbukhari/PRDScrutinizer
/plugin install prd-scrutinizer@prd-scrutinizer
```

Then restart/reload plugins (`/reload-plugins` or restart Claude Code) and the skill is available as `/prd-scrutinizer:scrutinize-prd`.

**Manual alternative** (if you'd rather not use the plugin system, or want to hack on it locally first):
```bash
git clone git@github.com:amirbukhari/PRDScrutinizer.git
mkdir -p ~/.claude/skills
cp -r PRDScrutinizer/skills/scrutinize-prd ~/.claude/skills/scrutinize-prd
```
(or into a specific project's `.claude/skills/` instead, for project-only use)

Requires Node.js on PATH (used only for `scripts/score.js`, which has zero npm dependencies).

## Use

Once installed, invoke it directly — e.g. `/prd-scrutinizer:scrutinize-prd docs/my-feature-prd.md` (plugin install) or `/scrutinize-prd docs/my-feature-prd.md` (manual skill install) — or just describe the task, e.g. "scrutinize this PRD: `./docs/my-feature-prd.md`". Claude will walk through analyze → dashboard → refine (in whichever mode you pick) → re-score, looping until confidence hits 95% or you stop.
