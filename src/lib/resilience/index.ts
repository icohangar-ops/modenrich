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
