/**
 * Flair Enforcer — Fallback classification chain.
 *
 * Classification order:
 *   1. ML classifier (keyword/TF-IDF scoring)
 *   2. Exact keyword match (high-priority rules)
 *   3. Regex pattern match
 *   4. Default flair
 *
 * Each stage only runs if the previous stage produced no result
 * (or confidence below threshold).
 */

import {
  ClassificationConfig,
  ClassificationResult,
  FlairScore,
  RegexRule,
  KV_KEYS,
} from './types.js';
import { classifyPost } from './classifier.js';

/**
 * Stage 2: Exact keyword matching.
 * Checks if any keyword from rules appears in the post text.
 * Returns the first rule match (rules are ordered by priority).
 */
function keywordFallback(
  title: string,
  body: string,
  config: ClassificationConfig,
): ClassificationResult | null {
  const text = `${title} ${body}`.toLowerCase();

  for (const rule of config.keywords) {
    if (text.includes(rule.keyword.toLowerCase()) && rule.flairIds.length > 0) {
      return {
        flairId: rule.flairIds[0],
        flairText: '',
        confidence: 0.95,
        stage: 'keyword',
        scores: rule.flairIds.map(fid => ({
          flairId: fid,
          flairText: '',
          score: fid === rule.flairIds[0] ? 0.95 : 0.5,
        })),
      };
    }
  }

  return null;
}

/**
 * Stage 3: Regex pattern matching.
 * Evaluates all regex rules against title + body.
 * Returns the first match.
 */
function regexFallback(
  title: string,
  body: string,
  config: ClassificationConfig,
): ClassificationResult | null {
  const text = `${title} ${body}`;

  for (const rule of config.regexRules) {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(text)) {
        return {
          flairId: rule.flairId,
          flairText: '',
          confidence: 0.85,
          stage: 'regex',
          scores: [{ flairId: rule.flairId, flairText: '', score: 0.85 }],
        };
      }
    } catch {
      // Invalid regex — skip this rule
    }
  }

  return null;
}

/**
 * Stage 4: Default flair assignment.
 */
function defaultFallback(config: ClassificationConfig): ClassificationResult {
  if (config.defaultFlairId) {
    return {
      flairId: config.defaultFlairId,
      flairText: '',
      confidence: 0.5,
      stage: 'default',
      scores: [{ flairId: config.defaultFlairId, flairText: '', score: 0.5 }],
    };
  }

  return {
    flairId: '',
    flairText: '',
    confidence: 0,
    stage: 'none',
    scores: [],
  };
}

/**
 * Run the full classification chain on a post.
 *
 * @param title  Post title.
 * @param body   Post body / selftext.
 * @param config Classification config from KV store.
 * @param trainedTerms  Trained term→flair mappings from KV store.
 * @returns The best classification result from any stage.
 */
export function classifyWithFallback(
  title: string,
  body: string,
  config: ClassificationConfig,
  trainedTerms?: Map<string, string[]>,
): ClassificationResult {
  // Stage 1: ML classifier
  const mlResult = classifyPost(title, body, config, trainedTerms);

  if (mlResult.flairId && mlResult.confidence >= config.minConfidence && mlResult.stage === 'ml') {
    return mlResult;
  }

  // Stage 2: Keyword exact match
  const kwResult = keywordFallback(title, body, config);
  if (kwResult) return kwResult;

  // Stage 3: Regex patterns
  const rxResult = regexFallback(title, body, config);
  if (rxResult) return rxResult;

  // Stage 4: Default
  if (mlResult.flairId && mlResult.stage !== 'none') {
    return mlResult; // Use ML result even if low confidence
  }

  return defaultFallback(config);
}
