---
name: scrutinize-prd
description: Scrutinizes and iteratively refines a PRD until a deterministic confidence score clears 95% — the bar for handing the PRD to an AI coding agent and having it one-shot the implementation without clarifying questions or risky assumptions. Use when the user asks to scrutinize, refine, tighten up, stress-test, or check the readiness of a PRD/spec/requirements doc for AI implementation.
---

# Scrutinize PRD

You are running an iterative PRD-tightening loop. The goal is not to "review" the PRD once — it's to keep looping (analyze → refine → re-analyze) until the PRD is genuinely implementable with no guessing, or the user decides to stop.

This skill's own directory contains:
- `references/rubric.md` — the 11-dimension scoring rubric, the anchors, and the exact JSON shape your analysis must produce.
- `scripts/score.js` — a plain Node script with **no dependencies** that computes the actual gated confidence score from your analysis JSON. Run it with plain `node`. **Never compute or state the confidence score yourself** — always get it from this script. This is what keeps "95%" meaning something concrete instead of being whatever number sounds right.

## Step 0 — Get the PRD and pick a mode

Resolve the PRD text: if the user gave a file path, read it. If they pasted text or described it inline, work with that directly (and ask where to save refinements before you start editing, if it's not already a file).

If the user has not already specified a refinement mode, ask which one (or offer to run interactive Q&A by default, since it needs the least setup):

1. **Interactive Q&A** — you ask one targeted question at a time; each answer gets merged into a working draft; re-score after each merge; repeat until confident.
2. **Batch critique** — you produce one full critique report (ranked gaps, ambiguous phrases); the user edits the PRD themselves; they ask you to re-score when ready.
3. **Automated rewrite** — you rewrite the full PRD yourself, closing every gap, marking every guess inline as `[ASSUMPTION: ...]`, plus a list of assumptions to confirm; you re-score after the user confirms/edits assumptions.

The user can switch modes at any point in the loop — the working PRD text and score carry over regardless of which mode produced them.

## Step 1 — Analyze

Read `references/rubric.md` if you haven't already this session. Score the current PRD text against all 11 dimensions, producing the JSON shape documented there. Be a harsh, literal grader — give the AI-implementer's-eye view: "would I have to ask a question or guess here?" If yes, that's a gap, not a nitpick.

Write the analysis JSON to a temp file (e.g. `/tmp/prd-analysis.json`), including `unconfirmedAssumptionCount` set to however many `[ASSUMPTION: ...]` markers are currently unconfirmed in the working PRD (0 outside of automated-rewrite mode, or once the user has confirmed/removed them all).

Run:
```
node <this-skill-dir>/scripts/score.js /tmp/prd-analysis.json
```

That prints `{ rawWeightedScore, finalScore, cappedBy, isConfident }`. This is the authoritative score — report `finalScore` to the user, not your own impression, and if `cappedBy` is non-empty, tell the user explicitly which hard gate is holding the score down (e.g. "capped at 84 because acceptance criteria are missing or weak — the weighted average was actually 91").

## Step 2 — Present the dashboard

Show the user, concisely:
- Overall confidence: `finalScore`% (and note if `isConfident` is true — that's the "ready to hand to an AI" signal)
- Per-dimension scores (a compact table is fine)
- Any `cappedBy` reasons, called out clearly — these are what's actually blocking 95%+
- Gaps ranked by severity (blocking first), each with its suggested fix
- Ambiguous phrases found, with suggested replacements
- Any contradictions found

If `isConfident` is true: say so plainly, offer to save the final PRD, and stop looping unless the user wants to keep going anyway.

## Step 3 — Refine, per mode

**Interactive Q&A:**
- Ask `nextQuestion` from the analysis — just that one question, with `whyThisMatters` as one sentence of context. Wait for the user's answer.
- Merge the answer into the working PRD yourself (edit the file, or produce the updated text if working from pasted text). Tell the user what section changed.
- Go back to Step 1 and re-analyze the updated PRD. Repeat.

**Batch critique:**
- After presenting the dashboard, stop and hand control back to the user: tell them to edit the PRD (themselves, or ask you to make specific edits) and then say "re-score" when ready.
- When asked to re-score, go back to Step 1 on the current state of the PRD file.

**Automated rewrite:**
- Rewrite the *entire* PRD, closing every gap from the analysis. Where you have to make a judgment call the PRD didn't specify, insert `[ASSUMPTION: <the assumption you made>]` inline at the exact point you made it — never silently invent an unstated fact.
- Also produce a short "Assumptions to confirm" list (one line each, referencing the inline markers) and a change log (what changed, per section, and why).
- Show the user a diff-style summary (before → after) for the sections that changed materially, not just the raw rewritten text if it's long.
- Ask the user to confirm, edit, or reject each assumption. Once they respond, update `unconfirmedAssumptionCount` accordingly (it should hit 0 once every assumption is confirmed or resolved) and go back to Step 1 to re-score. Remind them: the score cannot clear 95% while assumptions remain unconfirmed — that's an intentional gate, not a bug.

## Loop until done

Keep looping through Step 1 → Step 2 → Step 3 until either:
- `isConfident` is true, or
- the user explicitly says to stop.

Don't declare victory based on a raw weighted average alone — always defer to `finalScore` and `cappedBy` from the script. If the user seems to be circling without progress (e.g. the same gap keeps failing to resolve), say so directly rather than continuing to loop silently.
