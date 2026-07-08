#!/usr/bin/env node
/**
 * Deterministic scoring gate for scrutinize-prd.
 *
 * Takes a JSON analysis (produced by Claude reading the PRD against
 * references/rubric.md) and computes a gated confidence score in plain code
 * — so the "95% means 95%" guarantee never depends solely on the model's
 * self-reported numbers.
 *
 * Usage: node score.js <path-to-analysis.json>
 * Prints a JSON result to stdout: { rawWeightedScore, finalScore, cappedBy, isConfident }
 */

const fs = require("fs");

const WEIGHTS = {
  scopeGoalClarity: 10,
  functionalCompleteness: 15,
  dataModelDefinition: 10,
  edgeCaseErrorHandling: 10,
  nonFunctionalRequirements: 8,
  acceptanceCriteria: 15,
  outOfScope: 7,
  technicalConstraints: 8,
  ambiguousLanguage: 7,
  assumptionsSection: 5,
  consistency: 5,
};

const DIMENSION_IDS = Object.keys(WEIGHTS);

const GATE_CAPS = {
  CONTRADICTIONS_DETECTED: 59,
  ACCEPTANCE_CRITERIA_WEAK: 84,
  DATA_MODEL_MISSING_BUT_REQUIRED: 84,
  TOO_MANY_AMBIGUOUS_PHRASES: 89,
  UNCONFIRMED_ASSUMPTIONS: 94,
};

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    fail("Usage: node score.js <path-to-analysis.json>");
  }

  let raw;
  try {
    raw = fs.readFileSync(inputPath, "utf8");
  } catch (e) {
    fail(`Could not read ${inputPath}: ${e.message}`);
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    fail(`Invalid JSON in ${inputPath}: ${e.message}`);
  }

  const dimensionScores = input.dimensionScores || {};
  const missing = DIMENSION_IDS.filter(
    (id) => typeof dimensionScores[id] !== "number"
  );
  if (missing.length > 0) {
    fail(`dimensionScores is missing or non-numeric for: ${missing.join(", ")}`);
  }

  for (const id of DIMENSION_IDS) {
    const v = dimensionScores[id];
    if (v < 0 || v > 100) {
      fail(`dimensionScores.${id} = ${v} is out of range 0-100`);
    }
  }

  const flags = input.flags || {};
  const hasContradictions = !!flags.hasContradictions;
  const dataModelRequiredButMissing = !!flags.dataModelRequiredButMissing;
  const acceptanceCriteriaMissing = !!flags.acceptanceCriteriaMissing;
  const ambiguousPhraseCount = Number(input.ambiguousPhraseCount || 0);
  const unconfirmedAssumptionCount = Number(
    input.unconfirmedAssumptionCount || 0
  );

  const weightedScore =
    DIMENSION_IDS.reduce(
      (sum, id) => sum + dimensionScores[id] * WEIGHTS[id],
      0
    ) / 100;

  let cap = 100;
  const cappedBy = [];

  if (hasContradictions) {
    cap = Math.min(cap, GATE_CAPS.CONTRADICTIONS_DETECTED);
    cappedBy.push("contradictions_detected");
  }
  if (acceptanceCriteriaMissing || dimensionScores.acceptanceCriteria < 70) {
    cap = Math.min(cap, GATE_CAPS.ACCEPTANCE_CRITERIA_WEAK);
    cappedBy.push("acceptance_criteria_weak");
  }
  if (dataModelRequiredButMissing) {
    cap = Math.min(cap, GATE_CAPS.DATA_MODEL_MISSING_BUT_REQUIRED);
    cappedBy.push("data_model_missing");
  }
  if (ambiguousPhraseCount > 3) {
    cap = Math.min(cap, GATE_CAPS.TOO_MANY_AMBIGUOUS_PHRASES);
    cappedBy.push("too_many_ambiguous_phrases");
  }
  if (unconfirmedAssumptionCount > 0) {
    cap = Math.min(cap, GATE_CAPS.UNCONFIRMED_ASSUMPTIONS);
    cappedBy.push("unconfirmed_assumptions");
  }

  const finalScore = Math.min(weightedScore, cap);
  const isConfident = finalScore >= 95 && cappedBy.length === 0;

  console.log(
    JSON.stringify(
      {
        rawWeightedScore: Math.round(weightedScore * 10) / 10,
        finalScore: Math.round(finalScore * 10) / 10,
        cappedBy,
        isConfident,
      },
      null,
      2
    )
  );
}

main();
