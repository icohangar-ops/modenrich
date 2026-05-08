/**
 * Flair Enforcer — ML-inspired text classifier.
 *
 * Uses a TF-IDF–inspired scoring approach:
 *   1. Build a corpus of known post→flair mappings from training data + rules.
 *   2. Tokenise incoming post title + body.
 *   3. Score each flair candidate by keyword overlap with weighted terms.
 *   4. Return ranked results with confidence scores.
 *
 * All training data lives in Devvit's KV store so it persists across
 * installs and survives app updates.
 */

import { Devvit } from '@devvit/public-api';
import {
  ClassificationConfig,
  ClassificationResult,
  FlairScore,
  KeywordRule,
  KV_KEYS,
} from './types.js';

/** Stop-words to ignore during tokenisation. */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'because', 'if', 'about', 'it',
  'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we',
  'our', 'you', 'your', 'he', 'she', 'they', 'them', 'what', 'which',
  'who', 'whom', 'im', 'ive', 'dont', 'doesnt', 'cant', 'wont',
  'help', 'please', 'thanks', 'thank', 'question', 'looking',
]);

/**
 * Tokenise text: lowercase, strip punctuation, split on whitespace,
 * filter stop-words and very short tokens.
 */
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\/]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Build a weighted term map from keyword rules.
 * Returns a map of normalised term → { flairId, weight }[].
 */
function buildTermIndex(rules: KeywordRule[]): Map<string, { flairId: string; weight: number }[]> {
  const index = new Map<string, { flairId: string; weight: number }[]>();

  for (const rule of rules) {
    const terms = tokenise(rule.keyword);
    for (const term of terms) {
      const existing = index.get(term) ?? [];
      for (const flairId of rule.flairIds) {
        existing.push({ flairId, weight: rule.weight });
      }
      index.set(term, existing);
    }
  }
  return index;
}

/**
 * Score a single post against all configured keyword rules.
 * Uses weighted term frequency: sum(token_weights) / sqrt(total_tokens).
 */
function scorePost(
  tokens: string[],
  termIndex: Map<string, { flairId: string; weight: number }[]>,
  flairCandidates: Set<string>,
): FlairScore[] {
  const scores = new Map<string, number>();

  for (const token of tokens) {
    const entries = termIndex.get(token);
    if (!entries) continue;

    for (const entry of entries) {
      if (!flairCandidates.has(entry.flairId)) continue;
      const prev = scores.get(entry.flairId) ?? 0;
      scores.set(entry.flairId, prev + entry.weight);
    }
  }

  // Normalise by sqrt of token count (TF-IDF style dampening)
  const norm = Math.sqrt(tokens.length) || 1;
  const results: FlairScore[] = [];
  for (const [flairId, raw] of scores) {
    results.push({ flairId, flairText: '', score: raw / norm });
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Classify a post using the ML-inspired approach.
 *
 * @param title  Post title.
 * @param body   Post body (selftext) — may be empty for link posts.
 * @param config Current classification config.
 * @param trainedTerms Optional trained term→flair mappings from KV store.
 * @returns Ranked classification result.
 */
export function classifyPost(
  title: string,
  body: string,
  config: ClassificationConfig,
  trainedTerms?: Map<string, string[]>,
): ClassificationResult {
  const text = `${title} ${body}`;
  const tokens = tokenise(text);

  if (tokens.length === 0) {
    return {
      flairId: config.defaultFlairId || '',
      flairText: '',
      confidence: 0,
      stage: 'none',
      scores: [],
    };
  }

  // Build term index from both config rules and trained terms
  const rules: KeywordRule[] = [...config.keywords];

  if (trainedTerms && trainedTerms.size > 0) {
    for (const [term, flairIds] of trainedTerms) {
      rules.push({ keyword: term, flairIds, weight: 0.8 });
    }
  }

  const termIndex = buildTermIndex(rules);

  // Gather all known flair IDs
  const flairCandidates = new Set<string>();
  for (const rule of rules) {
    for (const fid of rule.flairIds) flairCandidates.add(fid);
  }

  const scores = scorePost(tokens, termIndex, flairCandidates);

  if (scores.length === 0) {
    return {
      flairId: config.defaultFlairId || '',
      flairText: '',
      confidence: 0,
      stage: config.defaultFlairId ? 'default' : 'none',
      scores: [],
    };
  }

  const top = scores[0];
  // Confidence = top score / (top score + second score), clamped to [0,1]
  let confidence: number;
  if (scores.length >= 2) {
    const second = scores[1].score;
    confidence = second > 0 ? top.score / (top.score + second) : 0.95;
  } else {
    confidence = 0.9; // Only one candidate — high confidence
  }
  confidence = Math.min(1, Math.max(0, confidence));

  return {
    flairId: top.flairId,
    flairText: top.flairText,
    confidence,
    stage: confidence >= config.minConfidence ? 'ml' : 'none',
    scores: scores.slice(0, 5),
  };
}
