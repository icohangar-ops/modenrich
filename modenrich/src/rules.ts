/**
 * Flair Enforcer — Rule management and training.
 *
 * Handles:
 *   - Loading/saving classification config to KV store.
 *   - Training from mod corrections (when mods change auto-assigned flair).
 *   - Managing the trained keyword→flair corpus.
 */

import { Context } from '@devvit/public-api';
import {
  ClassificationConfig,
  ClassificationEvent,
  DEFAULT_CONFIG,
  KV_KEYS,
} from './types.js';
import { tokenise } from './classifier.js';

/**
 * Load the classification config from KV store.
 * Returns defaults if nothing is stored yet.
 */
export async function loadConfig(ctx: Context): Promise<ClassificationConfig> {
  const raw = await ctx.kvStore.get(KV_KEYS.config);
  if (!raw) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
}

/**
 * Save the classification config to KV store.
 */
export async function saveConfig(ctx: Context, config: ClassificationConfig): Promise<void> {
  await ctx.kvStore.put(KV_KEYS.config, JSON.stringify(config));
}

/**
 * Train the classifier from a mod's correction.
 * When a mod overrides an auto-flair, we add the post's key terms
 * as training data pointing to the correct flair.
 *
 * @param ctx       Devvit context.
 * @param title     Post title.
 * @param body      Post body.
 * @param correctFlairId  The flair the mod chose (the correct one).
 */
export async function trainFromCorrection(
  ctx: Context,
  title: string,
  body: string,
  correctFlairId: string,
): Promise<void> {
  const tokens = tokenise(`${title} ${body}`);
  if (tokens.length === 0) return;

  // Load existing trained data for this flair
  const key = KV_KEYS.trainedPrefix + correctFlairId;
  const raw = await ctx.kvStore.get(key);
  const termCounts: Record<string, number> = raw ? JSON.parse(raw) : {};

  // Add tokens (with a count to allow future TF-IDF weighting)
  for (const token of tokens) {
    termCounts[token] = (termCounts[token] || 0) + 1;
  }

  await ctx.kvStore.put(key, JSON.stringify(termCounts));
}

/**
 * Load all trained term data from KV store.
 * Returns a map of term → flairId[] (which flairs each term is associated with).
 */
export async function loadTrainedTerms(
  ctx: Context,
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const entries = await ctx.kvStore.getByPrefix(KV_KEYS.trainedPrefix);

  for (const { key, value } of entries) {
    // Extract flair ID from key (format: "fe:trained:{flairId}")
    const flairId = key.replace(KV_KEYS.trainedPrefix, '');
    const termCounts: Record<string, number> = JSON.parse(value);

    for (const term of Object.keys(termCounts)) {
      const existing = result.get(term) ?? [];
      if (!existing.includes(flairId)) {
        existing.push(flairId);
      }
      result.set(term, existing);
    }
  }

  return result;
}

/**
 * Generate a unique event ID for classification tracking.
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
