/**
 * VENDORED COPY — keep in sync with the canonical package.
 *
 * Vendored from @cubiczan/resilience (icohangar-ops/cubiczan-resilience,
 * typescript/src) at typescript-v0.2.0
 * (commit 37ce1571f5beb751d153ecdc3b1457cd9c871e37).
 * Check the canonical package for updates before modifying locally; this
 * copy's scope and intentional local deltas are recorded in VENDOR_COMMIT.txt
 * beside this file.
 */

/**
 * Vendored subset of cubiczan-resilience (typescript/src).
 *
 * Only the input-hardening primitives that apply to this Devvit app are
 * vendored here. There are no outbound `fetch` calls or HTTP `Request` routes
 * in this app (it talks to Reddit + KV via the Devvit runtime), so `safeFetch`
 * and `requireAuth` from the upstream library are intentionally NOT vendored —
 * they have no call-sites. Moderator privilege is already enforced by Devvit's
 * `forUserType: 'moderator'` on the menu items.
 */

export {
  ResilienceError,
  isResilienceError,
  type ResilienceErrorKind,
  type ResilienceErrorOptions,
} from "./errors.js";

export {
  validateBoundary,
  tryValidateBoundary,
  type SafeParser,
} from "./validate.js";

export {
  capRegexInput,
  compileSafeRegex,
  trySafeRegex,
  isLikelyCatastrophic,
  MAX_REGEX_INPUT_CHARS,
  MAX_REGEX_PATTERN_CHARS,
} from "./regexGuard.js";
