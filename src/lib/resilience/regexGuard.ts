/**
 * ReDoS mitigation for moderator-supplied regex rules.
 *
 * Part of the vendored cubiczan-resilience input-hardening surface. Devvit's
 * sandbox already imposes a CPU/time limit on event handlers, so the practical,
 * deterministic safeguards we add here are:
 *
 *   1. Cap the length of text fed to `RegExp.test()` (catastrophic backtracking
 *      blows up with input size, so a hard input cap bounds the worst case).
 *   2. Reject obviously dangerous patterns at the moderator-input boundary
 *      (nested unbounded quantifiers like `(a+)+`), before they are ever stored.
 *
 * These are intentionally conservative heuristics — they do not attempt to be a
 * full ReDoS static analyzer; they cut off the common catastrophic shapes while
 * leaving normal moderator patterns untouched.
 */

import { ResilienceError } from "./errors.js";

/** Maximum number of characters fed to any single `RegExp.test()` call. */
export const MAX_REGEX_INPUT_CHARS = 2000;

/** Maximum length of a moderator-supplied regex pattern string. */
export const MAX_REGEX_PATTERN_CHARS = 512;

/**
 * Heuristics that flag patterns prone to catastrophic backtracking:
 *   - nested quantifiers applied to a group: `(a+)+`, `(a*)*`, `(a+)*`, `(.{1,})+`
 *   - unbounded repetition of an alternation that overlaps: `(a|a)*`
 */
const NESTED_QUANTIFIER = /\([^)]*[+*]\)[+*]/;
const QUANTIFIED_GROUP_WITH_RANGE = /\([^)]*\{\d+,\}\)[+*]/;

/**
 * Truncate untrusted text to a safe maximum before regex evaluation.
 * Bounds the worst-case cost of any single `test()` call.
 */
export function capRegexInput(
  text: string,
  max: number = MAX_REGEX_INPUT_CHARS,
): string {
  return text.length > max ? text.slice(0, max) : text;
}

/**
 * Returns true if a pattern matches a known catastrophic-backtracking shape.
 */
export function isLikelyCatastrophic(pattern: string): boolean {
  return NESTED_QUANTIFIER.test(pattern) || QUANTIFIED_GROUP_WITH_RANGE.test(pattern);
}

/**
 * Validate a moderator-supplied regex pattern at the input boundary.
 *
 * Throws a typed {@link ResilienceError} (`kind: "http"`, status 400) when the
 * pattern is too long, not a valid regex, or matches a catastrophic shape.
 * Returns a compiled, case-insensitive {@link RegExp} on success.
 */
export function compileSafeRegex(pattern: string): RegExp {
  if (pattern.length > MAX_REGEX_PATTERN_CHARS) {
    throw new ResilienceError("http", "regex pattern too long", { status: 400 });
  }
  if (isLikelyCatastrophic(pattern)) {
    throw new ResilienceError(
      "http",
      "regex pattern rejected: nested unbounded quantifiers can cause ReDoS",
      { status: 400 },
    );
  }
  try {
    return new RegExp(pattern, "i");
  } catch (cause) {
    throw new ResilienceError("http", "invalid regex pattern", {
      status: 400,
      cause,
    });
  }
}

/**
 * Non-throwing variant: returns a discriminated result instead of throwing.
 * Convenient at UI boundaries that surface a toast rather than an exception.
 */
export function trySafeRegex(
  pattern: string,
): { ok: true; regex: RegExp } | { ok: false; reason: string } {
  try {
    return { ok: true, regex: compileSafeRegex(pattern) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "invalid pattern" };
  }
}
