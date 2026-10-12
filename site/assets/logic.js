// Shared by the browser UI and the Node build script.

export const STATUSES = ["live", "transition", "planned"];

/** Status as of `today` (YYYY-MM-DD): statusOverride wins, otherwise derived from dates. */
export function computeStatus(rule, today) {
  if (rule.statusOverride) return rule.statusOverride;
  if (!rule.validFrom || rule.validFrom > today) return "planned";
  if (rule.transitionUntil && rule.transitionUntil >= today) return "transition";
  return "live";
}

function checkCondition(cond, profile) {
  const value = profile[cond.metric];
  if (value === undefined || value === null || Number.isNaN(value)) return undefined;
  if (cond.min !== undefined && value < cond.min) return false;
  if (cond.max !== undefined && value > cond.max) return false;
  return true;
}

/** Combine tri-state results (true / false / undefined = unknown). */
function combine(results, mode) {
  if (mode === "any") {
    if (results.some((r) => r === true)) return true;
    if (results.some((r) => r === undefined)) return undefined;
    return false;
  }
  if (results.some((r) => r === false)) return false;
  if (results.some((r) => r === undefined)) return undefined;
  return true;
}

/**
 * Rough applicability check for a company profile.
 * profile: { employees?, revenue?, balanceSheet?, profit?, businessModels: string[], activities: string[] }
 * Returns "applies" | "check" | "exempt" | "no".
 * This is a heuristic filter, not a legal assessment.
 */
export function evaluateApplicability(rule, profile) {
  const a = rule.appliesTo || {};
  let unknown = false;

  if (a.businessModels?.length && profile.businessModels.length) {
    if (!a.businessModels.some((m) => profile.businessModels.includes(m))) return "no";
  } else if (a.businessModels?.length) {
    unknown = true;
  }

  if (a.activities?.length) {
    if (!a.activities.some((x) => profile.activities.includes(x))) return "no";
  }

  if (a.thresholds) {
    const r = combine(a.thresholds.conditions.map((c) => checkCondition(c, profile)), a.thresholds.mode);
    if (r === false) return "no";
    if (r === undefined) unknown = true;
  }

  for (const ex of a.exemptions || []) {
    const r = combine(ex.conditions.map((c) => checkCondition(c, profile)), "all");
    if (r === true) return "exempt";
    if (r === undefined) unknown = true;
  }

  return unknown ? "check" : "applies";
}
